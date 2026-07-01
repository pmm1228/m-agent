import { deleteTodoForUser } from '../../utils/todos'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '无效的待办 ID'
    })
  }

  const deleted = deleteTodoForUser(user.id, id)
  if (!deleted) {
    throw createError({
      statusCode: 404,
      statusMessage: '待办不存在'
    })
  }

  return { ok: true }
})
