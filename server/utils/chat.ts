import { useDb } from './db'
import { nowLocal } from './time'

export interface DbMessage {
  id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface DbConversation {
  id: number
  user_id: number
  title: string
  created_at: string
  updated_at: string
}

const WELCOME_MESSAGE = '你好，我是 mAgent 助手。可以帮你了解项目、解答技术问题，或在「待办」中管理任务。你也可以说「添加待办：买牛奶」。'

export const MAX_MODEL_HISTORY_MESSAGES = 20

export function buildModelHistory(
  messages: Array<{ role: 'user' | 'assistant', content: string }>,
  maxMessages = MAX_MODEL_HISTORY_MESSAGES
) {
  return messages.slice(-maxMessages).map(item => ({
    role: item.role,
    content: item.content
  }))
}

export function initChatSchema() {
  useDb().exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL DEFAULT '新对话',
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `)
}

export function listConversationsWithMessages(userId: number) {
  const conversations = useDb()
    .prepare(`
      SELECT id, user_id, title, created_at, updated_at
      FROM conversations
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `)
    .all(userId) as DbConversation[]

  const getMessages = useDb().prepare(`
    SELECT id, conversation_id, role, content, created_at
    FROM messages
    WHERE conversation_id = ?
    ORDER BY id ASC
  `)

  return conversations.map((conversation) => ({
    ...conversation,
    messages: getMessages.all(conversation.id) as DbMessage[]
  }))
}

export function getConversationForUser(userId: number, conversationId: number) {
  const conversation = useDb()
    .prepare(`
      SELECT id, user_id, title, created_at, updated_at
      FROM conversations
      WHERE id = ? AND user_id = ?
    `)
    .get(conversationId, userId) as DbConversation | undefined

  if (!conversation) {
    return null
  }

  const messages = useDb()
    .prepare(`
      SELECT id, conversation_id, role, content, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY id ASC
    `)
    .all(conversationId) as DbMessage[]

  return { ...conversation, messages }
}

export function createConversation(userId: number, title = '新对话') {
  const timestamp = nowLocal()
  const result = useDb()
    .prepare(`
      INSERT INTO conversations (user_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `)
    .run(userId, title, timestamp, timestamp)

  const conversationId = Number(result.lastInsertRowid)
  addMessage(conversationId, 'assistant', WELCOME_MESSAGE)

  return getConversationForUser(userId, conversationId)!
}

export function addMessage(
  conversationId: number,
  role: 'user' | 'assistant',
  content: string
): DbMessage {
  const timestamp = nowLocal()
  const result = useDb()
    .prepare(`
      INSERT INTO messages (conversation_id, role, content, created_at)
      VALUES (?, ?, ?, ?)
    `)
    .run(conversationId, role, content.trim(), timestamp)

  useDb()
    .prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`)
    .run(timestamp, conversationId)

  return useDb()
    .prepare(`
      SELECT id, conversation_id, role, content, created_at
      FROM messages
      WHERE id = ?
    `)
    .get(result.lastInsertRowid) as DbMessage
}

export function addChatExchange(options: {
  conversationId: number
  userContent: string
  assistantContent: string
  title?: string
}) {
  const timestamp = nowLocal()
  const db = useDb()

  const insertMessage = db.prepare(`
    INSERT INTO messages (conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?)
  `)

  const getMessage = db.prepare(`
    SELECT id, conversation_id, role, content, created_at
    FROM messages
    WHERE id = ?
  `)

  const updateConversationTime = db.prepare(`
    UPDATE conversations
    SET updated_at = ?
    WHERE id = ?
  `)

  const updateConversationTitle = db.prepare(`
    UPDATE conversations
    SET title = ?, updated_at = ?
    WHERE id = ?
  `)

  const saveExchange = db.transaction(() => {
    const userResult = insertMessage.run(
      options.conversationId,
      'user',
      options.userContent.trim(),
      timestamp
    )
    const assistantResult = insertMessage.run(
      options.conversationId,
      'assistant',
      options.assistantContent.trim(),
      timestamp
    )

    if (options.title !== undefined) {
      updateConversationTitle.run(options.title, timestamp, options.conversationId)
    } else {
      updateConversationTime.run(timestamp, options.conversationId)
    }

    return {
      userMessage: getMessage.get(userResult.lastInsertRowid) as DbMessage,
      assistantMessage: getMessage.get(assistantResult.lastInsertRowid) as DbMessage
    }
  })

  return saveExchange()
}

export function updateConversationTitle(conversationId: number, title: string) {
  useDb()
    .prepare(`
      UPDATE conversations
      SET title = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(title, nowLocal(), conversationId)
}

export function shouldAutoRenameTitle(title: string) {
  return title === '新对话' || title === '默认对话' || /^对话 \d+$/.test(title)
}

export function deleteConversationForUser(userId: number, conversationId: number) {
  const result = useDb()
    .prepare(`
      DELETE FROM conversations
      WHERE id = ? AND user_id = ?
    `)
    .run(conversationId, userId)

  return result.changes > 0
}
