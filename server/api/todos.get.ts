import { listTodosForUser } from '../utils/todos'

export default defineEventHandler((event) => {
  const user = requireUser(event)

  return {
    data: listTodosForUser(user.id).map(todo => ({
      id: todo.id,
      title: todo.title,
      done: Boolean(todo.done),
      time: todo.created_at
    }))
  }
})
