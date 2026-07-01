import {
  buildModelHistory,
  getCompletedMessagesForModel,
  getFailedAssistantMessageForUser,
  getPreviousUserMessage,
  updateAssistantMessageResult
} from '../../../utils/chat'
import { formatTodosForPrompt } from '../../../utils/todos'
import { chatWithZhipu } from '../../../utils/zhipu'

function getErrorMessage(error: unknown, fallback: string) {
  const fetchError = error as {
    data?: { statusMessage?: string, message?: string }
    statusMessage?: string
    message?: string
  }

  return fetchError.data?.statusMessage
    || fetchError.data?.message
    || fetchError.statusMessage
    || fetchError.message
    || fallback
}

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const config = useRuntimeConfig(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '无效的消息 ID'
    })
  }

  const failedMessage = getFailedAssistantMessageForUser(user.id, id)
  if (!failedMessage) {
    throw createError({
      statusCode: 404,
      statusMessage: '可重试的失败消息不存在'
    })
  }

  const previousUser = getPreviousUserMessage(failedMessage.conversation_id, failedMessage.id)
  if (!previousUser) {
    throw createError({
      statusCode: 400,
      statusMessage: '找不到用于重试的用户消息'
    })
  }

  let reply = ''
  let status: 'completed' | 'failed' = 'completed'
  let errorMessage: string | null = null

  try {
    if (!config.zhipuApiKey) {
      throw createError({
        statusCode: 503,
        statusMessage: '未配置智谱 AI API Key，请在 .env 中设置 NUXT_ZHIPU_API_KEY'
      })
    }

    const history = buildModelHistory(
      getCompletedMessagesForModel(failedMessage.conversation_id, failedMessage.id)
        .map(message => ({
          role: message.role,
          content: message.content
        }))
    )

    reply = await chatWithZhipu({
      apiKey: config.zhipuApiKey,
      model: config.zhipuModel,
      messages: history,
      extraSystemContext: formatTodosForPrompt(user.id)
    })
  } catch (error: unknown) {
    status = 'failed'
    errorMessage = getErrorMessage(error, 'AI 回复失败，请稍后重试')
  }

  const assistantMessage = updateAssistantMessageResult({
    messageId: failedMessage.id,
    conversationId: failedMessage.conversation_id,
    content: reply,
    status,
    error: errorMessage
  })

  return {
    failed: status === 'failed',
    assistantMessage: {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      status: assistantMessage.status,
      error: assistantMessage.error,
      time: assistantMessage.created_at
    }
  }
})
