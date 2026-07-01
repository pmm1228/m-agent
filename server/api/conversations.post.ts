import { createConversation } from '../utils/chat'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const body = await readBody<{ title?: string }>(event)
  const title = body?.title?.trim() || '新对话'

  const conversation = createConversation(user.id, title)

  return {
    data: {
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updated_at,
      messages: conversation.messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        time: message.created_at
      }))
    }
  }
})
