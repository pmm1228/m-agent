<script setup lang="ts">
const {
  conversations,
  activeId,
  deletingId,
  sending,
  loadingConversations,
  getConversationPreview,
  switchConversation,
  deleteConversation
} = useConversations()
</script>

<template>
  <div class="chat-sidebar">
    <div v-if="loadingConversations" class="chat-sidebar__loading">
      正在加载…
    </div>
    <div v-else class="conversation-list workspace-scroll">
      <div
        v-for="item in conversations"
        :key="item.id"
        class="conversation-row"
        :class="{
          'conversation-row--active': item.id === activeId,
          'conversation-row--deleting': deletingId === item.id
        }"
      >
        <button
          class="conversation"
          type="button"
          :disabled="deletingId === item.id"
          @click="switchConversation(item.id)"
        >
          <div class="conversation__avatar">
            <AppLogo :size="22" />
          </div>
          <div class="conversation__meta">
            <span class="conversation__name">{{ item.title }}</span>
            <span class="conversation__preview">{{ getConversationPreview(item) }}</span>
          </div>
          <span v-if="item.id === activeId" class="status-dot" title="当前对话" />
        </button>
        <button
          class="conversation__delete"
          type="button"
          title="删除对话"
          :disabled="deletingId === item.id || sending"
          @click="deleteConversation(item.id)"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-sidebar {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-sidebar__loading {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 13px;
}

.conversation-list {
  flex: 1;
  min-height: 0;
  padding-bottom: 8px;
}

.conversation-list::-webkit-scrollbar {
  width: 4px;
}

.conversation-list::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 99px;
}

.conversation-row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: calc(100% - 20px);
  min-width: 0;
  margin: 0 10px;
  padding-right: 4px;
  border-radius: 12px;
  transition: background 0.15s ease;
}

.conversation-row:hover,
.conversation-row--active {
  background: rgba(0, 122, 255, 0.1);
}

.conversation-row--deleting {
  opacity: 0.55;
}

.conversation {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
  padding: 10px 8px 10px 12px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.conversation:disabled {
  cursor: wait;
}

.conversation__avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
}

.conversation__meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.conversation__name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation__preview {
  font-size: 12px;
  color: #6e6e73;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #34c759;
  box-shadow: 0 0 0 3px rgba(52, 199, 89, 0.18);
}

.conversation__delete {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  margin-right: 4px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: transparent;
  color: #aeaeb2;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.92);
  transition:
    opacity 0.15s ease,
    background 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
}

.conversation-row:hover .conversation__delete,
.conversation-row--active .conversation__delete,
.conversation__delete:focus-visible {
  opacity: 1;
  transform: scale(1);
}

.conversation__delete:hover:not(:disabled) {
  background: rgba(255, 59, 48, 0.12);
  color: #ff3b30;
}

.conversation__delete:active:not(:disabled) {
  transform: scale(0.92);
}

.conversation__delete:disabled {
  cursor: not-allowed;
  opacity: 0.35;
}
</style>
