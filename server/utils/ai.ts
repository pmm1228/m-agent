import { AI_REQUEST_TIMEOUT_MS } from './limits'

const ZHIPU_API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
const DOUBAO_RESPONSES_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses'

const SYSTEM_PROMPT = `你是 mAgent 中的 AI 助手。请用简洁、准确的中文回答用户问题。

项目信息（回答「介绍一下 mAgent」「数据库怎么用」等问题时参考）：
- mAgent：基于 Nuxt 4 + Vue 3 的 AI 对话与待办助手
- 数据库：SQLite，文件位于 .data/magent.db，使用 better-sqlite3
- 主要表：users（用户）、conversations / messages（对话）、todos（待办，按 user_id 隔离）
- AI：支持智谱 GLM 与火山方舟豆包模型；对话历史持久化，发给模型时取最近 20 条
- 待办：可在「待办」页管理；用户明确要求添加待办时系统会自动创建，你只需确认结果

当用户询问“你是豆包吗”“当前用的什么模型”“接入的是谁”等底层模型或接入方问题时，应基于下面提供的当前运行配置回答，不要只按助手名称否认。`

type AiProvider = 'zhipu' | 'doubao'

interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
  error?: {
    message?: string
  }
}

interface ResponsesApiResponse {
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{
      type?: string
      text?: string
    }>
  }>
  error?: {
    message?: string
  }
  message?: string
}

type StreamDeltaHandler = (delta: string) => void | Promise<void>

interface ChatModelOptions {
  provider: string
  zhipuApiKey: string
  zhipuModel: string
  doubaoApiKey: string
  doubaoModel: string
  doubaoBaseUrl: string
  doubaoResponsesUrl: string
  doubaoWebSearch: boolean
  messages: ChatMessageInput[]
  extraSystemContext?: string
}

interface PreparedAiRequest {
  providerConfig: ReturnType<typeof getProviderConfig>
  messages: ChatMessageInput[]
  webSearchEnabled: boolean
}

function normalizeProvider(provider: string): AiProvider {
  const normalized = provider.trim().toLowerCase()

  if (['doubao', 'volcengine', 'volc', 'ark'].includes(normalized)) {
    return 'doubao'
  }

  return 'zhipu'
}

function getProviderConfig(options: ChatModelOptions) {
  const provider = normalizeProvider(options.provider)

  if (provider === 'doubao') {
    return {
      apiKey: options.doubaoApiKey,
      apiKeyEnv: 'NUXT_DOUBAO_API_KEY',
      apiUrl: options.doubaoBaseUrl || DOUBAO_API_URL,
      responsesUrl: options.doubaoResponsesUrl || DOUBAO_RESPONSES_API_URL,
      displayName: '火山方舟豆包',
      model: options.doubaoModel,
      provider,
      webSearch: options.doubaoWebSearch
    }
  }

  return {
    apiKey: options.zhipuApiKey,
    apiKeyEnv: 'NUXT_ZHIPU_API_KEY',
    apiUrl: ZHIPU_API_URL,
    responsesUrl: '',
    displayName: '智谱 AI',
    model: options.zhipuModel,
    provider,
    webSearch: false
  }
}

async function parseChatResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return await response.json() as ChatCompletionResponse
  }

  const text = await response.text()
  return {
    error: {
      message: text
    }
  } satisfies ChatCompletionResponse
}

async function parseResponsesApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return await response.json() as ResponsesApiResponse
  }

  const text = await response.text()
  return {
    error: {
      message: text
    }
  } satisfies ResponsesApiResponse
}

function getResponsesOutputText(data: ResponsesApiResponse) {
  const directText = data.output_text?.trim()
  if (directText) {
    return directText
  }

  return data.output
    ?.flatMap(item => item.content || [])
    .map(item => item.text?.trim() || '')
    .filter(Boolean)
    .join('\n')
    .trim() || ''
}

function getErrorMessageFromPayload(data: ChatCompletionResponse | ResponsesApiResponse) {
  return data.error?.message || ('message' in data ? data.message : '') || ''
}

function getWebSearchActivationError(errorMessage: string) {
  if (
    errorMessage.includes('not activated web search')
    || errorMessage.includes('CC_content_plugin')
  ) {
    return '火山方舟账号尚未开通联网搜索内容插件。请先在火山控制台开通 web_search / 内容插件；开通前可将 NUXT_DOUBAO_WEB_SEARCH 设为 false 使用普通豆包对话。'
  }

  return ''
}

function extractStreamDelta(data: unknown, hasText: boolean) {
  const chunk = data as {
    choices?: Array<{
      delta?: {
        content?: string
      }
    }>
    type?: string
    delta?: string
    response?: {
      output_text?: string
    }
  }

  const chatDelta = chunk.choices
    ?.map(choice => choice.delta?.content || '')
    .join('') || ''
  if (chatDelta) {
    return chatDelta
  }

  if (chunk.type === 'response.output_text.delta' && chunk.delta) {
    return chunk.delta
  }

  if (!hasText && chunk.type === 'response.completed' && chunk.response?.output_text) {
    return chunk.response.output_text
  }

  return ''
}

async function readSseTextStream(response: Response, onDelta: StreamDeltaHandler) {
  if (!response.body) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 流式响应为空'
    })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''

  async function consumeBlock(block: string) {
    const dataLines = block
      .split(/\r?\n/)
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice(5).trimStart())

    if (dataLines.length === 0) {
      return
    }

    const payload = dataLines.join('\n').trim()
    if (!payload || payload === '[DONE]') {
      return
    }

    let data: unknown
    try {
      data = JSON.parse(payload)
    } catch {
      return
    }

    const errorMessage = getErrorMessageFromPayload(data as ChatCompletionResponse | ResponsesApiResponse)
    if (errorMessage) {
      throw createError({
        statusCode: 502,
        statusMessage: getWebSearchActivationError(errorMessage) || errorMessage
      })
    }

    const delta = extractStreamDelta(data, Boolean(content))
    if (!delta) {
      return
    }

    content += delta
    await onDelta(delta)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const blocks = buffer.split(/\r?\n\r?\n/)
    buffer = blocks.pop() || ''

    for (const block of blocks) {
      await consumeBlock(block)
    }
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    await consumeBlock(buffer)
  }

  if (!content.trim()) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI 流式返回内容为空'
    })
  }

  return content
}

async function requestChatCompletions(options: {
  apiKey: string
  apiUrl: string
  displayName: string
  model: string
  messages: ChatMessageInput[]
  signal: AbortSignal
  disableThinking?: boolean
}) {
  const response = await fetch(options.apiUrl, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: 0.7,
      ...(options.disableThinking ? { thinking: { type: 'disabled' } } : {})
    })
  })

  const data = await parseChatResponse(response)

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: data.error?.message || `${options.displayName}请求失败 (${response.status})`
    })
  }

  const reply = data.choices?.[0]?.message?.content?.trim()
  if (!reply) {
    throw createError({
      statusCode: 502,
      statusMessage: `${options.displayName}返回内容为空`
    })
  }

  return reply
}

async function streamChatCompletions(options: {
  apiKey: string
  apiUrl: string
  displayName: string
  model: string
  messages: ChatMessageInput[]
  signal: AbortSignal
  onDelta: StreamDeltaHandler
  disableThinking?: boolean
}) {
  const response = await fetch(options.apiUrl, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      temperature: 0.7,
      ...(options.disableThinking ? { thinking: { type: 'disabled' } } : {}),
      stream: true
    })
  })

  if (!response.ok) {
    const data = await parseChatResponse(response)
    throw createError({
      statusCode: response.status,
      statusMessage: data.error?.message || `${options.displayName}流式请求失败 (${response.status})`
    })
  }

  return await readSseTextStream(response, options.onDelta)
}

async function requestResponsesWithWebSearch(options: {
  apiKey: string
  apiUrl: string
  displayName: string
  model: string
  messages: ChatMessageInput[]
  signal: AbortSignal
}) {
  const response = await fetch(options.apiUrl, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      input: options.messages,
      tools: [{ type: 'web_search' }],
      temperature: 0.7
    })
  })

  const data = await parseResponsesApiResponse(response)

  if (!response.ok) {
    const errorMessage = data.error?.message || data.message || ''
    if (
      errorMessage.includes('not activated web search')
      || errorMessage.includes('CC_content_plugin')
    ) {
      throw createError({
        statusCode: 503,
        statusMessage: '火山方舟账号尚未开通联网搜索内容插件。请先在火山控制台开通 web_search / 内容插件；开通前可将 NUXT_DOUBAO_WEB_SEARCH 设为 false 使用普通豆包对话。'
      })
    }

    throw createError({
      statusCode: response.status,
      statusMessage: errorMessage || `${options.displayName}联网搜索请求失败 (${response.status})`
    })
  }

  const reply = getResponsesOutputText(data)
  if (!reply) {
    throw createError({
      statusCode: 502,
      statusMessage: `${options.displayName}联网搜索返回内容为空`
    })
  }

  return reply
}

async function streamResponsesWithWebSearch(options: {
  apiKey: string
  apiUrl: string
  displayName: string
  model: string
  messages: ChatMessageInput[]
  signal: AbortSignal
  onDelta: StreamDeltaHandler
}) {
  const response = await fetch(options.apiUrl, {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`
    },
    body: JSON.stringify({
      model: options.model,
      input: options.messages,
      tools: [{ type: 'web_search' }],
      temperature: 0.7,
      stream: true
    })
  })

  if (!response.ok) {
    const data = await parseResponsesApiResponse(response)
    const errorMessage = getErrorMessageFromPayload(data)
    throw createError({
      statusCode: response.status,
      statusMessage: getWebSearchActivationError(errorMessage) || errorMessage || `${options.displayName}联网搜索流式请求失败 (${response.status})`
    })
  }

  return await readSseTextStream(response, options.onDelta)
}

function prepareAiRequest(options: ChatModelOptions): PreparedAiRequest {
  const providerConfig = getProviderConfig(options)

  if (!providerConfig.apiKey) {
    throw createError({
      statusCode: 503,
      statusMessage: `未配置${providerConfig.displayName} API Key，请在 .env 中设置 ${providerConfig.apiKeyEnv}`
    })
  }

  if (!providerConfig.model) {
    throw createError({
      statusCode: 503,
      statusMessage: `未配置${providerConfig.displayName}模型，请在 .env 中设置对应模型名称`
    })
  }

  const webSearchEnabled = providerConfig.provider === 'doubao' && providerConfig.webSearch
  const runtimeContext = `当前运行配置：
- 当前大模型接入方：${providerConfig.displayName}
- 当前模型/接入点：${providerConfig.model}
- 当前联网搜索能力：${webSearchEnabled
  ? '已启用；本服务使用 Responses 接口并配置 web_search 工具。遇到实时资讯、外部未知信息或需要最新资料的问题时，可以主动联网搜索后再回答。'
  : '未启用；本服务使用普通 Chat Completions 对话接口，未配置 web_search 工具。遇到实时资讯、外部未知信息或需要最新资料的问题时，应明确说明无法直接联网搜索，不要假装已搜索。'}`
  const systemContent = options.extraSystemContext
    ? `${SYSTEM_PROMPT}\n\n${runtimeContext}\n\n${options.extraSystemContext}`
    : `${SYSTEM_PROMPT}\n\n${runtimeContext}`
  const messages = [
    { role: 'system' as const, content: systemContent },
    ...options.messages
  ]

  return {
    providerConfig,
    messages,
    webSearchEnabled
  }
}

export async function chatWithAi(options: ChatModelOptions) {
  const { providerConfig, messages, webSearchEnabled } = prepareAiRequest(options)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)

  try {
    if (webSearchEnabled) {
      return await requestResponsesWithWebSearch({
        apiKey: providerConfig.apiKey,
        apiUrl: providerConfig.responsesUrl,
        displayName: providerConfig.displayName,
        model: providerConfig.model,
        messages,
        signal: controller.signal
      })
    }

    return await requestChatCompletions({
      apiKey: providerConfig.apiKey,
      apiUrl: providerConfig.apiUrl,
      displayName: providerConfig.displayName,
      model: providerConfig.model,
      messages,
      signal: controller.signal,
      disableThinking: providerConfig.provider === 'doubao'
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw createError({
        statusCode: 504,
        statusMessage: `${providerConfig.displayName}请求超时，请稍后重试`
      })
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function streamChatWithAi(options: ChatModelOptions & {
  onDelta: StreamDeltaHandler
}) {
  const { providerConfig, messages, webSearchEnabled } = prepareAiRequest(options)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS)

  try {
    if (webSearchEnabled) {
      return await streamResponsesWithWebSearch({
        apiKey: providerConfig.apiKey,
        apiUrl: providerConfig.responsesUrl,
        displayName: providerConfig.displayName,
        model: providerConfig.model,
        messages,
        signal: controller.signal,
        onDelta: options.onDelta
      })
    }

    return await streamChatCompletions({
      apiKey: providerConfig.apiKey,
      apiUrl: providerConfig.apiUrl,
      displayName: providerConfig.displayName,
      model: providerConfig.model,
      messages,
      signal: controller.signal,
      onDelta: options.onDelta,
      disableThinking: providerConfig.provider === 'doubao'
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw createError({
        statusCode: 504,
        statusMessage: `${providerConfig.displayName}请求超时，请稍后重试`
      })
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}
