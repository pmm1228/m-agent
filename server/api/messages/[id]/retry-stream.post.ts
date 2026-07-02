import {
  buildModelHistory,
  getCompletedMessagesForModel,
  getFailedAssistantMessageForUser,
  getPreviousUserMessage,
  updateAssistantMessageResult
} from '../../../utils/chat'
import { formatTodosForPrompt } from '../../../utils/todos'
import { streamChatWithAi } from '../../../utils/ai'

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

function formatMessage(message: {
  id: number
  role: 'user' | 'assistant'
  content: string
  status: 'pending' | 'completed' | 'failed'
  error: string | null
  created_at: string
}) {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    status: message.status,
    error: message.error,
    time: message.created_at
  }
}

function writeSse(event: NodeJS.WritableStream & { flush?: () => void }, type: string, payload: unknown) {
  event.write(`event: ${type}\n`)
  event.write(`data: ${JSON.stringify(payload)}\n\n`)
  event.flush?.()
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

  event.node.res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  })
  event.node.res.flushHeaders?.()

  let closed = false
  event.node.req.on('close', () => {
    closed = true
  })
  const send = (type: string, payload: unknown) => {
    if (!closed) {
      writeSse(event.node.res, type, payload)
    }
  }

  let reply = ''
  let status: 'completed' | 'failed' = 'completed'
  let errorMessage: string | null = null

  try {
    const history = buildModelHistory(
      getCompletedMessagesForModel(failedMessage.conversation_id, failedMessage.id)
        .map(message => ({
          role: message.role,
          content: message.content
        }))
    )

    reply = await streamChatWithAi({
      provider: config.aiProvider,
      zhipuApiKey: config.zhipuApiKey,
      zhipuModel: config.zhipuModel,
      doubaoApiKey: config.doubaoApiKey,
      doubaoModel: config.doubaoModel,
      doubaoBaseUrl: config.doubaoBaseUrl,
      doubaoResponsesUrl: config.doubaoResponsesUrl,
      doubaoWebSearch: config.doubaoWebSearch,
      messages: history,
      extraSystemContext: formatTodosForPrompt(user.id),
      onDelta: (delta) => {
        send('delta', { content: delta })
      }
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

  send('result', {
    failed: status === 'failed',
    assistantMessage: formatMessage(assistantMessage)
  })

  if (!closed) {
    event.node.res.end()
  }
})
