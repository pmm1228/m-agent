import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { assertLoginAllowed, recordLoginFailure, clearLoginFailures } from './login-rate-limit'

describe('login-rate-limit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('assertLoginAllowed', () => {
    it('should allow login when no failures', () => {
      const event = createMockEvent('127.0.0.1')
      expect(() => assertLoginAllowed(event, 'testuser')).not.toThrow()
    })

    it('should allow login when failures are within limit', () => {
      const event = createMockEvent('127.0.0.1')
      
      for (let i = 0; i < 4; i++) {
        recordLoginFailure(event, 'testuser')
      }
      
      expect(() => assertLoginAllowed(event, 'testuser')).not.toThrow()
    })

    it('should block login when failures exceed limit', () => {
      const event = createMockEvent('127.0.0.1')
      
      for (let i = 0; i < 5; i++) {
        recordLoginFailure(event, 'testuser')
      }
      
      expect(() => assertLoginAllowed(event, 'testuser')).toThrow(/登录失败次数过多/)
    })

    it('should allow login after lockout period', () => {
      const event = createMockEvent('127.0.0.1')
      
      for (let i = 0; i < 5; i++) {
        recordLoginFailure(event, 'testuser')
      }
      
      expect(() => assertLoginAllowed(event, 'testuser')).toThrow()
      
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000)
      
      expect(() => assertLoginAllowed(event, 'testuser')).not.toThrow()
    })

    it('should reset counter after window period', () => {
      const event = createMockEvent('127.0.0.1')
      
      for (let i = 0; i < 4; i++) {
        recordLoginFailure(event, 'testuser')
      }
      
      vi.advanceTimersByTime(10 * 60 * 1000 + 1000)
      
      for (let i = 0; i < 5; i++) {
        recordLoginFailure(event, 'testuser')
      }
      
      expect(() => assertLoginAllowed(event, 'testuser')).toThrow()
    })

    it('should differentiate by IP and username', () => {
      const event1 = createMockEvent('127.0.0.1')
      const event2 = createMockEvent('127.0.0.2')
      
      for (let i = 0; i < 5; i++) {
        recordLoginFailure(event1, 'testuser')
      }
      
      expect(() => assertLoginAllowed(event1, 'testuser')).toThrow()
      expect(() => assertLoginAllowed(event2, 'testuser')).not.toThrow()
      expect(() => assertLoginAllowed(event1, 'otheruser')).not.toThrow()
    })
  })

  describe('clearLoginFailures', () => {
    it('should clear failures after successful login', () => {
      const event = createMockEvent('127.0.0.1')
      
      for (let i = 0; i < 4; i++) {
        recordLoginFailure(event, 'testuser')
      }
      
      clearLoginFailures(event, 'testuser')
      
      expect(() => assertLoginAllowed(event, 'testuser')).not.toThrow()
    })
  })
})

function createMockEvent(ip: string) {
  return {
    node: {
      req: {
        socket: {
          remoteAddress: ip
        }
      }
    }
  } as any
}