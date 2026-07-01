import { deleteConversationForUser } from '../../utils/chat'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '无效的对话 ID'
    })
  }

  const deleted = deleteConversationForUser(user.id, id)
  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: '对话不存在'
    })
  }

  return { ok: true }
})
