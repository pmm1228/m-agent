import { createConversation } from '../utils/chat'
import { assertMaxLength, MAX_CONVERSATION_TITLE_LENGTH } from '../utils/limits'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const body = await readBody<{ title?: string }>(event)
  const title = body?.title?.trim() || '新对话'
  assertMaxLength(title, MAX_CONVERSATION_TITLE_LENGTH, '对话标题')

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
        status: message.status,
        error: message.error,
        time: message.created_at
      })),
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
        : null
    }
  }
})
