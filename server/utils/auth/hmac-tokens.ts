import { createHmac, timingSafeEqual } from 'node:crypto'

export function generateUnsubscribeToken(userId: string, secret?: string): string {
  const key = secret ?? useRuntimeConfig().unsubscribeSecret
  if (!key) {
    throw new Error('UNSUBSCRIBE_SECRET is not set. Generate one with: openssl rand -hex 32')
  }
  return createHmac('sha256', key).update(userId).digest('base64url')
}

export function validateUnsubscribeToken(userId: string, signature: string, secret?: string): boolean {
  try {
    const expected = generateUnsubscribeToken(userId, secret)
    const expectedBuf = Buffer.from(expected)
    const signatureBuf = Buffer.from(signature)
    if (expectedBuf.length !== signatureBuf.length) {
      return false
    }
    return timingSafeEqual(expectedBuf, signatureBuf)
  } catch {
    return false
  }
}
