export interface ChatMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  time: string
}

export interface Conversation {
  id: number
  title: string
  messages: ChatMessage[]
  updatedAt: string
}

const ACTIVE_CONVERSATION_KEY = 'magent-active-conversation-id'

type ConversationsResponse = { data: Conversation[] }

function extractConversations(payload: ConversationsResponse | Conversation[] | null | undefined) {
  if (!payload) {
    return undefined
  }

  if (Array.isArray(payload)) {
    return payload
  }

  return payload.data
}

function syncConversationsFromFetch(
  conversations: Ref<Conversation[]>,
  activeId: Ref<number | null>,
  data: Conversation[] | undefined
) {
  if (!data) {
    return
  }

  conversations.value = data
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
    })
  }

  function getConversationPreview(conversation: Conversation) {
    const last = conversation.messages.at(-1)
    return last?.content ?? '暂无消息'
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
      const { data } = await $fetch<{ data: Conversation }>('/api/conversations', {
        method: 'POST',
        credentials: 'include',
        body: { title: '新对话' }
      })

      conversations.value.unshift(data)
      activeId.value = data.id
      onReady?.()
    } catch (error: unknown) {
      const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
      ElMessage.error(fetchError.data?.statusMessage || fetchError.statusMessage || '创建对话失败')
    } finally {
      creating.value = false
    }
  }

  function switchConversation(id: number, onReady?: () => void) {
    if (activeId.value === id || sending.value || deletingId.value) {
      return
    }
    activeId.value = id
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
    conversation.updatedAt = new Date().toISOString()
    bumpConversation(conversationId)
  }

  async function ensureActiveConversation() {
    if (loadingConversations.value) {
      await refreshConversations()
      syncFromFetchPayload()
    }

    if (activeConversation.value) {
      return activeConversation.value
    }

    if (conversations.value.length > 0) {
      activeId.value = conversations.value[0].id
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
      time: new Date().toISOString()
    }
    conversation.messages.push(optimisticUser)
    onScroll?.()

    try {
      const result = await $fetch<{
        title: string
        todoCreated?: { id: number, title: string }
        userMessage: ChatMessage
        assistantMessage: ChatMessage
      }>('/api/agent/chat', {
        method: 'POST',
        credentials: 'include',
        body: {
          message: content,
          conversationId: conversation.id
        }
      })

      if (result.todoCreated) {
        await refreshNuxtData('todos')
      }

      const optimisticIndex = conversation.messages.findIndex(item => item.id === optimisticId)
      if (optimisticIndex !== -1) {
        conversation.messages.splice(optimisticIndex, 1)
      }

      applyChatResult(conversation.id, result.title, result.userMessage, result.assistantMessage)
      onScroll?.()
    } catch (error: unknown) {
      const optimisticIndex = conversation.messages.findIndex(item => item.id === optimisticId)
      if (optimisticIndex !== -1) {
        conversation.messages.splice(optimisticIndex, 1)
      }

      const fetchError = error as { data?: { statusMessage?: string }, statusMessage?: string }
      ElMessage.error(fetchError.data?.statusMessage || fetchError.statusMessage || '发送失败')
      throw error
    } finally {
      sending.value = false
    }
  }

  const canSend = computed(() =>
    !sending.value && !loadingConversations.value && !creating.value
  )

  return {
    conversations,
    activeId,
    activeConversation,
    creating,
    deletingId,
    sending,
    loadingConversations,
    refreshConversations,
    getConversationPreview,
    startNewConversation,
    switchConversation,
    deleteConversation,
    applyChatResult,
    sendMessage,
    canSend
  }
}
