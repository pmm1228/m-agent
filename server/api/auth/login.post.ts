import { setSessionCookie } from '../../utils/auth'
import { verifyPassword } from '../../utils/password'
import { findUserByUsername } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string, password?: string }>(event)
  const username = body?.username?.trim()
  const password = body?.password ?? ''

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      statusMessage: '请输入用户名和密码'
    })
  }

  const user = findUserByUsername(username)
  if (!user || !verifyPassword(password, user.password)) {
    throw createError({
      statusCode: 401,
      statusMessage: '用户名或密码错误'
    })
  }

  setSessionCookie(event, user.id)

  return {
    user: {
      id: user.id,
      username: user.username,
      created_at: user.created_at
    }
  }
})
