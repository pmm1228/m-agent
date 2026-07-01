import { createTodoForUser } from '../utils/todos'
import { assertMaxLength, MAX_TODO_TITLE_LENGTH } from '../utils/limits'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const body = await readBody<{ title?: string }>(event)
  const title = body?.title?.trim()

  if (!title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'title 不能为空'
    })
  }
  assertMaxLength(title, MAX_TODO_TITLE_LENGTH, '待办标题')

  const todo = createTodoForUser(user.id, title)

  return {
    data: {
      id: todo.id,
      title: todo.title,
      done: Boolean(todo.done),
      time: todo.created_at
    }
  }
})
