import { useDb } from './db'
import { nowLocal } from './time'

export interface DbMessage {
  id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  status: 'pending' | 'completed' | 'failed'
  error: string | null
  created_at: string
}

export interface DbConversation {
  id: number
  user_id: number
  title: string
  created_at: string
  updated_at: string
}

export interface DbConversationSummary extends DbConversation {
  message_count: number
  last_message_id: number | null
  last_message_role: 'user' | 'assistant' | null
  last_message_content: string | null
  last_message_status: DbMessage['status'] | null
  last_message_error: string | null
  last_message_created_at: string | null
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
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed')),
      error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `)

  migrateMessageStatusColumns()
}

function migrateMessageStatusColumns() {
  const db = useDb()
  const columns = db.prepare('PRAGMA table_info(messages)').all() as Array<{ name: string }>
  const names = new Set(columns.map(column => column.name))

  if (!names.has('status')) {
    db.prepare(`ALTER TABLE messages ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'`).run()
  }

  if (!names.has('error')) {
    db.prepare(`ALTER TABLE messages ADD COLUMN error TEXT`).run()
  }
}

function selectMessageById(id: number) {
  return useDb()
    .prepare(`
      SELECT id, conversation_id, role, content, status, error, created_at
      FROM messages
      WHERE id = ?
    `)
    .get(id) as DbMessage | undefined
}

export function listConversationSummaries(userId: number) {
  return useDb()
    .prepare(`
      SELECT
        c.id,
        c.user_id,
        c.title,
        c.created_at,
        c.updated_at,
        (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = c.id
        ) AS message_count,
        (
          SELECT m.id
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.id DESC
          LIMIT 1
        ) AS last_message_id,
        (
          SELECT m.role
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.id DESC
          LIMIT 1
        ) AS last_message_role,
        (
          SELECT m.content
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.id DESC
          LIMIT 1
        ) AS last_message_content,
        (
          SELECT m.status
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.id DESC
          LIMIT 1
        ) AS last_message_status,
        (
          SELECT m.error
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.id DESC
          LIMIT 1
        ) AS last_message_error,
        (
          SELECT m.created_at
          FROM messages m
          WHERE m.conversation_id = c.id
          ORDER BY m.id DESC
          LIMIT 1
        ) AS last_message_created_at
      FROM conversations c
      WHERE c.user_id = ?
      ORDER BY c.updated_at DESC
    `)
    .all(userId) as DbConversationSummary[]
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

  return conversations.map((conversation) => ({
    ...conversation,
    messages: listConversationMessages(conversation.id)
  }))
}

export function listConversationMessages(conversationId: number) {
  return useDb()
    .prepare(`
      SELECT id, conversation_id, role, content, status, error, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY id ASC
    `)
    .all(conversationId) as DbMessage[]
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

  const messages = listConversationMessages(conversationId)

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
  content: string,
  status: DbMessage['status'] = 'completed',
  error: string | null = null
): DbMessage {
  const timestamp = nowLocal()
  const result = useDb()
    .prepare(`
      INSERT INTO messages (conversation_id, role, content, status, error, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    .run(conversationId, role, content.trim(), status, error, timestamp)

  useDb()
    .prepare(`UPDATE conversations SET updated_at = ? WHERE id = ?`)
    .run(timestamp, conversationId)

  return selectMessageById(Number(result.lastInsertRowid))!
}

export function addChatExchange(options: {
  conversationId: number
  userContent: string
  assistantContent: string
  assistantStatus?: DbMessage['status']
  assistantError?: string | null
  title?: string
}) {
  const timestamp = nowLocal()
  const db = useDb()

  const insertMessage = db.prepare(`
    INSERT INTO messages (conversation_id, role, content, status, error, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const getMessage = db.prepare(`
    SELECT id, conversation_id, role, content, status, error, created_at
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
      'completed',
      null,
      timestamp
    )
    const assistantResult = insertMessage.run(
      options.conversationId,
      'assistant',
      options.assistantContent.trim(),
      options.assistantStatus ?? 'completed',
      options.assistantError ?? null,
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

export function getCompletedMessagesForModel(conversationId: number, beforeMessageId?: number) {
  const params: Array<number> = [conversationId]
  let beforeClause = ''

  if (beforeMessageId !== undefined) {
    beforeClause = 'AND id < ?'
    params.push(beforeMessageId)
  }

  return useDb()
    .prepare(`
      SELECT id, conversation_id, role, content, status, error, created_at
      FROM messages
      WHERE conversation_id = ?
        AND status = 'completed'
        AND content != ''
        ${beforeClause}
      ORDER BY id ASC
    `)
    .all(...params) as DbMessage[]
}

export function getFailedAssistantMessageForUser(userId: number, messageId: number) {
  return useDb()
    .prepare(`
      SELECT m.id, m.conversation_id, m.role, m.content, m.status, m.error, m.created_at
      FROM messages m
      INNER JOIN conversations c ON c.id = m.conversation_id
      WHERE m.id = ?
        AND c.user_id = ?
        AND m.role = 'assistant'
        AND m.status = 'failed'
    `)
    .get(messageId, userId) as DbMessage | undefined
}

export function getPreviousUserMessage(conversationId: number, beforeMessageId: number) {
  return useDb()
    .prepare(`
      SELECT id, conversation_id, role, content, status, error, created_at
      FROM messages
      WHERE conversation_id = ?
        AND role = 'user'
        AND id < ?
      ORDER BY id DESC
      LIMIT 1
    `)
    .get(conversationId, beforeMessageId) as DbMessage | undefined
}

export function updateAssistantMessageResult(options: {
  messageId: number
  conversationId: number
  content: string
  status: DbMessage['status']
  error?: string | null
}) {
  const timestamp = nowLocal()
  const db = useDb()

  db.prepare(`
    UPDATE messages
    SET content = ?, status = ?, error = ?
    WHERE id = ? AND conversation_id = ? AND role = 'assistant'
  `).run(
    options.content.trim(),
    options.status,
    options.error ?? null,
    options.messageId,
    options.conversationId
  )

  db.prepare(`
    UPDATE conversations
    SET updated_at = ?
    WHERE id = ?
  `).run(timestamp, options.conversationId)

  return selectMessageById(options.messageId)!
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
