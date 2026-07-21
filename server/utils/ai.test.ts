import { describe, it, expect } from 'vitest'

const DOUBAO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
const DOUBAO_RESPONSES_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/responses'

function normalizeProvider(provider: string): 'zhipu' | 'doubao' {
  const normalized = provider.trim().toLowerCase()

  if (['doubao', 'volcengine', 'volc', 'ark'].includes(normalized)) {
    return 'doubao'
  }

  return 'zhipu'
}

function extractStreamDelta(data: unknown, hasText: boolean) {
  if (!data) {
    return ''
  }

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

describe('ai', () => {
  describe('normalizeProvider', () => {
    it('should return doubao for doubao', () => {
      expect(normalizeProvider('doubao')).toBe('doubao')
    })

    it('should return doubao for volcengine', () => {
      expect(normalizeProvider('volcengine')).toBe('doubao')
    })

    it('should return doubao for volc', () => {
      expect(normalizeProvider('volc')).toBe('doubao')
    })

    it('should return doubao for ark', () => {
      expect(normalizeProvider('ark')).toBe('doubao')
    })

    it('should return doubao for mixed case', () => {
      expect(normalizeProvider('DouBao')).toBe('doubao')
      expect(normalizeProvider('VOLC')).toBe('doubao')
    })

    it('should return doubao with leading/trailing spaces', () => {
      expect(normalizeProvider('  doubao  ')).toBe('doubao')
    })

    it('should return zhipu for zhipu', () => {
      expect(normalizeProvider('zhipu')).toBe('zhipu')
    })

    it('should return zhipu for mixed case zhipu', () => {
      expect(normalizeProvider('ZhiPu')).toBe('zhipu')
    })

    it('should return zhipu for unknown provider', () => {
      expect(normalizeProvider('openai')).toBe('zhipu')
      expect(normalizeProvider('anthropic')).toBe('zhipu')
      expect(normalizeProvider('google')).toBe('zhipu')
    })

    it('should return zhipu for empty string', () => {
      expect(normalizeProvider('')).toBe('zhipu')
      expect(normalizeProvider('   ')).toBe('zhipu')
    })
  })

  describe('extractStreamDelta', () => {
    it('should extract delta from chat completions format', () => {
      const data = {
        choices: [{ delta: { content: 'hello' } }]
      }
      expect(extractStreamDelta(data, false)).toBe('hello')
    })

    it('should extract delta from multiple choices', () => {
      const data = {
        choices: [
          { delta: { content: 'hello' } },
          { delta: { content: ' world' } }
        ]
      }
      expect(extractStreamDelta(data, false)).toBe('hello world')
    })

    it('should extract delta from responses API format', () => {
      const data = {
        type: 'response.output_text.delta',
        delta: 'hello'
      }
      expect(extractStreamDelta(data, false)).toBe('hello')
    })

    it('should extract output_text from completed response when no text yet', () => {
      const data = {
        type: 'response.completed',
        response: { output_text: 'full response' }
      }
      expect(extractStreamDelta(data, false)).toBe('full response')
    })

    it('should not extract output_text from completed response when already has text', () => {
      const data = {
        type: 'response.completed',
        response: { output_text: 'full response' }
      }
      expect(extractStreamDelta(data, true)).toBe('')
    })

    it('should return empty string for empty choices', () => {
      const data = { choices: [] }
      expect(extractStreamDelta(data, false)).toBe('')
    })

    it('should return empty string for null delta', () => {
      const data = { choices: [{ delta: null }] }
      expect(extractStreamDelta(data, false)).toBe('')
    })

    it('should return empty string for undefined data', () => {
      expect(extractStreamDelta(undefined, false)).toBe('')
    })

    it('should return empty string for null data', () => {
      expect(extractStreamDelta(null, false)).toBe('')
    })

    it('should return empty string for unknown type', () => {
      const data = { type: 'unknown', delta: 'should not be extracted' }
      expect(extractStreamDelta(data, false)).toBe('')
    })

    it('should prioritize chat completions format over responses format', () => {
      const data = {
        type: 'response.output_text.delta',
        delta: 'response delta',
        choices: [{ delta: { content: 'chat delta' } }]
      }
      expect(extractStreamDelta(data, false)).toBe('chat delta')
    })
  })
})