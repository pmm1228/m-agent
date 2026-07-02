// https://nuxt.com/docs/api/configuration/nuxt-config
const isProduction = process.env.NODE_ENV === 'production'

export default defineNuxtConfig({
  css: ['~/assets/css/global.css', '~/assets/css/workspace.css'],
  runtimeConfig: {
    sessionSecret: process.env.NUXT_SESSION_SECRET || (isProduction ? '' : 'magent-dev-secret'),
    aiProvider: process.env.NUXT_AI_PROVIDER || 'doubao',
    zhipuApiKey: process.env.NUXT_ZHIPU_API_KEY || '',
    zhipuModel: process.env.NUXT_ZHIPU_MODEL || 'glm-4-flash',
    doubaoApiKey: process.env.NUXT_DOUBAO_API_KEY || '',
    doubaoModel: process.env.NUXT_DOUBAO_MODEL || '',
    doubaoBaseUrl: process.env.NUXT_DOUBAO_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    doubaoResponsesUrl: process.env.NUXT_DOUBAO_RESPONSES_URL || 'https://ark.cn-beijing.volces.com/api/v3/responses',
    doubaoWebSearch: process.env.NUXT_DOUBAO_WEB_SEARCH === 'true'
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
