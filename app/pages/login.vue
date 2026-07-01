<script setup lang="ts">
definePageMeta({
  layout: false
})

useHead({
  title: '登录'
})

const form = reactive({
  username: 'admin',
  password: '123456'
})
const loading = ref(false)
const showPassword = ref(false)
const focusedField = ref<'username' | 'password' | null>(null)

const { data: authData } = await useFetch('/api/auth/me', { key: 'auth-me' })
if (authData.value?.user) {
  await navigateTo('/')
}

async function handleLogin() {
  if (!form.username.trim() || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        username: form.username,
        password: form.password
      }
    })
    await refreshNuxtData(['auth-me', 'conversations'])
    ElMessage.success('登录成功')
    await navigateTo('/')
  } catch (error: unknown) {
    const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
    ElMessage.error(fetchError.data?.statusMessage || fetchError.statusMessage || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="bg-glow bg-glow--left" />
    <div class="bg-glow bg-glow--right" />

    <main class="login-shell">

      <div class="app-icon">
        <AppLogo :size="44" />
      </div>

      <header class="hero">
        <p>使用你的账号继续</p>
      </header>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="field-group">
          <label
            class="field"
            :class="{ 'field--focused': focusedField === 'username' }"
          >
            <span class="field__label">账户</span>
            <input
              v-model="form.username"
              type="text"
              autocomplete="username"
              placeholder="用户名"
              @focus="focusedField = 'username'"
              @blur="focusedField = null"
            >
          </label>

          <label
            class="field"
            :class="{ 'field--focused': focusedField === 'password' }"
          >
            <span class="field__label">密码</span>
            <div class="field__password">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                placeholder="密码"
                @focus="focusedField = 'password'"
                @blur="focusedField = null"
                @keyup.enter="handleLogin"
              >
              <button
                type="button"
                class="field__toggle"
                :aria-label="showPassword ? '隐藏密码' : '显示密码'"
                @click="showPassword = !showPassword"
              >
                {{ showPassword ? '隐藏' : '显示' }}
              </button>
            </div>
          </label>
        </div>

        <button class="submit-btn" type="submit" :disabled="loading">
          <span v-if="loading" class="spinner" />
          <span>{{ loading ? '正在登录…' : '登录' }}</span>
        </button>
      </form>

      <footer class="footer">
        <div class="demo-panel">
          <p>演示账号 <strong>admin</strong> / <strong>123456</strong></p>
        </div>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.login-page {
  --apple-bg: #f5f5f7;
  --apple-text: #1d1d1f;
  --apple-secondary: #6e6e73;
  --apple-tertiary: #86868b;
  --apple-placeholder: #aeaeb2;
  --apple-blue: #0071e3;
  --apple-blue-hover: #0077ed;
  --apple-border: rgba(0, 0, 0, 0.08);
  --apple-field-bg: rgba(255, 255, 255, 0.88);
  --apple-surface: rgba(255, 255, 255, 0.72);
  --apple-surface-border: rgba(255, 255, 255, 0.65);
  --apple-shadow: 0 24px 80px rgba(0, 0, 0, 0.08);
  --apple-radius-sm: 14px;
  --apple-radius-md: 18px;
  --apple-radius-lg: 28px;
  --apple-transition: 0.2s ease;

  position: relative;
  width: 100%;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 20px;
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0, 113, 227, 0.08), transparent),
    var(--apple-bg);
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'SF Pro Display',
    'SF Pro Text',
    'Helvetica Neue',
    sans-serif;
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

.bg-glow--left {
  top: -120px;
  left: -80px;
  background: rgba(0, 113, 227, 0.18);
}

.bg-glow--right {
  right: -100px;
  bottom: -120px;
  background: rgba(175, 82, 222, 0.14);
}

.login-shell {
  position: relative;
  width: min(100%, 420px);
  padding: 40px 36px 32px;
  border: 1px solid var(--apple-surface-border);
  border-radius: var(--apple-radius-lg);
  background: var(--apple-surface);
  box-shadow: var(--apple-shadow);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  animation: shell-enter 0.4s ease-out both;
}

.app-icon {
  width: 72px;
  height: 72px;
  margin: 0 auto 24px;
  display: grid;
  place-items: center;
  border-radius: var(--apple-radius-md);
  background: rgba(255, 255, 255, 0.92);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.8),
    0 10px 30px rgba(0, 0, 0, 0.08);
}

.hero {
  text-align: center;
  margin-bottom: 28px;
}

.hero h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.hero p {
  margin: 10px 0 0;
  font-size: 15px;
  line-height: 1.5;
  color: var(--apple-secondary);
}

.login-form {
  display: grid;
  gap: 20px;
}

.field-group {
  display: grid;
  gap: 12px;
}

.field {
  display: grid;
  gap: 8px;
  padding: 14px 16px;
  border-radius: var(--apple-radius-sm);
  background: var(--apple-field-bg);
  border: 1px solid var(--apple-border);
  transition:
    border-color var(--apple-transition),
    box-shadow var(--apple-transition),
    background-color var(--apple-transition);
}

.field:hover:not(.field--focused) {
  border-color: rgba(0, 0, 0, 0.12);
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
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  font: inherit;
  font-size: 17px;
  letter-spacing: -0.01em;
  color: var(--apple-text);
}

.field input::placeholder {
  color: var(--apple-placeholder);
}

.field__password {
  display: flex;
  align-items: center;
  gap: 12px;
}

.field__toggle {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  padding: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--apple-blue);
  cursor: pointer;
  transition: opacity var(--apple-transition);
}

.field__toggle:hover {
  opacity: 0.72;
}

.submit-btn {
  height: 50px;
  border: 0;
  border-radius: var(--apple-radius-sm);
  background: var(--apple-blue);
  color: #fff;
  font: inherit;
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.01em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition:
    background-color var(--apple-transition),
    transform 0.15s ease,
    opacity var(--apple-transition);
}

.submit-btn:hover:not(:disabled) {
  background: var(--apple-blue-hover);
}

.submit-btn:active:not(:disabled) {
  transform: scale(0.985);
}

.submit-btn:disabled {
  opacity: 0.72;
  cursor: wait;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.footer {
  margin-top: 24px;
}

.demo-panel {
  padding: 12px 16px;
  border-radius: var(--apple-radius-sm);
  border: 1px solid var(--apple-border);
  background: var(--apple-field-bg);
  text-align: center;
}

.demo-panel p {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--apple-tertiary);
}

.demo-panel strong {
  color: var(--apple-secondary);
  font-weight: 600;
}

@keyframes shell-enter {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-color-scheme: dark) {
  .login-page {
    --apple-bg: #1d1d1f;
    --apple-text: #f5f5f7;
    --apple-secondary: #a1a1a6;
    --apple-tertiary: #86868b;
    --apple-placeholder: #636366;
    --apple-border: rgba(255, 255, 255, 0.1);
    --apple-field-bg: rgba(255, 255, 255, 0.06);
    --apple-surface: rgba(44, 44, 46, 0.72);
    --apple-surface-border: rgba(255, 255, 255, 0.08);
    --apple-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
    background:
      radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0, 113, 227, 0.12), transparent),
      var(--apple-bg);
  }

  .bg-glow--left {
    background: rgba(0, 113, 227, 0.22);
  }

  .bg-glow--right {
    background: rgba(175, 82, 222, 0.18);
  }

  .field:hover:not(.field--focused) {
    border-color: rgba(255, 255, 255, 0.16);
  }
}

@media (max-width: 480px) {
  .login-shell {
    padding: 32px 22px 24px;
    border-radius: 24px;
  }

  .hero h1 {
    font-size: 28px;
  }
}
</style>
