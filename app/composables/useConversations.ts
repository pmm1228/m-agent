export type MessageStatus = 'pending' | 'completed' | 'failed'

export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  time: string
  status?: MessageStatus
  error?: string | null
}

export interface Conversation {
  id: number
  title: string
  messages: ChatMessage[]
  updatedAt: string
  lastMessage: ChatMessage | null
  messageCount: number
  messagesLoaded: boolean
}

interface ConversationPayload {
  id: number
  title: string
  updatedAt: string
  messages?: ChatMessage[]
  lastMessage?: ChatMessage | null
  messageCount?: number
}

const ACTIVE_CONVERSATION_KEY = 'magent-active-conversation-id'

type ConversationsResponse = { data: ConversationPayload[] }
type ConversationResponse = { data: ConversationPayload }
type ChatStreamResult = {
  title: string
  failed?: boolean
  todoCreated?: { id: number, title: string }
  userMessage: ChatMessage
  assistantMessage: ChatMessage
}
type RetryStreamResult = {
  failed?: boolean
  assistantMessage: ChatMessage
}

function getClientErrorMessage(error: unknown, fallback: string) {
  const fetchError = error as {
    data?: { statusMessage?: string, message?: string }
    statusMessage?: string
    message?: string
  }

  return fetchError.data?.statusMessage
    || fetchError.data?.message
    || fetchError.statusMessage
    || fetchError.message
    || fallback
}

function getClientErrorStatus(error: unknown) {
  const fetchError = error as {
    data?: { statusCode?: number }
    status?: number
    statusCode?: number
  }

  return fetchError.data?.statusCode
    || fetchError.statusCode
    || fetchError.status
    || 0
}

async function readEventStream<T>(response: Response, handlers: {
  onDelta?: (content: string) => void
}) {
  if (!response.ok) {
    const text = await response.text()
    let message = text
    try {
      const data = JSON.parse(text) as { statusMessage?: string, message?: string }
      message = data.statusMessage || data.message || text
    } catch {
      // Keep the raw response text for non-JSON errors.
    }
    throw new Error(message || `请求失败 (${response.status})`)
  }

  if (!response.body) {
    throw new Error('流式响应为空')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: T | null = null

  function consumeBlock(block: string) {
    const lines = block.split(/\r?\n/)
    const eventName = lines
      .find(line => line.startsWith('event:'))
      ?.slice(6)
      .trim() || 'message'
    const data = lines
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())
      .join('\n')
      .trim()

    if (!data) {
      return
    }

    const payload = JSON.parse(data) as {
      content?: string
      message?: string
    }

    if (eventName === 'delta') {
      handlers.onDelta?.(payload.content || '')
      return
    }

    if (eventName === 'result') {
      result = payload as T
      return
    }

    if (eventName === 'error') {
      throw new Error(payload.message || '流式请求失败')
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() || ''
    blocks.forEach(consumeBlock)
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    consumeBlock(buffer)
  }

  if (!result) {
    throw new Error('流式响应未返回最终结果')
  }

  return result
}

function extractConversations(payload: ConversationsResponse | ConversationPayload[] | null | undefined) {
  if (!payload) {
    return undefined
  }

  if (Array.isArray(payload)) {
    return payload
  }

  return payload.data
}

function normalizeConversation(payload: ConversationPayload, existing?: Conversation): Conversation {
  const hasMessages = Array.isArray(payload.messages)
  const messages = hasMessages ? payload.messages! : (existing?.messages ?? [])
  const lastMessage = payload.lastMessage
    ?? (hasMessages ? (messages.at(-1) ?? null) : (existing?.lastMessage ?? messages.at(-1) ?? null))

  return {
    id: payload.id,
    title: payload.title,
    updatedAt: payload.updatedAt,
    messages,
    lastMessage,
    messageCount: payload.messageCount ?? (hasMessages ? messages.length : (existing?.messageCount ?? messages.length)),
    messagesLoaded: hasMessages ? true : (existing?.messagesLoaded ?? false)
  }
}

function syncConversationsFromFetch(
  conversations: Ref<Conversation[]>,
  activeId: Ref<number | null>,
  data: ConversationPayload[] | undefined
) {
  if (!data) {
    return
  }

  const existingById = new Map(conversations.value.map(item => [item.id, item]))
  conversations.value = data.map(item => normalizeConversation(item, existingById.get(item.id)))
  const ids = new Set(conversations.value.map(item => item.id))

  if (import.meta.client) {
    const saved = sessionStorage.getItem(ACTIVE_CONVERSATION_KEY)
    if (saved) {
      const id = Number(saved)
      if (ids.has(id)) {
        activeId.value = id
        return
      }
    }
  }

  if (activeId.value && !ids.has(activeId.value)) {
    activeId.value = conversations.value[0]?.id ?? null
  }

  if (!activeId.value && conversations.value.length > 0) {
    activeId.value = conversations.value[0].id
  }

  if (import.meta.client && activeId.value) {
    sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, String(activeId.value))
  }
}

let clientSyncInitialized = false

export function useConversations() {
  const conversations = useState<Conversation[]>('conversations', () => [])
  const activeId = useState<number | null>('active-conversation-id', () => null)
  const creating = useState('conversation-creating', () => false)
  const deletingId = useState<number | null>('conversation-deleting-id', () => null)
  const sending = useState('chat-sending', () => false)
  const loadingMessagesId = useState<number | null>('conversation-loading-messages-id', () => null)
  const retryingMessageId = useState<number | null>('chat-retrying-message-id', () => null)

  const activeConversation = computed(() =>
    conversations.value.find(item => item.id === activeId.value)
  )

  const {
    data: conversationData,
    pending: loadingConversations,
    status,
    refresh: refreshConversations
  } = useFetch<ConversationsResponse>('/api/conversations', {
    key: 'conversations',
    credentials: 'include',
    server: false
  })

  function syncFromFetchPayload() {
    syncConversationsFromFetch(
      conversations,
      activeId,
      extractConversations(conversationData.value)
    )
  }

  function mergeConversationPayload(payload: ConversationPayload) {
    const index = conversations.value.findIndex(item => item.id === payload.id)
    const existing = index === -1 ? undefined : conversations.value[index]
    const normalized = normalizeConversation(payload, existing)

    if (index === -1) {
      conversations.value.unshift(normalized)
    } else {
      conversations.value[index] = normalized
    }

    return normalized
  }

  async function loadConversationMessages(id: number, force = false) {
    const existing = conversations.value.find(item => item.id === id)
    if (existing?.messagesLoaded && !force) {
      return existing
    }

    if (loadingMessagesId.value === id) {
      return existing
    }

    loadingMessagesId.value = id
    try {
      const { data } = await $fetch<ConversationResponse>(`/api/conversations/${id}`, {
        credentials: 'include'
      })
      return mergeConversationPayload(data)
    } catch (error: unknown) {
      if (getClientErrorStatus(error) === 404) {
        const index = conversations.value.findIndex(item => item.id === id)
        if (index !== -1) {
          conversations.value.splice(index, 1)
        }

        if (activeId.value === id) {
          activeId.value = conversations.value[0]?.id ?? null
          if (import.meta.client) {
            if (activeId.value) {
              sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, String(activeId.value))
            } else {
              sessionStorage.removeItem(ACTIVE_CONVERSATION_KEY)
            }
          }
          if (activeId.value) {
            await loadConversationMessages(activeId.value)
          }
        }

        ElMessage.warning('这个对话已不存在，已切换到可用对话')
      } else {
        ElMessage.error(getClientErrorMessage(error, '加载消息失败'))
      }
      return existing
    } finally {
      if (loadingMessagesId.value === id) {
        loadingMessagesId.value = null
      }
    }
  }

  if (import.meta.client && !clientSyncInitialized) {
    clientSyncInitialized = true

    watch([conversationData, status], () => {
      if (status.value !== 'success') {
        return
      }
      syncFromFetchPayload()
    }, { immediate: true })

    watch(activeId, (id) => {
      if (id) {
        sessionStorage.setItem(ACTIVE_CONVERSATION_KEY, String(id))
      } else {
        sessionStorage.removeItem(ACTIVE_CONVERSATION_KEY)
      }
    })

    onMounted(async () => {
      if (status.value !== 'success' || !extractConversations(conversationData.value)?.length) {
        await refreshConversations()
      }
      syncFromFetchPayload()
      if (activeId.value) {
        await loadConversationMessages(activeId.value)
      }
    })
  }

  function getConversationPreview(conversation: Conversation) {
    const last = conversation.messagesLoaded
      ? (conversation.messages.at(-1) ?? conversation.lastMessage)
      : (conversation.lastMessage ?? conversation.messages.at(-1))

    if (!last) {
      return '暂无消息'
    }

    if (last.status === 'failed') {
      return '回复失败，点击重试'
    }

    if (last.status === 'pending') {
      return '正在生成回复…'
    }

    return last.content || '暂无消息'
  }

  function bumpConversation(conversationId: number) {
    const index = conversations.value.findIndex(item => item.id === conversationId)
    if (index === -1) {
      return
    }

    const [conversation] = conversations.value.splice(index, 1)
    conversation.updatedAt = new Date().toISOString()
    conversations.value.unshift(conversation)
  }

  async function startNewConversation(onReady?: () => void) {
    if (creating.value) {
      return
    }

    creating.value = true
    try {
      const { data } = await $fetch<ConversationResponse>('/api/conversations', {
        method: 'POST',
        credentials: 'include',
        body: { title: '新对话' }
      })

      const conversation = normalizeConversation(data)
      conversations.value.unshift(conversation)
      activeId.value = conversation.id
      onReady?.()
    } catch (error: unknown) {
      const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
      ElMessage.error(fetchError.data?.statusMessage || fetchError.statusMessage || '创建对话失败')
    } finally {
      creating.value = false
    }
  }

  async function switchConversation(id: number, onReady?: () => void) {
    if (sending.value || deletingId.value) {
      return
    }

    activeId.value = id
    await loadConversationMessages(id)
    onReady?.()
  }

  async function deleteConversation(id: number, onReady?: () => void) {
    if (deletingId.value || sending.value) {
      return
    }

    try {
      await ElMessageBox.confirm(
        '删除后无法恢复，确定要删除这个对话吗？',
        '删除对话',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }

    deletingId.value = id
    try {
      await $fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const index = conversations.value.findIndex(item => item.id === id)
      if (index !== -1) {
        conversations.value.splice(index, 1)
      }

      if (activeId.value === id) {
        if (conversations.value.length > 0) {
          activeId.value = conversations.value[0].id
          await loadConversationMessages(activeId.value)
          onReady?.()
        } else {
          activeId.value = null
          await startNewConversation(onReady)
        }
      }

      ElMessage.success('对话已删除')
    } catch (error: unknown) {
      const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
      ElMessage.error(fetchError.data?.statusMessage || fetchError.statusMessage || '删除失败')
    } finally {
      deletingId.value = null
    }
  }

  function applyChatResult(conversationId: number, title: string, userMessage: ChatMessage, assistantMessage: ChatMessage) {
    const conversation = conversations.value.find(item => item.id === conversationId)
    if (!conversation) {
      return
    }

    conversation.title = title
    conversation.messages.push(userMessage, assistantMessage)
    conversation.lastMessage = assistantMessage
    conversation.messageCount += 2
    conversation.updatedAt = new Date().toISOString()
    bumpConversation(conversationId)
  }

  function applyMessageUpdate(conversationId: number, message: ChatMessage) {
    const conversation = conversations.value.find(item => item.id === conversationId)
    if (!conversation) {
      return
    }

    const index = conversation.messages.findIndex(item => item.id === message.id)
    if (index !== -1) {
      conversation.messages[index] = message
    }

    if (conversation.lastMessage?.id === message.id || conversation.messages.at(-1)?.id === message.id) {
      conversation.lastMessage = message
    }

    conversation.updatedAt = new Date().toISOString()
    bumpConversation(conversationId)
  }

  async function ensureActiveConversation() {
    if (loadingConversations.value) {
      await refreshConversations()
      syncFromFetchPayload()
    }

    if (activeConversation.value) {
      await loadConversationMessages(activeConversation.value.id)
      return activeConversation.value
    }

    if (conversations.value.length > 0) {
      activeId.value = conversations.value[0].id
      await loadConversationMessages(activeId.value)
      return activeConversation.value
    }

    await startNewConversation()
    return activeConversation.value
  }

  async function sendMessage(text?: string, onScroll?: () => void) {
    const content = text?.trim()
    if (!content) {
      return
    }

    if (sending.value) {
      return
    }

    const conversation = await ensureActiveConversation()
    if (!conversation) {
      ElMessage.warning('无法创建对话，请稍后重试')
      return
    }

    sending.value = true

    const optimisticId = -Date.now()
    const optimisticUser: ChatMessage = {
      id: optimisticId,
      role: 'user',
      content,
      status: 'pending',
      time: new Date().toISOString()
    }
    conversation.messages.push(optimisticUser)
    const optimisticAssistantId = optimisticId - 1
    const optimisticAssistant: ChatMessage = {
      id: optimisticAssistantId,
      role: 'assistant',
      content: '',
      status: 'pending',
      error: null,
      time: new Date().toISOString()
    }
    conversation.messages.push(optimisticAssistant)
    onScroll?.()

    try {
      const response = await fetch('/api/agent/chat-stream', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: content,
          conversationId: conversation.id
        })
      })
      const result = await readEventStream<ChatStreamResult>(response, {
        onDelta: (delta) => {
          const assistant = conversation.messages.find(item => item.id === optimisticAssistantId)
          if (assistant) {
            assistant.content += delta
          }
          onScroll?.()
        }
      })

      if (result.todoCreated) {
        await refreshNuxtData('todos')
      }

      conversation.messages = conversation.messages.filter(item =>
        item.id !== optimisticId && item.id !== optimisticAssistantId
      )

      applyChatResult(conversation.id, result.title, result.userMessage, result.assistantMessage)
      if (result.failed) {
        ElMessage.warning(result.assistantMessage.error || 'AI 回复失败，可点击重试')
      }
      onScroll?.()
    } catch (error: unknown) {
      conversation.messages = conversation.messages.filter(item =>
        item.id !== optimisticId && item.id !== optimisticAssistantId
      )

      ElMessage.error(getClientErrorMessage(error, '发送失败'))
      throw error
    } finally {
      sending.value = false
    }
  }

  async function retryMessage(messageId: number, onScroll?: () => void) {
    if (retryingMessageId.value || sending.value) {
      return
    }

    const conversation = activeConversation.value
    const message = conversation?.messages.find(item => item.id === messageId)
    if (!conversation || !message || message.role !== 'assistant' || message.status !== 'failed') {
      return
    }

    retryingMessageId.value = messageId
    const previous = { ...message }
    message.status = 'pending'
    message.error = null
    message.content = ''
    onScroll?.()

    try {
      const response = await fetch(`/api/messages/${messageId}/retry-stream`, {
        method: 'POST',
        credentials: 'include'
      })
      const result = await readEventStream<RetryStreamResult>(response, {
        onDelta: (delta) => {
          message.content += delta
          onScroll?.()
        }
      })

      applyMessageUpdate(conversation.id, result.assistantMessage)
      if (result.failed) {
        ElMessage.warning(result.assistantMessage.error || '重试失败，请稍后再试')
      }
      onScroll?.()
    } catch (error: unknown) {
      applyMessageUpdate(conversation.id, previous)
      ElMessage.error(getClientErrorMessage(error, '重试失败'))
    } finally {
      retryingMessageId.value = null
    }
  }

  const canSend = computed(() =>
    !sending.value && !loadingConversations.value && !loadingMessagesId.value && !creating.value
  )

  return {
    conversations,
    activeId,
    activeConversation,
    creating,
    deletingId,
    sending,
    retryingMessageId,
    loadingConversations,
    loadingMessagesId,
    refreshConversations,
    loadConversationMessages,
    getConversationPreview,
    startNewConversation,
    switchConversation,
    deleteConversation,
    applyChatResult,
    sendMessage,
    retryMessage,
    canSend
  }
}
