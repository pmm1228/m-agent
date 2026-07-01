// https://nuxt.com/docs/api/configuration/nuxt-config
const isProduction = process.env.NODE_ENV === 'production'

export default defineNuxtConfig({
  css: ['~/assets/css/global.css', '~/assets/css/workspace.css'],
  runtimeConfig: {
    sessionSecret: process.env.NUXT_SESSION_SECRET || (isProduction ? '' : 'magent-dev-secret'),
    zhipuApiKey: process.env.NUXT_ZHIPU_API_KEY || '',
    zhipuModel: process.env.NUXT_ZHIPU_MODEL || 'glm-4-flash'
  },
  modules: ['@element-plus/nuxt'],
  app: {
    pageTransition: false,
    layoutTransition: false
  },
  elementPlus: {
    defaultLocale: 'zh-cn'
  },
  devServer: {
    host: '0.0.0.0',
    port: 3001
  },
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true }
})
