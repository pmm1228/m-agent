# Mac UI CSS — 示例

## 完整登录页结构

与 Nuxt/Vue 项目常见模式一致：页面根定义变量，居中毛玻璃卡片，表单 + 主按钮。

```vue
<template>
  <div class="login-page">
    <div class="bg-glow bg-glow--left" />
    <div class="bg-glow bg-glow--right" />

    <main class="login-shell">
      <div class="app-icon" aria-hidden="true"><span>N</span></div>
      <header class="hero"><h1>登录你的账户</h1></header>

      <form class="login-form" @submit.prevent="onSubmit">
        <label class="field" :class="{ 'field--focused': focused }">
          <span class="field__label">账户</span>
          <input v-model="username" type="text" placeholder="用户名"
            @focus="focused = true" @blur="focused = false">
        </label>
        <button class="submit-btn" type="submit" :disabled="loading">
          {{ loading ? '正在登录…' : '登录' }}
        </button>
      </form>
    </main>
  </div>
</template>

<style scoped>
.login-page {
  --apple-bg: #f5f5f7;
  --apple-text: #1d1d1f;
  --apple-secondary: #6e6e73;
  --apple-tertiary: #86868b;
  --apple-blue: #0071e3;
  --apple-blue-hover: #0077ed;
  --apple-border: rgba(0, 0, 0, 0.08);
  --apple-surface: rgba(255, 255, 255, 0.72);
  --apple-shadow: 0 24px 80px rgba(0, 0, 0, 0.08);

  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  background: var(--apple-bg);
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
  color: var(--apple-text);
  -webkit-font-smoothing: antialiased;
}

.bg-glow {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
}
.bg-glow--left { top: -120px; left: -80px; background: rgba(0, 113, 227, 0.18); }
.bg-glow--right { right: -100px; bottom: -120px; background: rgba(175, 82, 222, 0.14); }

.login-shell {
  position: relative;
  width: min(100%, 420px);
  padding: 40px 36px 32px;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.65);
  background: var(--apple-surface);
  box-shadow: var(--apple-shadow);
  backdrop-filter: blur(24px) saturate(180%);
}

.field {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--apple-border);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.field--focused {
  border-color: rgba(0, 113, 227, 0.45);
  box-shadow: 0 0 0 4px rgba(0, 113, 227, 0.12);
}
.field__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--apple-tertiary);
  text-transform: uppercase;
}
.field input {
  border: 0;
  outline: none;
  background: transparent;
  font-size: 17px;
}
.submit-btn {
  height: 50px;
  width: 100%;
  border: 0;
  border-radius: 14px;
  background: var(--apple-blue);
  color: #fff;
  font-size: 17px;
  font-weight: 600;
}
.submit-btn:hover:not(:disabled) { background: var(--apple-blue-hover); }
.submit-btn:active:not(:disabled) { transform: scale(0.985); }
</style>
```

## 设置页列表

```html
<section class="settings-group">
  <h2 class="settings-group__title">账户</h2>
  <div class="settings-panel">
    <div class="list-row">
      <span>姓名</span>
      <span class="list-row__value">张三</span>
    </div>
    <div class="list-row">
      <span>电子邮件</span>
      <span class="list-row__value">user@example.com</span>
    </div>
  </div>
</section>
```

```css
.settings-group__title {
  margin: 0 0 8px 16px;
  font-size: 13px;
  font-weight: 600;
  color: var(--apple-secondary);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}
.settings-panel {
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.88);
  border: 1px solid var(--apple-border);
  overflow: hidden;
}
.list-row__value {
  color: var(--apple-secondary);
  font-size: 15px;
}
```

## 全局 CSS 变量文件（可选）

```css
/* assets/css/apple-tokens.css */
:root {
  --apple-bg: #f5f5f7;
  --apple-text: #1d1d1f;
  /* ... 其余见 SKILL.md */
}

@media (prefers-color-scheme: dark) {
  :root {
    --apple-bg: #1d1d1f;
    --apple-text: #f5f5f7;
    /* ... 见 reference.md */
  }
}
```

在 Nuxt `nuxt.config` 或 `app.vue` 中全局引入一次即可。
