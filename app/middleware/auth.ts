export default defineNuxtRouteMiddleware(async () => {
  const { data } = await useFetch('/api/auth/me', { key: 'auth-me' })

  if (!data.value?.user) {
    return navigateTo('/login')
  }
})
