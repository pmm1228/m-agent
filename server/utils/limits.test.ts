import { describe, it, expect } from 'vitest'
import { assertMaxLength, MAX_CHAT_MESSAGE_LENGTH, MAX_TODO_TITLE_LENGTH, MAX_CONVERSATION_TITLE_LENGTH } from './limits'

describe('limits', () => {
  describe('constants', () => {
    it('should define MAX_CHAT_MESSAGE_LENGTH', () => {
      expect(MAX_CHAT_MESSAGE_LENGTH).toBe(4000)
    })

    it('should define MAX_TODO_TITLE_LENGTH', () => {
      expect(MAX_TODO_TITLE_LENGTH).toBe(120)
    })

    it('should define MAX_CONVERSATION_TITLE_LENGTH', () => {
      expect(MAX_CONVERSATION_TITLE_LENGTH).toBe(80)
    })
  })

  describe('assertMaxLength', () => {
    it('should not throw for valid length', () => {
      expect(() => assertMaxLength('test', 100, '测试')).not.toThrow()
    })

    it('should not throw for exact max length', () => {
      const str = 'a'.repeat(120)
      expect(() => assertMaxLength(str, 120, '测试')).not.toThrow()
    })

    it('should throw for exceeding max length', () => {
      const str = 'a'.repeat(121)
      expect(() => assertMaxLength(str, 120, '测试')).toThrow()
    })

    it('should throw with correct message', () => {
      const str = 'a'.repeat(121)
      expect(() => assertMaxLength(str, 120, '待办标题')).toThrow('待办标题不能超过 120 个字符')
    })

    it('should handle empty string', () => {
      expect(() => assertMaxLength('', 100, '测试')).not.toThrow()
    })

    it('should handle special characters', () => {
      const str = '@#$%^&*()'.repeat(10)
      expect(() => assertMaxLength(str, 100, '测试')).not.toThrow()
    })

    it('should handle Chinese characters', () => {
      const str = '中'.repeat(50)
      expect(() => assertMaxLength(str, 100, '测试')).not.toThrow()
    })
  })
})