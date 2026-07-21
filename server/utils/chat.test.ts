import { describe, it, expect } from 'vitest'
import { buildModelHistory, shouldAutoRenameTitle } from './chat'

describe('chat', () => {
  describe('buildModelHistory', () => {
    it('should return all messages when under max', () => {
      const messages = [
        { role: 'user', content: 'msg1' },
        { role: 'assistant', content: 'reply1' },
        { role: 'user', content: 'msg2' }
      ]
      const result = buildModelHistory(messages, 20)
      expect(result).toEqual(messages)
    })

    it('should limit to max messages', () => {
      const messages = Array.from({ length: 30 }, (_, i) => ({
        role: (i % 2 === 0 ? 'user' : 'assistant') as const,
        content: `msg${i + 1}`
      }))
      const result = buildModelHistory(messages, 20)
      expect(result).toHaveLength(20)
      expect(result[0].content).toBe('msg11')
    })

    it('should return empty array for empty input', () => {
      const result = buildModelHistory([], 20)
      expect(result).toEqual([])
    })
  })

  describe('shouldAutoRenameTitle', () => {
    it('should return true for "新对话"', () => {
      expect(shouldAutoRenameTitle('新对话')).toBe(true)
    })

    it('should return true for "默认对话"', () => {
      expect(shouldAutoRenameTitle('默认对话')).toBe(true)
    })

    it('should return true for "对话 1"', () => {
      expect(shouldAutoRenameTitle('对话 1')).toBe(true)
    })

    it('should return true for "对话 123"', () => {
      expect(shouldAutoRenameTitle('对话 123')).toBe(true)
    })

    it('should return false for custom title', () => {
      expect(shouldAutoRenameTitle('项目讨论')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(shouldAutoRenameTitle('')).toBe(false)
    })
  })
})