import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('password', () => {
  describe('hashPassword', () => {
    it('should generate a hash with salt and hash separated by colon', () => {
      const result = hashPassword('test-password')
      expect(result).toContain(':')
      const [salt, hash] = result.split(':')
      expect(salt).toHaveLength(32)
      expect(hash).toHaveLength(128)
    })

    it('should generate different hashes for the same password', () => {
      const hash1 = hashPassword('same-password')
      const hash2 = hashPassword('same-password')
      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty password', () => {
      const result = hashPassword('')
      expect(result).toContain(':')
      const [salt, hash] = result.split(':')
      expect(salt).toHaveLength(32)
      expect(hash).toHaveLength(128)
    })

    it('should handle special characters', () => {
      const result = hashPassword('@#$%^&*()_+-=[]{}|;:,.<>?')
      expect(result).toContain(':')
    })
  })

  describe('verifyPassword', () => {
    it('should return true for correct password', () => {
      const hash = hashPassword('correct-password')
      expect(verifyPassword('correct-password', hash)).toBe(true)
    })

    it('should return false for incorrect password', () => {
      const hash = hashPassword('correct-password')
      expect(verifyPassword('wrong-password', hash)).toBe(false)
    })

    it('should return false for empty stored hash', () => {
      expect(verifyPassword('password', '')).toBe(false)
    })

    it('should return false for malformed stored hash', () => {
      expect(verifyPassword('password', 'invalid-hash')).toBe(false)
      expect(verifyPassword('password', 'salt-only')).toBe(false)
      expect(verifyPassword('password', ':hash-only')).toBe(false)
    })

    it('should handle empty password correctly', () => {
      const hash = hashPassword('')
      expect(verifyPassword('', hash)).toBe(true)
      expect(verifyPassword('not-empty', hash)).toBe(false)
    })

    it('should be timing safe', () => {
      const hash = hashPassword('test-password')
      const iterations = 10
      const times: number[] = []

      for (let i = 0; i < iterations; i++) {
        const start = process.hrtime()
        verifyPassword('wrong-password', hash)
        const end = process.hrtime(start)
        times.push(end[0] * 1000 + end[1] / 1_000_000)
      }

      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length
      expect(variance).toBeLessThan(10)
    })
  })
})