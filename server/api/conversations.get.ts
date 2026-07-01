import { createConversation, listConversationsWithMessages } from '../utils/chat'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  let conversations = listConversationsWithMessages(user.id)

  if (conversations.length === 0) {
    createConversation(user.id, '默认对话')
    conversations = listConversationsWithMessages(user.id)
  }

  return {
    data: conversations.map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updated_at,
      messages: conversation.messages.map(message => ({
        id: message.id,
        role: message.role,
        content: message.content,
        time: message.created_at
      }))
    }))
  }
})
