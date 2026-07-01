import { createHmac } from 'node:crypto'
import type { H3Event } from 'h3'
import type { User } from './db'

const SESSION_COOKIE = 'session'
const SESSION_MAX_AGE = 60 * 60 * 24 * 7

function signSession(userId: number, secret: string) {
  const issuedAt = Date.now().toString()
  const payload = `${userId}.${issuedAt}`
  const signature = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${signature}`
}

function getSessionSecret(event: H3Event) {
  const config = useRuntimeConfig(event)
  const secret = config.sessionSecret

  if (!secret) {
    throw createError({
      statusCode: 500,
      statusMessage: '未配置会话密钥，请设置 NUXT_SESSION_SECRET'
    })
  }

  return secret
}

export function parseSession(token: string, secret: string) {
  const [userId, issuedAt, signature] = token.split('.')
  if (!userId || !issuedAt || !signature) {
    return null
  }

  const payload = `${userId}.${issuedAt}`
  const expected = createHmac('sha256', secret).update(payload).digest('hex')
  if (signature !== expected) {
    return null
  }

  const age = Date.now() - Number(issuedAt)
  if (Number.isNaN(age) || age > SESSION_MAX_AGE * 1000) {
    return null
  }

  return { userId: Number(userId) }
}

export function setSessionCookie(event: H3Event, userId: number) {
  const token = signSession(userId, getSessionSecret(event))

  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE,
    path: '/'
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

export function getSessionUserId(event: H3Event) {
  const token = getCookie(event, SESSION_COOKIE)
  if (!token) {
    return null
  }

  const session = parseSession(token, getSessionSecret(event))
  return session?.userId ?? null
}

export function getCurrentUser(event: H3Event): User | null {
  const userId = getSessionUserId(event)
  if (!userId) {
    return null
  }

  return findUserById(userId)
}

export function requireUser(event: H3Event): User {
  const user = getCurrentUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: '请先登录'
    })
  }

  return user
}
