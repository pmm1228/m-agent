export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    // 仅在首页注入，方便观察效果
    if (event.path === '/') {
      html.head.push('<meta name="description" content="这是通过 Nitro render:html 注入的描述" />')
      html.bodyAppend.push('<script>console.log("Nitro render:html 已生效")</script>')
    }
  })
})
