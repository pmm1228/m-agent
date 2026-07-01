import { getConversationForUser } from '../../utils/chat'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '无效的对话 ID'
    })
  }

  const conversation = getConversationForUser(user.id, id)
  if (!conversation) {
    throw createError({
      statusCode: 404,
      statusMessage: '对话不存在'
    })
  }

  return {
    data: {
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updated_at,
      messageCount: conversation.messages.length,
      lastMessage: conversation.messages.at(-1)
        ? {
            id: conversation.messages.at(-1)!.id,
            role: conversation.messages.at(-1)!.role,
            content: conversation.messages.at(-1)!.content,
            status: conversation.messages.at(-1)!.status,
            error: conversation.messages.at(-1)!.error,
            time: conversation.messages.at(-1)!.created_at
          }
        : null,
      messages: conversation.messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        status: message.status,
        error: message.error,
        time: message.created_at
      }))
    }
  }
})
