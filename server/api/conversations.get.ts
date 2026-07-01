import { createConversation, listConversationSummaries } from '../utils/chat'

function serializeLastMessage(conversation: ReturnType<typeof listConversationSummaries>[number]) {
  if (!conversation.last_message_id || !conversation.last_message_role || !conversation.last_message_created_at) {
    return null
  }

  return {
    id: conversation.last_message_id,
    role: conversation.last_message_role,
    content: conversation.last_message_content ?? '',
    status: conversation.last_message_status ?? 'completed',
    error: conversation.last_message_error,
    time: conversation.last_message_created_at
  }
}

export default defineEventHandler((event) => {
  const user = requireUser(event)
  let conversations = listConversationSummaries(user.id)

  if (conversations.length === 0) {
    createConversation(user.id, '默认对话')
    conversations = listConversationSummaries(user.id)
  }

  return {
    data: conversations.map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updated_at,
      messageCount: conversation.message_count,
      lastMessage: serializeLastMessage(conversation)
    }))
  }
})
