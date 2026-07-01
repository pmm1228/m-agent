const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

const SYSTEM_PROMPT = `你是 mAgent 中的 AI 助手。请用简洁、准确的中文回答用户问题。

项目信息（回答「介绍一下 mAgent」「数据库怎么用」等问题时参考）：
- mAgent：基于 Nuxt 4 + Vue 3 的 AI 对话与待办助手
- 数据库：SQLite，文件位于 .data/magent.db，使用 better-sqlite3
- 主要表：users（用户）、conversations / messages（对话）、todos（待办，按 user_id 隔离）
- AI：智谱 GLM 模型；对话历史持久化，发给模型时取最近 20 条
- 待办：可在「待办」页管理；用户明确要求添加待办时系统会自动创建，你只需确认结果`

interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ZhipuResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

export async function chatWithZhipu(options: {
  apiKey: string
  model: string
  messages: ChatMessageInput[]
  extraSystemContext?: string
}) {
  const systemContent = options.extraSystemContext
    ? `${SYSTEM_PROMPT}\n\n${options.extraSystemContext}`
    : SYSTEM_PROMPT

  const response = await fetch(ZHIPU_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        { role: 'system', content: systemContent },
        ...options.messages
      ],
      temperature: 0.7
    })
  })

  const data = await response.json() as ZhipuResponse

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: data.error?.message || `智谱 AI 请求失败 (${response.status})`
    })
  }

  const reply = data.choices?.[0]?.message?.content?.trim()
  if (!reply) {
    throw createError({
      statusCode: 502,
      statusMessage: '智谱 AI 返回内容为空'
    })
  }

  return reply
}
