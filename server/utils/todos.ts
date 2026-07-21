import { useDb } from './db'
import { nowLocal } from './time'

export interface Todo {
  id: number
  user_id: number
  title: string
  done: number
  created_at: string
}

export function initTodosSchema() {
  const db = useDb()
  const table = db
    .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'todos'`)
    .get() as { name: string } | undefined

  if (!table) {
    db.exec(`
      CREATE TABLE todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `)
    return
  }

  const columns = db.prepare(`PRAGMA table_info(todos)`).all() as Array<{ name: string }>
  if (!columns.some(column => column.name === 'user_id')) {
    db.exec(`ALTER TABLE todos ADD COLUMN user_id INTEGER REFERENCES users(id)`)
    const user = db.prepare(`SELECT id FROM users ORDER BY id LIMIT 1`).get() as { id: number } | undefined
    if (user) {
      db.prepare(`UPDATE todos SET user_id = ? WHERE user_id IS NULL`).run(user.id)
    }
  }
}

export function listTodosForUser(userId: number): Todo[] {
  return useDb()
    .prepare(`
      SELECT id, user_id, title, done, created_at
      FROM todos
      WHERE user_id = ?
      ORDER BY done ASC, id DESC
    `)
    .all(userId) as Todo[]
}

export function createTodoForUser(userId: number, title: string): Todo {
  const timestamp = nowLocal()
  const result = useDb()
    .prepare(`
      INSERT INTO todos (user_id, title, created_at)
      VALUES (?, ?, ?)
    `)
    .run(userId, title.trim(), timestamp)

  return getTodoForUser(userId, Number(result.lastInsertRowid))!
}

export function getTodoForUser(userId: number, todoId: number): Todo | undefined {
  return useDb()
    .prepare(`
      SELECT id, user_id, title, done, created_at
      FROM todos
      WHERE id = ? AND user_id = ?
    `)
    .get(todoId, userId) as Todo | undefined
}

export function updateTodoForUser(
  userId: number,
  todoId: number,
  patch: { title?: string, done?: boolean }
): Todo | null {
  const todo = getTodoForUser(userId, todoId)
  if (!todo) {
    return null
  }

  const title = patch.title !== undefined ? patch.title.trim() : todo.title
  const done = patch.done !== undefined ? (patch.done ? 1 : 0) : todo.done

  if (!title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'title 不能为空'
    })
  }

  useDb()
    .prepare(`
      UPDATE todos
      SET title = ?, done = ?
      WHERE id = ? AND user_id = ?
    `)
    .run(title, done, todoId, userId)

  return getTodoForUser(userId, todoId)!
}

export function deleteTodoForUser(userId: number, todoId: number): boolean {
  const result = useDb()
    .prepare(`DELETE FROM todos WHERE id = ? AND user_id = ?`)
    .run(todoId, userId)

  return result.changes > 0
}

export function formatTodosForPrompt(userId: number) {
  const todos = listTodosForUser(userId)
  if (todos.length === 0) {
    return '用户当前没有待办事项。'
  }

  const lines = todos.map(todo => `- [${todo.done ? 'x' : ' '}] ${todo.title}`)
  return `用户当前待办（共 ${todos.length} 条）：\n${lines.join('\n')}`
}

export function tryParseTodoCommand(message: string) {
  const trimmed = message.trim()
  const patterns = [
    /^(?:请|帮我|帮忙)?(?:把|将)?[「"'](.+?)[」"']?(?:加入|加到|添加到|写进)(?:待办|todo|任务)$/i,
    /^(?:请|帮我|帮忙)?(?:把|将)(.+?)(?:加入|加到|添加到|写进)(?:待办|todo|任务)$/i,
    /^(?:请|帮我|帮忙)?(?:添加|创建|新建)(?:一条|一个)?待办[：:\s]+(.+)$/i
  ]

  for (const pattern of patterns) {
    const match = trimmed.match(pattern)
    const title = match?.[1]?.trim()
    if (title) {
      return { action: 'create' as const, title }
    }
  }

  return null
}
