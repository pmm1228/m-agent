import {
  addChatExchange,
  buildModelHistory,
  getCompletedMessagesForModel,
  getConversationForUser,
  shouldAutoRenameTitle
} from '../../utils/chat'
import {
  createTodoForUser,
  formatTodosForPrompt,
  tryParseTodoCommand
} from '../../utils/todos'
import { streamChatWithAi } from '../../utils/ai'
import { assertMaxLength, MAX_CHAT_MESSAGE_LENGTH, MAX_TODO_TITLE_LENGTH } from '../../utils/limits'

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

  const body = await readBody<{ message?: string, conversationId?: number }>(event)
  const message = body?.message?.trim()
  const conversationId = body?.conversationId

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: '消息不能为空'
    })
  }
  assertMaxLength(message, MAX_CHAT_MESSAGE_LENGTH, '消息')

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

  let title = conversation.title
  if (shouldAutoRenameTitle(conversation.title)) {
    title = message.slice(0, 18) + (message.length > 18 ? '…' : '')
  }

  let reply = ''
  let assistantStatus: 'completed' | 'failed' = 'completed'
  let assistantError: string | null = null
  let todoCreated: { id: number, title: string } | undefined
  const todoCommand = tryParseTodoCommand(message)

  if (todoCommand?.action === 'create') {
    assertMaxLength(todoCommand.title, MAX_TODO_TITLE_LENGTH, '待办标题')
    const todo = createTodoForUser(user.id, todoCommand.title)
    todoCreated = { id: todo.id, title: todo.title }
    reply = `已添加待办「${todo.title}」。你可以在左侧「待办」页面查看和管理。`
    send('delta', { content: reply })
  } else {
    try {
      const modelMessages = getCompletedMessagesForModel(conversationId)
      const history = buildModelHistory([
        ...modelMessages.map(item => ({
          role: item.role as 'user' | 'assistant',
          content: item.content
        })),
        { role: 'user' as const, content: message }
      ])

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
      reply = ''
      assistantStatus = 'failed'
      assistantError = getErrorMessage(error, 'AI 回复失败，请稍后重试')
    }
  }

  const { userMessage, assistantMessage } = addChatExchange({
    conversationId,
    userContent: message,
    assistantContent: reply,
    assistantStatus,
    assistantError,
    title: title === conversation.title ? undefined : title
  })

  send('result', {
    title,
    todoCreated,
    failed: assistantStatus === 'failed',
    userMessage: formatMessage(userMessage),
    assistantMessage: formatMessage(assistantMessage)
  })

  if (!closed) {
    event.node.res.end()
  }
})
