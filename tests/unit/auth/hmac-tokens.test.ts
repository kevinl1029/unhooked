import { describe, it, expect } from 'vitest'
import {
  generateUnsubscribeToken,
  validateUnsubscribeToken,
} from '~/server/utils/auth/hmac-tokens'

const TEST_SECRET = 'test-secret-key-for-unit-tests-32char'

describe('hmac-tokens', () => {
  it('generateUnsubscribeToken is deterministic — same userId produces same signature', () => {
    const token1 = generateUnsubscribeToken('user-abc-123', TEST_SECRET)
    const token2 = generateUnsubscribeToken('user-abc-123', TEST_SECRET)
    expect(token1).toBe(token2)
  })

  it('different userIds produce different HMACs', () => {
    const token1 = generateUnsubscribeToken('user-001', TEST_SECRET)
    const token2 = generateUnsubscribeToken('user-002', TEST_SECRET)
    expect(token1).not.toBe(token2)
  })

  it('validateUnsubscribeToken returns true for correct signature', () => {
    const userId = 'user-valid-123'
    const sig = generateUnsubscribeToken(userId, TEST_SECRET)
    expect(validateUnsubscribeToken(userId, sig, TEST_SECRET)).toBe(true)
  })

  it('validateUnsubscribeToken returns false for incorrect signature', () => {
    expect(validateUnsubscribeToken('user-123', 'tampered-signature', TEST_SECRET)).toBe(false)
  })

  it('validateUnsubscribeToken returns false for empty signature', () => {
    expect(validateUnsubscribeToken('user-123', '', TEST_SECRET)).toBe(false)
  })

  it('generateUnsubscribeToken throws if secret is not set', () => {
    // Pass empty string to simulate falsy/missing secret (bypasses useRuntimeConfig)
    expect(() => generateUnsubscribeToken('user-123', '')).toThrow('UNSUBSCRIBE_SECRET is not set')
  })
})
