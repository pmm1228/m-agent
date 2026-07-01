import { getHeader, type H3Event } from 'h3'

const MAX_FAILURES = 5
const WINDOW_MS = 10 * 60 * 1000
const LOCK_MS = 5 * 60 * 1000

interface LoginAttempt {
  count: number
  firstFailureAt: number
  lockedUntil: number
}

const attempts = new Map<string, LoginAttempt>()

function getClientIp(event: H3Event) {
  const forwarded = getHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || event.node.req.socket.remoteAddress || 'unknown'
}

function getLoginKey(event: H3Event, username: string) {
  return `${getClientIp(event)}:${username.toLowerCase()}`
}

function pruneAttempts(now: number) {
  for (const [key, attempt] of attempts) {
    const expiredWindow = now - attempt.firstFailureAt > WINDOW_MS
    const expiredLock = attempt.lockedUntil > 0 && now > attempt.lockedUntil
    if (expiredWindow && (attempt.lockedUntil === 0 || expiredLock)) {
      attempts.delete(key)
    }
  }
}

export function assertLoginAllowed(event: H3Event, username: string) {
  const now = Date.now()
  pruneAttempts(now)

  const attempt = attempts.get(getLoginKey(event, username))
  if (!attempt || attempt.lockedUntil <= now) {
    return
  }

  const seconds = Math.ceil((attempt.lockedUntil - now) / 1000)
  throw createError({
    statusCode: 429,
    statusMessage: `登录失败次数过多，请 ${seconds} 秒后再试`
  })
}

export function recordLoginFailure(event: H3Event, username: string) {
  const now = Date.now()
  const key = getLoginKey(event, username)
  const current = attempts.get(key)

  if (!current || now - current.firstFailureAt > WINDOW_MS) {
    attempts.set(key, {
      count: 1,
      firstFailureAt: now,
      lockedUntil: 0
    })
    return
  }

  current.count += 1
  if (current.count >= MAX_FAILURES) {
    current.lockedUntil = now + LOCK_MS
  }
}

export function clearLoginFailures(event: H3Event, username: string) {
  attempts.delete(getLoginKey(event, username))
}
