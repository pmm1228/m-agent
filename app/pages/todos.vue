<script setup lang="ts">
definePageMeta({
  layout: 'workspace',
  middleware: 'auth'
})

useHead({
  title: '待办'
})

interface TodoItem {
  id: number
  title: string
  done: boolean
  time: string
}

type FilterKey = 'all' | 'active' | 'done'

const filter = useState<FilterKey>('todo-filter', () => 'all')
const newTitle = ref('')
const creating = ref(false)
const busyId = ref<number | null>(null)

const { data: todoData, pending, refresh: refreshTodos } = await useFetch<{ data: TodoItem[] }>('/api/todos', {
  key: 'todos',
  credentials: 'include',
  server: false
})

const todos = computed(() => todoData.value?.data ?? [])

const filteredTodos = computed(() => {
  if (filter.value === 'active') {
    return todos.value.filter(item => !item.done)
  }
  if (filter.value === 'done') {
    return todos.value.filter(item => item.done)
  }
  return todos.value
})

const stats = computed(() => ({
  total: todos.value.length,
  active: todos.value.filter(item => !item.done).length,
  done: todos.value.filter(item => item.done).length
}))

async function createTodo() {
  const title = newTitle.value.trim()
  if (!title || creating.value) {
    return
  }

  creating.value = true
  try {
    await $fetch('/api/todos', {
      method: 'POST',
      body: { title }
    })
    newTitle.value = ''
    await refreshTodos()
    ElMessage.success('待办已添加')
  } catch (error: unknown) {
    const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
    ElMessage.error(fetchError.data?.statusMessage || fetchError.statusMessage || '添加失败')
  } finally {
    creating.value = false
  }
}

async function toggleTodo(item: TodoItem) {
  if (busyId.value) {
    return
  }

  busyId.value = item.id
  try {
    await $fetch(`/api/todos/${item.id}`, {
      method: 'PATCH',
      body: { done: !item.done }
    })
    await refreshTodos()
  } catch (error: unknown) {
    const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
    ElMessage.error(fetchError.data?.statusMessage || fetchError.statusMessage || '更新失败')
  } finally {
    busyId.value = null
  }
}

async function deleteTodo(item: TodoItem) {
  if (busyId.value) {
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定删除「${item.title}」吗？`,
      '删除待办',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  } catch {
    return
  }

  busyId.value = item.id
  try {
    await $fetch(`/api/todos/${item.id}`, { method: 'DELETE' })
    await refreshTodos()
    ElMessage.success('待办已删除')
  } catch (error: unknown) {
    const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
    ElMessage.error(fetchError.data?.statusMessage || fetchError.statusMessage || '删除失败')
  } finally {
    busyId.value = null
  }
}
</script>

<template>
  <header class="toolbar">
    <div class="toolbar__title">
      <span class="toolbar__name">待办</span>
      <span class="toolbar__status">{{ stats.active }} 项待完成</span>
    </div>
  </header>

  <div class="todo-panel workspace-scroll">
    <div v-if="pending" class="todo-panel__empty">
      正在加载待办…
    </div>

    <div v-else-if="filteredTodos.length === 0" class="todo-panel__empty">
      <p>{{ filter === 'all' ? '还没有待办事项' : '这个列表是空的' }}</p>
      <p class="todo-panel__hint">在下方输入内容，或在对话中说「添加待办：买牛奶」</p>
    </div>

    <ul v-else class="todo-list">
      <li
        v-for="item in filteredTodos"
        :key="item.id"
        class="todo-row"
        :class="{ 'todo-row--done': item.done, 'todo-row--busy': busyId === item.id }"
      >
        <button
          class="todo-row__check"
          type="button"
          :aria-label="item.done ? '标记为未完成' : '标记为完成'"
          :disabled="busyId === item.id"
          @click="toggleTodo(item)"
        >
          <svg v-if="item.done" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>

        <div class="todo-row__content">
          <span class="todo-row__title">{{ item.title }}</span>
          <time class="todo-row__time">{{ item.time }}</time>
        </div>

        <button
          class="todo-row__delete"
          type="button"
          title="删除待办"
          :disabled="busyId === item.id"
          @click="deleteTodo(item)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
          </svg>
        </button>
      </li>
    </ul>
  </div>

  <footer class="composer composer--compact">
    <form class="composer__box composer__box--row" @submit.prevent="createTodo">
      <input
        v-model="newTitle"
        class="composer__input"
        type="text"
        placeholder="添加待办事项…"
        :disabled="creating"
      >
      <button class="composer__action" type="submit" :disabled="!newTitle.trim() || creating">
        添加
      </button>
    </form>
  </footer>
</template>

<style scoped>
.todo-panel {
  flex: 1;
  min-height: 0;
  padding: 20px 24px 12px;
}

.todo-panel__empty {
  height: 100%;
  display: grid;
  place-content: center;
  gap: 8px;
  text-align: center;
  color: var(--muted);
  font-size: 14px;
}

.todo-panel__hint {
  margin: 0;
  font-size: 13px;
}

.todo-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 10px;
}

.todo-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 12px 14px 14px;
  border-radius: 14px;
  border: 0.5px solid var(--line);
  background: rgba(255, 255, 255, 0.88);
  transition: opacity 0.15s ease;
}

.todo-row--busy {
  opacity: 0.65;
}

.todo-row--done {
  background: rgba(255, 255, 255, 0.55);
}

.todo-row__check {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1.5px solid rgba(0, 0, 0, 0.14);
  border-radius: 50%;
  appearance: none;
  display: grid;
  place-items: center;
  background: #fff;
  color: #fff;
  line-height: 1;
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.15s ease;
}

.todo-row__check svg {
  display: block;
}

.todo-row--done .todo-row__check {
  border-color: #34c759;
  background: #34c759;
}

.todo-row__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-row__title {
  font-size: 15px;
  line-height: 1.45;
  letter-spacing: -0.01em;
  word-break: break-word;
}

.todo-row--done .todo-row__title {
  color: var(--sub);
  text-decoration: line-through;
}

.todo-row__time {
  font-size: 11px;
  color: var(--muted);
}

.todo-row__delete {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: transparent;
  color: var(--muted);
  cursor: pointer;
  opacity: 0;
  transition:
    opacity 0.15s ease,
    background 0.15s ease,
    color 0.15s ease;
}

.todo-row:hover .todo-row__delete,
.todo-row__delete:focus-visible {
  opacity: 1;
}

.todo-row__delete:hover:not(:disabled) {
  background: rgba(255, 59, 48, 0.12);
  color: #ff3b30;
}

.composer--compact {
  min-height: 74px;
}

.composer__box--row {
  align-items: center;
  border-radius: 14px;
  padding: 8px 8px 8px 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.composer__action {
  flex-shrink: 0;
  height: 36px;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: var(--blue);
  color: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease, opacity 0.15s ease;
}

.composer__action:hover:not(:disabled) {
  background: #0077ed;
}

.composer__action:active:not(:disabled) {
  transform: scale(0.985);
}

.composer__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .todo-panel {
    padding: 16px;
  }
}
</style>
