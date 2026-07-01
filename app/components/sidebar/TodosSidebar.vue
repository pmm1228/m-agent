<script setup lang="ts">
type FilterKey = 'all' | 'active' | 'done'

const filter = useState<FilterKey>('todo-filter', () => 'all')

const { data: todoData } = await useFetch<{ data: Array<{ done: boolean }> }>('/api/todos', {
  key: 'todos',
  credentials: 'include',
  server: false
})

const stats = computed(() => {
  const todos = todoData.value?.data ?? []
  return {
    total: todos.length,
    active: todos.filter(item => !item.done).length,
    done: todos.filter(item => item.done).length
  }
})

const filters = computed(() => [
  { key: 'all' as FilterKey, label: '全部', count: stats.value.total },
  { key: 'active' as FilterKey, label: '待完成', count: stats.value.active },
  { key: 'done' as FilterKey, label: '已完成', count: stats.value.done }
])
</script>

<template>
  <div class="todos-sidebar workspace-scroll">
    <p class="todos-sidebar__label">筛选</p>
    <div class="filter-list">
      <button
        v-for="item in filters"
        :key="item.key"
        class="filter-item"
        :class="{ 'filter-item--active': filter === item.key }"
        type="button"
        @click="filter = item.key"
      >
        <span>{{ item.label }}</span>
        <span class="filter-item__count">{{ item.count }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.todos-sidebar {
  flex: 1;
  min-height: 0;
  padding: 8px 0;
}

.todos-sidebar__label {
  margin: 0 18px 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: #6e6e73;
}

.filter-list {
  display: grid;
  gap: 4px;
  padding: 0 10px;
}

.filter-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  font-size: 14px;
  font-weight: 600;
  color: #1d1d1f;
  cursor: pointer;
  transition: background 0.15s ease;
}

.filter-item:hover {
  background: rgba(255, 255, 255, 0.45);
}

.filter-item--active {
  background: rgba(0, 122, 255, 0.1);
  color: #007aff;
}

.filter-item__count {
  min-width: 22px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.05);
  font-size: 11px;
  font-weight: 600;
  color: #6e6e73;
}

.filter-item--active .filter-item__count {
  background: rgba(0, 122, 255, 0.14);
  color: #007aff;
}
</style>
