import { getCurrentUser } from '../../utils/auth'

export default defineEventHandler((event) => {
  const user = getCurrentUser(event)
  return { user: user ?? null }
})
