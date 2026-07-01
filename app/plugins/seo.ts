export default defineNuxtPlugin(() => {
  useHead({
    title: 'mAgent',
    titleTemplate: '%s · mAgent',
    htmlAttrs: {
      lang: 'zh-CN'
    },
    charset: 'utf-8',
    viewport: 'width=device-width, initial-scale=1',
    meta: [
      { name: 'description', content: 'mAgent — 基于 Nuxt 4 的 AI 对话与待办助手' },
      { name: 'keywords', content: 'mAgent, Nuxt, AI, 待办' },
      { name: 'author', content: 'mAgent' },
      { name: 'theme-color', content: '#007aff' }
    ],
    link: [
      { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }
    ]
  })
})
