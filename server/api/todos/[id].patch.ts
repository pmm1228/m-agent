import { updateTodoForUser } from '../../utils/todos'

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
