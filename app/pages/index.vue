<script setup lang="ts">
import MarkdownIt from 'markdown-it'

definePageMeta({
  layout: 'workspace',
  middleware: 'auth'
})

useHead({
  title: '对话'
})

interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  time: string
}

const quickPrompts = [
  '介绍一下 mAgent',
  '数据库怎么用',
  '帮我把「买牛奶」加入待办'
]

const input = ref('')
const chatRef = ref<HTMLElement | null>(null)
const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true
})

const defaultLinkOpen = markdown.renderer.rules.link_open
markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')

  if (defaultLinkOpen) {
    return defaultLinkOpen(tokens, idx, options, env, self)
  }

  return self.renderToken(tokens, idx, options)
}

const {
  activeConversation,
  activeId,
  creating,
  sending,
  loadingConversations,
  startNewConversation,
  sendMessage: sendChatMessage,
  canSend
} = useConversations()

const messages = computed(() => activeConversation.value?.messages ?? [])

function parseLocalTime(time: string): Date | null {
  const match = time.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/)
  if (match) {
    const [, y, m, d, h, min, s] = match
    return new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s ?? 0))
  }

  const date = new Date(time)
  return Number.isNaN(date.getTime()) ? null : date
}

function getMessageDayKey(time: string) {
  const date = parseLocalTime(time)
  if (!date) {
    return time.slice(0, 10) || 'unknown'
  }

  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function formatDayLabel(dayKey: string) {
  const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return dayKey
  }

  const [, y, m, d] = match
  const msgDate = new Date(Number(y), Number(m) - 1, Number(d))
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  msgDate.setHours(0, 0, 0, 0)

  if (msgDate.getTime() === today.getTime()) {
    return '今天'
  }
  if (msgDate.getTime() === yesterday.getTime()) {
    return '昨天'
  }

  const year = Number(y)
  const month = Number(m)
  const day = Number(d)

  if (year === today.getFullYear()) {
    return `${month}月${day}日`
  }

  return `${year}年${month}月${day}日`
}

function formatMessageTime(time: string) {
  const date = parseLocalTime(time)
  if (date) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const match = time.match(/(\d{2}):(\d{2})/)
  return match ? `${match[1]}:${match[2]}` : time
}

function renderMarkdown(content: string) {
  return markdown.render(content)
}

type MessageListItem =
  | { kind: 'divider', key: string, label: string }
  | { kind: 'message', key: number, msg: ChatMessage }

const messageItems = computed<MessageListItem[]>(() => {
  const items: MessageListItem[] = []
  let lastDayKey = ''

  for (const msg of messages.value) {
    const dayKey = getMessageDayKey(msg.time)
    if (dayKey !== lastDayKey) {
      items.push({
        kind: 'divider',
        key: `day-${dayKey}`,
        label: formatDayLabel(dayKey)
      })
      lastDayKey = dayKey
    }

    items.push({
      kind: 'message',
      key: msg.id,
      msg
    })
  }

  return items
})

function scrollToBottom() {
  nextTick(() => {
    if (chatRef.value) {
      chatRef.value.scrollTo({ top: chatRef.value.scrollHeight, behavior: 'smooth' })
    }
  })
}

async function sendMessage(text?: string) {
  const content = (text ?? input.value).trim()
  if (!content) {
    return
  }

  if (!text) {
    input.value = ''
  }

  try {
    await sendChatMessage(content, scrollToBottom)
  } catch {
    if (!text) {
      input.value = content
    }
  }
}

onMounted(scrollToBottom)

watch(activeId, () => {
  scrollToBottom()
})
</script>

<template>
  <header class="toolbar">
    <div class="toolbar__title">
      <span class="toolbar__name">{{ activeConversation?.title || 'mAgent' }}</span>
      <span class="toolbar__status toolbar__status--online">在线</span>
    </div>
    <div class="toolbar__spacer" />
    <button class="toolbar__new" type="button" :disabled="creating" @click="startNewConversation(scrollToBottom)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <span>新对话</span>
    </button>
  </header>

  <div ref="chatRef" class="messages workspace-scroll">
    <div v-if="loadingConversations" class="messages__loading">
      正在加载对话…
    </div>
    <div v-else class="messages__inner">
      <template v-for="item in messageItems" :key="item.key">
        <div v-if="item.kind === 'divider'" class="day-divider">
          <span>{{ item.label }}</span>
        </div>

        <article
          v-else
          class="msg"
          :class="`msg--${item.msg.role}`"
        >
          <div v-if="item.msg.role === 'assistant'" class="msg__avatar">
            <AppLogo :size="16" />
          </div>

          <div class="msg__body">
            <span v-if="item.msg.role === 'assistant'" class="msg__sender">mAgent</span>
            <div
              v-if="item.msg.role === 'assistant'"
              class="msg__bubble msg__bubble--markdown"
              v-html="renderMarkdown(item.msg.content)"
            />
            <div v-else class="msg__bubble msg__bubble--plain">{{ item.msg.content }}</div>
            <time class="msg__time">{{ formatMessageTime(item.msg.time) }}</time>
          </div>
        </article>
      </template>

      <article v-if="sending" class="msg msg--assistant msg--typing">
        <div class="msg__avatar">
          <AppLogo :size="16" />
        </div>
        <div class="msg__body">
          <div class="msg__bubble msg__bubble--typing">
            <span /><span /><span />
          </div>
        </div>
      </article>
    </div>
  </div>

  <footer class="composer">
    <div class="chips">
      <button
        v-for="prompt in quickPrompts"
        :key="prompt"
        class="chip"
        type="button"
        :disabled="!canSend"
        @click="sendMessage(prompt)"
      >
        {{ prompt }}
      </button>
    </div>

    <div class="composer__box">
      <textarea
        v-model="input"
        class="composer__input"
        placeholder="给 mAgent 发消息…"
        rows="1"
        :disabled="sending || loadingConversations"
        @keydown.enter.exact.prevent="sendMessage()"
      />
      <button
        class="composer__send"
        type="button"
        :disabled="!input.trim() || !canSend"
        @click="sendMessage()"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
  </footer>
</template>

<style scoped>
.messages {
  flex: 1;
  min-height: 0;
  scroll-behavior: smooth;
}

.messages__loading {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--muted);
  font-size: 14px;
}

.messages__inner {
  padding: 24px 28px 12px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.day-divider {
  display: flex;
  justify-content: center;
}

.day-divider span {
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.04);
  font-size: 11px;
  font-weight: 500;
  color: var(--muted);
}

.msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.msg--user {
  flex-direction: row-reverse;
}

.msg__avatar {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  margin-top: 18px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.msg__body {
  max-width: min(72%, 520px);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.msg--user .msg__body {
  align-items: flex-end;
}

.msg__sender {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
  padding-left: 4px;
}

.msg__bubble {
  padding: 12px 16px;
  border-radius: 20px;
  font-size: 15px;
  line-height: 1.55;
  word-break: break-word;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.msg__bubble--plain {
  white-space: pre-wrap;
}

.msg__bubble--markdown {
  overflow-wrap: anywhere;
}

.msg__bubble--markdown :deep(*) {
  max-width: 100%;
}

.msg__bubble--markdown :deep(p) {
  margin: 0 0 10px;
}

.msg__bubble--markdown :deep(p:last-child),
.msg__bubble--markdown :deep(ul:last-child),
.msg__bubble--markdown :deep(ol:last-child),
.msg__bubble--markdown :deep(pre:last-child),
.msg__bubble--markdown :deep(blockquote:last-child) {
  margin-bottom: 0;
}

.msg__bubble--markdown :deep(h1),
.msg__bubble--markdown :deep(h2),
.msg__bubble--markdown :deep(h3),
.msg__bubble--markdown :deep(h4) {
  margin: 14px 0 8px;
  font-weight: 700;
  line-height: 1.25;
}

.msg__bubble--markdown :deep(h1:first-child),
.msg__bubble--markdown :deep(h2:first-child),
.msg__bubble--markdown :deep(h3:first-child),
.msg__bubble--markdown :deep(h4:first-child) {
  margin-top: 0;
}

.msg__bubble--markdown :deep(h1) {
  font-size: 19px;
}

.msg__bubble--markdown :deep(h2) {
  font-size: 17px;
}

.msg__bubble--markdown :deep(h3),
.msg__bubble--markdown :deep(h4) {
  font-size: 15px;
}

.msg__bubble--markdown :deep(ul),
.msg__bubble--markdown :deep(ol) {
  margin: 0 0 10px;
  padding-left: 20px;
}

.msg__bubble--markdown :deep(li) {
  margin: 4px 0;
  padding-left: 2px;
}

.msg__bubble--markdown :deep(li > p) {
  margin: 4px 0;
}

.msg__bubble--markdown :deep(a) {
  color: var(--blue);
  text-decoration: none;
  border-bottom: 1px solid rgba(0, 122, 255, 0.28);
}

.msg__bubble--markdown :deep(a:hover) {
  border-bottom-color: currentColor;
}

.msg__bubble--markdown :deep(code) {
  padding: 2px 5px;
  border-radius: 5px;
  background: rgba(0, 0, 0, 0.06);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9em;
}

.msg__bubble--markdown :deep(pre) {
  margin: 0 0 10px;
  padding: 12px;
  border-radius: 10px;
  overflow-x: auto;
  background: rgba(0, 0, 0, 0.78);
  color: #f5f5f7;
}

.msg__bubble--markdown :deep(pre code) {
  display: block;
  padding: 0;
  background: transparent;
  color: inherit;
  white-space: pre;
}

.msg__bubble--markdown :deep(blockquote) {
  margin: 0 0 10px;
  padding: 2px 0 2px 12px;
  border-left: 3px solid rgba(0, 122, 255, 0.3);
  color: var(--sub);
}

.msg__bubble--markdown :deep(table) {
  width: 100%;
  margin: 0 0 10px;
  border-collapse: collapse;
  font-size: 14px;
}

.msg__bubble--markdown :deep(th),
.msg__bubble--markdown :deep(td) {
  padding: 7px 8px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  text-align: left;
}

.msg__bubble--markdown :deep(th) {
  background: rgba(255, 255, 255, 0.58);
  font-weight: 700;
}

.msg--assistant .msg__bubble {
  background: var(--agent-bubble);
  color: var(--text);
  border-bottom-left-radius: 6px;
}

.msg--user .msg__bubble {
  background: linear-gradient(180deg, #0a84ff, #007aff);
  color: #fff;
  border-bottom-right-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 122, 255, 0.28);
}

.msg__time {
  font-size: 11px;
  color: var(--muted);
  padding: 0 4px;
}

.msg__bubble--typing {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 14px 18px;
}

.msg__bubble--typing span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #b0b0b5;
  animation: pulse 1.2s ease-in-out infinite;
}

.msg__bubble--typing span:nth-child(2) { animation-delay: 0.15s; }
.msg__bubble--typing span:nth-child(3) { animation-delay: 0.3s; }

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.chip {
  padding: 6px 12px;
  border: 0.5px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  font-weight: 500;
  color: var(--sub);
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    color 0.15s ease,
    background 0.15s ease;
}

.chip:hover:not(:disabled) {
  border-color: rgba(0, 122, 255, 0.25);
  color: var(--blue);
  background: var(--blue-soft);
}

.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.composer__send {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--blue);
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease, background 0.15s ease;
  box-shadow: 0 4px 14px rgba(0, 122, 255, 0.35);
}

.composer__send:hover:not(:disabled) {
  background: #0077ed;
}

.composer__send:active:not(:disabled) {
  transform: scale(0.94);
}

.composer__send:disabled {
  opacity: 0.35;
  box-shadow: none;
  cursor: not-allowed;
}

.msg-enter-active {
  transition:
    opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}

.msg-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

@keyframes pulse {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.45; }
  30% { transform: translateY(-5px); opacity: 1; }
}

@media (max-width: 768px) {
  .messages__inner {
    padding: 18px 16px 10px;
  }

  .msg__body {
    max-width: 85%;
  }
}
</style>
