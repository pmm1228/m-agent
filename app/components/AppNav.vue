<script setup lang="ts">
const route = useRoute()

const activeTab = computed(() => (route.path === '/todos' ? 'todos' : 'chat'))
</script>

<template>
  <nav class="app-nav" aria-label="主导航">
    <NuxtLink
      to="/"
      class="app-nav__item"
      :class="{ 'app-nav__item--active': activeTab === 'chat' }"
    >
      对话
    </NuxtLink>
    <NuxtLink
      to="/todos"
      class="app-nav__item"
      :class="{ 'app-nav__item--active': activeTab === 'todos' }"
    >
      待办
    </NuxtLink>
  </nav>
</template>

<style scoped>
.app-nav {
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  height: 46px;
  margin: 0 14px 12px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.35);
  border: 0.5px solid rgba(0, 0, 0, 0.06);
}

.app-nav__item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  color: #6e6e73;
  text-decoration: none;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    box-shadow 0.15s ease;
}

.app-nav__item:hover {
  color: #1d1d1f;
}

.app-nav__item--active {
  background: rgba(255, 255, 255, 0.88);
  color: #007aff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
</style>
