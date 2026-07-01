import { updateTodoForUser } from '../../utils/todos'
import { assertMaxLength, MAX_TODO_TITLE_LENGTH } from '../../utils/limits'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const id = Number(getRouterParam(event, 'id'))

  if (!Number.isInteger(id) || id <= 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '无效的待办 ID'
    })
  }

  const body = await readBody<{ title?: string, done?: boolean }>(event)
  if (body?.title !== undefined) {
    assertMaxLength(body.title.trim(), MAX_TODO_TITLE_LENGTH, '待办标题')
  }

  const todo = updateTodoForUser(user.id, id, {
    title: body?.title,
    done: body?.done
  })

  if (!todo) {
    throw createError({
      statusCode: 404,
      statusMessage: '待办不存在'
    })
  }

  return {
    data: {
      id: todo.id,
      title: todo.title,
      done: Boolean(todo.done),
      time: todo.created_at
    }
  }
})
