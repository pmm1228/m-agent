import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { hashPassword } from './password'
import { initChatSchema } from './chat'
import { initTodosSchema } from './todos'

export interface User {
  id: number
  username: string
  created_at: string
}

let db: Database.Database | null = null

function getDbPath() {
  return join(process.cwd(), '.data', 'magent.db')
}

function shouldSeedDefaultUser() {
  const explicit = process.env.NUXT_SEED_DEMO_USER?.toLowerCase()
  if (explicit === 'true' || explicit === '1') {
    return true
  }
  if (explicit === 'false' || explicit === '0') {
    return false
  }

  return process.env.NODE_ENV !== 'production'
}

function seedDefaultUser(database: Database.Database) {
  if (!shouldSeedDefaultUser()) {
    return
  }

  const count = database.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }
  if (count.count > 0) {
    return
  }

  database.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(
    'admin',
    hashPassword('123456')
  )
}

function initSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  seedDefaultUser(database)
  initTodosSchema()
  initChatSchema()
  migrateLegacyDemoDb(database)
}

function migrateLegacyDemoDb(database: Database.Database) {
  const legacyPath = join(process.cwd(), '.data', 'demo.db')
  if (!existsSync(legacyPath)) {
    return
  }

  const legacy = new Database(legacyPath, { readonly: true })
  try {
    const legacyConversations = legacy.prepare(`
      SELECT id, user_id, title, created_at, updated_at
      FROM conversations
      ORDER BY id ASC
    `).all() as Array<{
      id: number
      user_id: number
      title: string
      created_at: string
      updated_at: string
    }>

    if (legacyConversations.length === 0) {
      return
    }

    const countLegacyMessages = legacy.prepare(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE conversation_id = ?
    `)

    const getLegacyMessages = legacy.prepare(`
      SELECT role, content, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY id ASC
    `)

    const findImportedConversation = database.prepare(`
      SELECT c.id
      FROM conversations c
      WHERE c.title = ?
        AND (
          SELECT COUNT(*)
          FROM messages m
          WHERE m.conversation_id = c.id
        ) = ?
    `)

    const insertConversation = database.prepare(`
      INSERT INTO conversations (user_id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `)

    const insertMessage = database.prepare(`
      INSERT INTO messages (conversation_id, role, content, created_at)
      VALUES (?, ?, ?, ?)
    `)

    let imported = 0

    const migrate = database.transaction(() => {
      for (const conversation of legacyConversations) {
        const { count: messageCount } = countLegacyMessages.get(conversation.id) as { count: number }
        if (messageCount <= 1) {
          continue
        }

        if (findImportedConversation.get(conversation.title, messageCount)) {
          continue
        }

        const result = insertConversation.run(
          conversation.user_id,
          conversation.title,
          conversation.created_at,
          conversation.updated_at
        )

        const newConversationId = Number(result.lastInsertRowid)
        const messages = getLegacyMessages.all(conversation.id) as Array<{
          role: 'user' | 'assistant'
          content: string
          created_at: string
        }>

        for (const message of messages) {
          insertMessage.run(
            newConversationId,
            message.role,
            message.content,
            message.created_at
          )
        }

        imported++
      }
    })

    migrate()

    if (imported > 0) {
      console.info(`[mAgent] 已从 demo.db 补迁移 ${imported} 条历史对话`)
    }
  } finally {
    legacy.close()
  }
}

export function useDb() {
  if (!db) {
    const dbPath = getDbPath()
    mkdirSync(dirname(dbPath), { recursive: true })
    db = new Database(dbPath)
    db.pragma('journal_mode = WAL')
    initSchema(db)
  }

  return db
}

export function findUserByUsername(username: string) {
  return useDb()
    .prepare('SELECT id, username, password, created_at FROM users WHERE username = ?')
    .get(username.trim()) as (User & { password: string }) | undefined
}

export function findUserById(id: number): User | undefined {
  return useDb()
    .prepare('SELECT id, username, created_at FROM users WHERE id = ?')
    .get(id) as User | undefined
}
