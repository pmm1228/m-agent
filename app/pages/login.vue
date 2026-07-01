<script setup lang="ts">
import { ArrowRight, Hide, User, View } from '@element-plus/icons-vue'

definePageMeta({
  layout: false
})

useHead({
  title: '登录'
})

const form = reactive({
  username: 'admin',
  password: ''
})
const loading = ref(false)
const showPassword = ref(false)
const showAccountField = ref(false)
const focusedField = ref<'username' | 'password' | null>(null)
const errorMessage = ref('')
const fieldErrors = reactive({
  username: '',
  password: ''
})

const canSubmit = computed(() => Boolean(form.username.trim() && form.password && !loading.value))
const displayName = computed(() => form.username.trim() || '其他用户')

const { data: authData } = await useFetch('/api/auth/me', { key: 'auth-me' })
if (authData.value?.user) {
  await navigateTo('/')
}

watch(
  () => form.username,
  () => {
    fieldErrors.username = ''
    errorMessage.value = ''
  }
)

watch(
  () => form.password,
  () => {
    fieldErrors.password = ''
    errorMessage.value = ''
  }
)

function validateForm() {
  fieldErrors.username = form.username.trim() ? '' : '请输入账户'
  fieldErrors.password = form.password ? '' : '请输入密码'
  return !fieldErrors.username && !fieldErrors.password
}

function toggleAccountField() {
  showAccountField.value = !showAccountField.value
  fieldErrors.username = ''
  errorMessage.value = ''
}

async function handleLogin() {
  errorMessage.value = ''

  if (!validateForm()) {
    return
  }

  loading.value = true
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: {
        username: form.username.trim(),
        password: form.password
      }
    })
    await refreshNuxtData(['auth-me', 'conversations'])
    ElMessage.success('登录成功')
    await navigateTo('/')
  } catch (error: unknown) {
    const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
    errorMessage.value = fetchError.data?.statusMessage || fetchError.statusMessage || '登录失败，请检查账户和密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="lock-page">
    <div class="wallpaper" aria-hidden="true" />

    <main class="login-stage" aria-labelledby="login-title">
      <section class="user-login" aria-label="登录表单">
        <div class="avatar-ring">
          <div class="avatar">
            <AppLogo :size="72" alt="mAgent" />
          </div>
        </div>

        <h1 id="login-title">{{ displayName }}</h1>
        <p class="login-subtitle">mAgent 工作区</p>

        <form class="lock-form" novalidate @submit.prevent="handleLogin">
          <label
            v-if="showAccountField"
            class="lock-field lock-field--account"
            :class="{
              'lock-field--focused': focusedField === 'username',
              'lock-field--invalid': fieldErrors.username
            }"
            for="login-username"
          >
            <span class="visually-hidden">账户</span>
            <ElIcon :size="17" aria-hidden="true">
              <User />
            </ElIcon>
            <input
              id="login-username"
              v-model="form.username"
              type="text"
              autocomplete="username"
              inputmode="text"
              placeholder="账户"
              :aria-invalid="Boolean(fieldErrors.username)"
              :aria-describedby="fieldErrors.username ? 'username-error' : undefined"
              @focus="focusedField = 'username'"
              @blur="focusedField = null"
            >
          </label>
          <p v-if="fieldErrors.username" id="username-error" class="field-error">
            {{ fieldErrors.username }}
          </p>

          <label
            class="lock-field"
            :class="{
              'lock-field--focused': focusedField === 'password',
              'lock-field--invalid': fieldErrors.password
            }"
            for="login-password"
          >
            <span class="visually-hidden">密码</span>
            <input
              id="login-password"
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="输入密码"
              :aria-invalid="Boolean(fieldErrors.password)"
              :aria-describedby="fieldErrors.password ? 'password-error' : undefined"
              @focus="focusedField = 'password'"
              @blur="focusedField = null"
            >
            <button
              type="button"
              class="field-icon"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              @click="showPassword = !showPassword"
            >
              <ElIcon :size="17" aria-hidden="true">
                <component :is="showPassword ? Hide : View" />
              </ElIcon>
            </button>
            <button
              class="submit-orb"
              type="submit"
              :disabled="!canSubmit"
              aria-label="登录"
            >
              <span v-if="loading" class="spinner" aria-hidden="true" />
              <ElIcon v-else :size="18" aria-hidden="true">
                <ArrowRight />
              </ElIcon>
            </button>
          </label>
          <p v-if="fieldErrors.password" id="password-error" class="field-error">
            {{ fieldErrors.password }}
          </p>

          <p v-if="errorMessage" class="form-error" role="alert">
            {{ errorMessage }}
          </p>

          <button class="account-switch" type="button" @click="toggleAccountField">
            {{ showAccountField ? '使用默认账户' : '其他账户' }}
          </button>
        </form>
      </section>
    </main>

    <footer class="lock-footer">
      <p>演示账户：admin / 123456</p>
    </footer>
  </div>
</template>

<style scoped>
.lock-page {
  --text-primary: #1d1d1f;
  --text-secondary: #515154;
  --text-muted: #6e6e73;
  --field-bg: rgba(255, 255, 255, 0.44);
  --field-bg-strong: rgba(255, 255, 255, 0.62);
  --field-border: rgba(255, 255, 255, 0.72);
  --field-shadow: rgba(0, 0, 0, 0.12);
  --danger: #b42318;
  --danger-bg: rgba(255, 255, 255, 0.56);
  --focus-ring: rgba(0, 122, 255, 0.16);
  --control-size: 42px;

  position: relative;
  width: 100%;
  height: 100dvh;
  min-height: 640px;
  overflow: hidden;
  display: grid;
  grid-template-rows: 1fr auto;
  justify-items: center;
  color: var(--text-primary);
  background: #d7d8dc;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    "SF Pro Text",
    "Helvetica Neue",
    Arial,
    sans-serif;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

.wallpaper,
.wallpaper::before,
.wallpaper::after {
  position: absolute;
  inset: 0;
}

.wallpaper {
  z-index: 0;
  background: #d7d8dc;
}

.wallpaper::before {
  content: "";
  background:
    radial-gradient(circle at 10% 0%, rgba(99, 154, 255, 0.45), transparent 34%),
    radial-gradient(circle at 86% 30%, rgba(191, 122, 255, 0.32), transparent 32%),
    radial-gradient(circle at 50% 108%, rgba(255, 159, 120, 0.28), transparent 30%);
  filter: blur(42px);
  transform: scale(1.05);
}

.wallpaper::after {
  content: "";
  background: rgba(215, 216, 220, 0.18);
  backdrop-filter: blur(22px) saturate(1.18);
  -webkit-backdrop-filter: blur(22px) saturate(1.18);
}

.login-stage,
.lock-footer {
  position: relative;
  z-index: 1;
}

.login-stage {
  align-self: center;
  width: min(100%, 420px);
  padding: 72px 24px 24px;
}

.user-login {
  display: grid;
  justify-items: center;
  text-align: center;
}

.avatar-ring {
  width: 118px;
  height: 118px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.48);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 20px 52px rgba(0, 0, 0, 0.12);
  backdrop-filter: blur(24px) saturate(1.4);
  -webkit-backdrop-filter: blur(24px) saturate(1.4);
}

.avatar {
  width: 94px;
  height: 94px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.95), rgba(232, 236, 244, 0.82));
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.78),
    0 8px 18px rgba(0, 0, 0, 0.16);
}

.user-login h1 {
  margin: 18px 0 0;
  max-width: 100%;
  color: var(--text-primary);
  font-size: 29px;
  font-weight: 650;
  line-height: 1.18;
  letter-spacing: 0;
  text-shadow: 0 1px 12px rgba(255, 255, 255, 0.42);
  overflow-wrap: anywhere;
}

.login-subtitle {
  margin: 5px 0 0;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  text-shadow: 0 1px 10px rgba(255, 255, 255, 0.36);
}

.lock-form {
  width: min(100%, 328px);
  margin-top: 20px;
  display: grid;
  justify-items: stretch;
  gap: 10px;
}

.lock-field {
  min-height: var(--control-size);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 15px;
  border: 1px solid var(--field-border);
  border-radius: 999px;
  background: var(--field-bg);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    0 14px 32px var(--field-shadow);
  color: var(--text-primary);
  backdrop-filter: blur(26px) saturate(1.2);
  -webkit-backdrop-filter: blur(26px) saturate(1.2);
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.lock-field--account {
  padding-left: 13px;
}

.lock-field:hover {
  background: var(--field-bg-strong);
}

.lock-field--focused {
  border-color: rgba(0, 122, 255, 0.32);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.72),
    0 0 0 4px var(--focus-ring),
    0 16px 34px var(--field-shadow);
}

.lock-field--invalid {
  border-color: rgba(180, 35, 24, 0.38);
  background: var(--danger-bg);
}

.lock-field input {
  width: 100%;
  min-width: 0;
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  outline: none;
  border-radius: 0;
  background: transparent !important;
  color: var(--text-primary);
  font: inherit;
  font-size: 15px;
  line-height: 1.4;
  caret-color: #007aff;
  -webkit-text-fill-color: var(--text-primary);
}

.lock-field input::placeholder {
  color: rgba(29, 29, 31, 0.48);
  -webkit-text-fill-color: rgba(29, 29, 31, 0.48);
}

.lock-field input:-webkit-autofill,
.lock-field input:-webkit-autofill:hover,
.lock-field input:-webkit-autofill:focus {
  border: 0;
  background: transparent !important;
  box-shadow: 0 0 0 1000px transparent inset !important;
  -webkit-box-shadow: 0 0 0 1000px transparent inset !important;
  -webkit-text-fill-color: var(--text-primary) !important;
  transition: background-color 999999s ease-in-out 0s;
}

.field-icon,
.submit-orb {
  width: 34px;
  height: 34px;
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  transition:
    background-color 160ms ease,
    opacity 160ms ease,
    transform 160ms ease;
}

.field-icon {
  background: transparent;
  color: rgba(29, 29, 31, 0.62);
}

.field-icon:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--text-primary);
}

.submit-orb {
  background: rgba(0, 122, 255, 0.92);
  color: #fff;
}

.submit-orb:hover:not(:disabled) {
  background: #0077ed;
  transform: scale(1.03);
}

.submit-orb:disabled {
  cursor: not-allowed;
  opacity: 0.34;
}

.field-icon:focus-visible,
.submit-orb:focus-visible,
.account-switch:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 3px;
}

.field-error,
.form-error {
  margin: 0;
  color: var(--danger);
  font-size: 13px;
  font-weight: 560;
  line-height: 1.42;
  text-shadow: 0 1px 10px rgba(255, 255, 255, 0.3);
}

.form-error {
  padding: 9px 12px;
  border: 1px solid rgba(180, 35, 24, 0.18);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.56);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.account-switch {
  justify-self: center;
  min-height: 32px;
  border: 0;
  border-radius: 999px;
  padding: 5px 13px;
  background: rgba(255, 255, 255, 0.48);
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 560;
  line-height: 1.35;
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.account-switch:hover {
  background: rgba(255, 255, 255, 0.68);
  color: var(--text-primary);
}

.lock-footer {
  align-self: end;
  padding: 0 20px 28px;
  text-align: center;
}

.lock-footer p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 520;
  line-height: 1.4;
  text-shadow: 0 1px 10px rgba(255, 255, 255, 0.36);
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.42);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 800ms linear infinite;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    transition-duration: 1ms !important;
  }
}

@media (max-width: 720px) {
  .lock-page {
    min-height: 560px;
    grid-template-rows: 1fr auto;
  }

  .login-stage {
    padding: 56px 18px 18px;
  }

  .avatar-ring {
    width: 108px;
    height: 108px;
  }

  .avatar {
    width: 86px;
    height: 86px;
  }

  .user-login h1 {
    font-size: 27px;
  }

  .lock-footer {
    padding-bottom: 22px;
  }
}

@media (max-width: 380px) {
  .lock-form {
    width: min(100%, 304px);
  }
}
</style>
