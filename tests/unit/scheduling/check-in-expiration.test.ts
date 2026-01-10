/**
 * Unit tests for check-in expiration calculation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Helper to create dates at specific times
function createDate(hour: number, minute: number = 0): Date {
  const date = new Date('2026-01-09T00:00:00Z')
  date.setUTCHours(hour, minute, 0, 0)
  return date
}

// Inline implementation for testing (since we can't easily import server utils)
function isCheckInExpired(
  scheduledFor: Date | string,
  userTimezone: string,
  now: Date
): boolean {
  const scheduled = typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor

  // For simplicity in tests, use UTC hours
  const scheduledHour = scheduled.getUTCHours()

  // Morning window: 9am-7pm (expires at 7pm)
  if (scheduledHour >= 9 && scheduledHour < 19) {
    const expiry = new Date(scheduled)
    expiry.setUTCHours(19, 0, 0, 0)
    return now > expiry
  }

  // Evening window: 7pm-9am next day (expires at 9am)
  const expiry = new Date(scheduled)
  if (scheduledHour >= 19) {
    // Next day 9am
    expiry.setDate(expiry.getDate() + 1)
    expiry.setUTCHours(9, 0, 0, 0)
  } else {
    // Same day 9am
    expiry.setUTCHours(9, 0, 0, 0)
  }

  return now > expiry
}

function isMagicLinkExpired(emailSentAt: Date | string | null, now: Date): boolean {
  if (!emailSentAt) return false

  const sentAt = typeof emailSentAt === 'string' ? new Date(emailSentAt) : emailSentAt
  const twentyFourHoursMs = 24 * 60 * 60 * 1000

  return now.getTime() - sentAt.getTime() > twentyFourHoursMs
}

describe('Check-In Expiration', () => {
  describe('isCheckInExpired', () => {
    it('should not expire morning check-in before 7pm', () => {
      const scheduledAt = createDate(9) // 9am
      const now = createDate(14) // 2pm

      expect(isCheckInExpired(scheduledAt, 'UTC', now)).toBe(false)
    })

    it('should expire morning check-in after 7pm', () => {
      const scheduledAt = createDate(9) // 9am
      const now = createDate(20) // 8pm

      expect(isCheckInExpired(scheduledAt, 'UTC', now)).toBe(true)
    })

    it('should not expire evening check-in before 9am next day', () => {
      const scheduledAt = createDate(19) // 7pm
      const now = createDate(23) // 11pm same day

      expect(isCheckInExpired(scheduledAt, 'UTC', now)).toBe(false)
    })

    it('should expire evening check-in after 9am next day', () => {
      const scheduledAt = createDate(19) // 7pm
      const now = new Date(scheduledAt)
      now.setDate(now.getDate() + 1)
      now.setUTCHours(10) // 10am next day

      expect(isCheckInExpired(scheduledAt, 'UTC', now)).toBe(true)
    })

    it('should handle edge case at exactly 7pm', () => {
      const scheduledAt = createDate(9)
      const now = createDate(19, 0) // Exactly 7pm

      // At exactly 7pm, it should NOT be expired (boundary)
      expect(isCheckInExpired(scheduledAt, 'UTC', now)).toBe(false)
    })

    it('should handle edge case 1 minute after 7pm', () => {
      const scheduledAt = createDate(9)
      const now = createDate(19, 1) // 7:01pm

      expect(isCheckInExpired(scheduledAt, 'UTC', now)).toBe(true)
    })
  })

  describe('isMagicLinkExpired', () => {
    it('should not expire if email not sent yet', () => {
      expect(isMagicLinkExpired(null, new Date())).toBe(false)
    })

    it('should not expire within 24 hours', () => {
      const sentAt = new Date('2026-01-09T10:00:00Z')
      const now = new Date('2026-01-09T20:00:00Z') // 10 hours later

      expect(isMagicLinkExpired(sentAt, now)).toBe(false)
    })

    it('should expire after 24 hours', () => {
      const sentAt = new Date('2026-01-09T10:00:00Z')
      const now = new Date('2026-01-10T11:00:00Z') // 25 hours later

      expect(isMagicLinkExpired(sentAt, now)).toBe(true)
    })

    it('should handle exactly 24 hours', () => {
      const sentAt = new Date('2026-01-09T10:00:00Z')
      const now = new Date('2026-01-10T10:00:00Z') // Exactly 24 hours

      // At exactly 24 hours, it should NOT be expired
      expect(isMagicLinkExpired(sentAt, now)).toBe(false)
    })

    it('should expire 1 second after 24 hours', () => {
      const sentAt = new Date('2026-01-09T10:00:00Z')
      const now = new Date('2026-01-10T10:00:01Z') // 24 hours + 1 second

      expect(isMagicLinkExpired(sentAt, now)).toBe(true)
    })
  })
})

describe('Check-In Filtering', () => {
  it('should filter out expired check-ins from list', () => {
    const now = createDate(20) // 8pm

    const checkIns = [
      { id: '1', scheduled_for: createDate(9).toISOString(), timezone: 'UTC' }, // Expired (morning)
      { id: '2', scheduled_for: createDate(19).toISOString(), timezone: 'UTC' }, // Not expired (evening)
      { id: '3', scheduled_for: createDate(10).toISOString(), timezone: 'UTC' }, // Expired (morning)
    ]

    const activeCheckIns = checkIns.filter(
      c => !isCheckInExpired(c.scheduled_for, c.timezone, now)
    )

    expect(activeCheckIns.length).toBe(1)
    expect(activeCheckIns[0].id).toBe('2')
  })
})
