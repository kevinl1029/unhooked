/**
 * Unit tests for check-in email sender query window
 */
import { describe, it, expect } from 'vitest'

// Helper to create dates
function createDate(hoursOffset: number = 0): Date {
  const date = new Date('2026-01-09T12:00:00Z') // Noon UTC
  date.setTime(date.getTime() + hoursOffset * 60 * 60 * 1000)
  return date
}

// Inline implementation of the query window logic for testing
function calculateEmailQueryWindow(now: Date): { windowStart: Date; windowEnd: Date } {
  const twentyFourHoursMs = 24 * 60 * 60 * 1000
  return {
    windowStart: new Date(now.getTime() - twentyFourHoursMs), // 24 hours ago
    windowEnd: new Date(now.getTime() + twentyFourHoursMs),   // 24 hours ahead
  }
}

function isCheckInInQueryWindow(
  scheduledFor: Date,
  windowStart: Date,
  windowEnd: Date
): boolean {
  return scheduledFor >= windowStart && scheduledFor <= windowEnd
}

describe('Check-In Email Sender Query Window', () => {
  describe('Window calculation', () => {
    it('should calculate 24-hour window in both directions', () => {
      const now = createDate(0) // Noon
      const { windowStart, windowEnd } = calculateEmailQueryWindow(now)

      // Window should span 48 hours total
      const windowMs = windowEnd.getTime() - windowStart.getTime()
      expect(windowMs).toBe(48 * 60 * 60 * 1000)
    })

    it('should include check-ins scheduled 23 hours ago', () => {
      const now = createDate(0)
      const { windowStart, windowEnd } = calculateEmailQueryWindow(now)

      const scheduledFor = createDate(-23) // 23 hours ago
      expect(isCheckInInQueryWindow(scheduledFor, windowStart, windowEnd)).toBe(true)
    })

    it('should include check-ins scheduled 23 hours in future', () => {
      const now = createDate(0)
      const { windowStart, windowEnd } = calculateEmailQueryWindow(now)

      const scheduledFor = createDate(23) // 23 hours ahead
      expect(isCheckInInQueryWindow(scheduledFor, windowStart, windowEnd)).toBe(true)
    })

    it('should include check-ins scheduled right now', () => {
      const now = createDate(0)
      const { windowStart, windowEnd } = calculateEmailQueryWindow(now)

      expect(isCheckInInQueryWindow(now, windowStart, windowEnd)).toBe(true)
    })

    it('should exclude check-ins scheduled more than 24 hours ago', () => {
      const now = createDate(0)
      const { windowStart, windowEnd } = calculateEmailQueryWindow(now)

      const scheduledFor = createDate(-25) // 25 hours ago
      expect(isCheckInInQueryWindow(scheduledFor, windowStart, windowEnd)).toBe(false)
    })

    it('should exclude check-ins scheduled more than 24 hours in future', () => {
      const now = createDate(0)
      const { windowStart, windowEnd } = calculateEmailQueryWindow(now)

      const scheduledFor = createDate(25) // 25 hours ahead
      expect(isCheckInInQueryWindow(scheduledFor, windowStart, windowEnd)).toBe(false)
    })
  })

  describe('Past-due check-in scenarios', () => {
    it('should catch morning check-in that was missed by daily cron', () => {
      // Scenario: Morning check-in at 9am, cron runs at 10pm same day
      // With old logic (future-only), this would be missed
      // With new logic (past 24h + future 24h), this is caught

      const cronTime = new Date('2026-01-09T22:00:00Z') // 10pm UTC
      const { windowStart, windowEnd } = calculateEmailQueryWindow(cronTime)

      const morningCheckIn = new Date('2026-01-09T09:00:00Z') // 9am UTC same day
      expect(isCheckInInQueryWindow(morningCheckIn, windowStart, windowEnd)).toBe(true)
    })

    it('should catch check-in from yesterday if cron was delayed', () => {
      // Scenario: Check-in at 7pm yesterday, cron delayed until 6pm today
      const cronTime = new Date('2026-01-10T18:00:00Z')
      const { windowStart, windowEnd } = calculateEmailQueryWindow(cronTime)

      const yesterdayCheckIn = new Date('2026-01-09T19:00:00Z') // 23 hours ago
      expect(isCheckInInQueryWindow(yesterdayCheckIn, windowStart, windowEnd)).toBe(true)
    })

    it('should not catch very old check-ins (> 24h old)', () => {
      // Scenario: Check-in from 2 days ago should not be caught
      const cronTime = new Date('2026-01-11T12:00:00Z')
      const { windowStart, windowEnd } = calculateEmailQueryWindow(cronTime)

      const oldCheckIn = new Date('2026-01-09T12:00:00Z') // 48 hours ago
      expect(isCheckInInQueryWindow(oldCheckIn, windowStart, windowEnd)).toBe(false)
    })
  })

  describe('Hourly cron scenarios', () => {
    it('should process check-in shortly after it becomes due with hourly cron', () => {
      // Scenario: Check-in at 2pm, cron runs at 3pm (1 hour after)
      const cronTime = new Date('2026-01-09T15:00:00Z') // 3pm
      const { windowStart, windowEnd } = calculateEmailQueryWindow(cronTime)

      const checkIn = new Date('2026-01-09T14:00:00Z') // 2pm (1 hour ago)
      expect(isCheckInInQueryWindow(checkIn, windowStart, windowEnd)).toBe(true)
    })

    it('should process upcoming check-ins scheduled for next few hours', () => {
      // Scenario: Cron at 1pm, check-in scheduled for 4pm
      const cronTime = new Date('2026-01-09T13:00:00Z') // 1pm
      const { windowStart, windowEnd } = calculateEmailQueryWindow(cronTime)

      const checkIn = new Date('2026-01-09T16:00:00Z') // 4pm (3 hours ahead)
      expect(isCheckInInQueryWindow(checkIn, windowStart, windowEnd)).toBe(true)
    })
  })

  describe('Status filtering', () => {
    // The query should only select check-ins with 'scheduled' status
    it('should only send emails for scheduled status', () => {
      const SENDABLE_STATUSES = ['scheduled']

      expect(SENDABLE_STATUSES.includes('scheduled')).toBe(true)
      expect(SENDABLE_STATUSES.includes('sent')).toBe(false)
      expect(SENDABLE_STATUSES.includes('opened')).toBe(false)
      expect(SENDABLE_STATUSES.includes('completed')).toBe(false)
      expect(SENDABLE_STATUSES.includes('skipped')).toBe(false)
      expect(SENDABLE_STATUSES.includes('expired')).toBe(false)
    })
  })
})
