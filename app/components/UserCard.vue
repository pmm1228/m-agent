<script setup lang="ts">
defineProps<{
  username?: string
}>()

const emit = defineEmits<{
  logout: []
}>()
</script>

<template>
  <div class="user-card">
    <div class="user-card__avatar">
      {{ username?.charAt(0).toUpperCase() || 'U' }}
    </div>
    <div class="user-card__info">
      <span class="user-card__name">{{ username || '用户' }}</span>
      <span class="user-card__role">已登录</span>
    </div>
    <button class="user-card__logout" type="button" title="退出登录" @click="emit('logout')">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 8px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.45);
  overflow: hidden;
}

.user-card__avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 14px;
  font-weight: 600;
  background: linear-gradient(180deg, #fff, #ececf1);
  color: #6e6e73;
  border: 0.5px solid rgba(0, 0, 0, 0.06);
}

.user-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.user-card__name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-card__role {
  font-size: 11px;
  color: #aeaeb2;
}

.user-card__logout {
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: transparent;
  color: #6e6e73;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.user-card__logout:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}
</style>
