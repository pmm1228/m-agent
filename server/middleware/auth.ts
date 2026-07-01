import { getCurrentUser } from '../utils/auth'

export default defineEventHandler((event) => {
  if (!event.path.startsWith('/api/todos')) {
    return
  }

  const user = getCurrentUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '请先登录'
    })
  }

  event.context.user = user
})
