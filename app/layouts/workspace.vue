<script setup lang="ts">
const route = useRoute()

const isChatRoute = computed(() => route.path === '/')
const isTodosRoute = computed(() => route.path === '/todos')

const { creating, startNewConversation } = useConversations()

const { data: authData, refresh: refreshAuth } = await useFetch('/api/auth/me', { key: 'auth-me' })

async function handleLogout() {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await refreshAuth()
  await navigateTo('/login')
}
</script>

<template>
  <div class="workspace">
    <div class="mesh mesh--a" />
    <div class="mesh mesh--b" />
    <div class="mesh mesh--c" />

    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar__header">
          <AppLogo :size="26" class="sidebar__logo" />
          <h2>mAgent</h2>
          <span class="badge">Beta</span>
        </div>

        <AppNav />

        <button
          v-show="isChatRoute"
          class="new-chat-btn"
          type="button"
          :disabled="creating"
          @click="startNewConversation()"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          <span>新对话</span>
        </button>

        <div class="sidebar__body">
          <SidebarChatSidebar v-show="isChatRoute" class="sidebar__panel" />
          <SidebarTodosSidebar v-show="isTodosRoute" class="sidebar__panel" />
        </div>

        <div class="sidebar__footer">
          <UserCard :username="authData?.user?.username" @logout="handleLogout" />
        </div>
      </aside>

      <section class="main">
        <slot />
      </section>
    </div>
  </div>
</template>
