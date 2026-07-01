import {
  addChatExchange,
  buildModelHistory,
  getConversationForUser,
  shouldAutoRenameTitle
} from '../../utils/chat'
import {
  createTodoForUser,
  formatTodosForPrompt,
  tryParseTodoCommand
} from '../../utils/todos'
import { chatWithZhipu } from '../../utils/zhipu'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const config = useRuntimeConfig(event)

  const body = await readBody<{ message?: string, conversationId?: number }>(event)
  const message = body?.message?.trim()
  const conversationId = body?.conversationId

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: '消息不能为空'
    })
  }

  if (!conversationId) {
    throw createError({
      statusCode: 400,
      statusMessage: '缺少 conversationId'
    })
  }

  const conversation = getConversationForUser(user.id, conversationId)
  if (!conversation) {
    throw createError({
      statusCode: 404,
      statusMessage: '对话不存在'
    })
  }

  let title = conversation.title
  if (shouldAutoRenameTitle(conversation.title)) {
    title = message.slice(0, 18) + (message.length > 18 ? '…' : '')
  }

  let reply: string
  let todoCreated: { id: number, title: string } | undefined
  const todoCommand = tryParseTodoCommand(message)

  if (todoCommand?.action === 'create') {
    const todo = createTodoForUser(user.id, todoCommand.title)
    todoCreated = { id: todo.id, title: todo.title }
    reply = `已添加待办「${todo.title}」。你可以在左侧「待办」页面查看和管理。`
  } else {
    if (!config.zhipuApiKey) {
      throw createError({
        statusCode: 503,
        statusMessage: '未配置智谱 AI API Key，请在 .env 中设置 NUXT_ZHIPU_API_KEY'
      })
    }
    const history = buildModelHistory([
      ...conversation.messages.map(item => ({
        role: item.role as 'user' | 'assistant',
        content: item.content
      })),
      { role: 'user' as const, content: message }
    ])

    reply = await chatWithZhipu({
      apiKey: config.zhipuApiKey,
      model: config.zhipuModel,
      messages: history,
      extraSystemContext: formatTodosForPrompt(user.id)
    })
  }

  const { userMessage, assistantMessage } = addChatExchange({
    conversationId,
    userContent: message,
    assistantContent: reply,
    title: title === conversation.title ? undefined : title
  })

  return {
    title,
    todoCreated,
    userMessage: {
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      time: userMessage.created_at
    },
    assistantMessage: {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      time: assistantMessage.created_at
    }
  }
})
