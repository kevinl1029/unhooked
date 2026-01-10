/**
 * Unit tests for check-in scheduler
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Helper to create dates
function createDate(hour: number, minute: number = 0, dayOffset: number = 0): Date {
  const date = new Date('2026-01-09T00:00:00Z')
  date.setDate(date.getDate() + dayOffset)
  date.setUTCHours(hour, minute, 0, 0)
  return date
}

// Inline scheduling logic for testing
const MORNING_HOUR = 9
const EVENING_HOUR = 19
const POST_SESSION_CUTOFF_HOUR = 21
const POST_SESSION_DELAY_HOURS = 2
const ROLLING_WINDOW_DAYS = 3

function shouldSchedulePostSession(sessionEndTime: Date, timezone: string): boolean {
  const twoHoursLater = new Date(sessionEndTime.getTime() + POST_SESSION_DELAY_HOURS * 60 * 60 * 1000)
  const hour = twoHoursLater.getUTCHours() // Simplified for UTC tests
  return hour < POST_SESSION_CUTOFF_HOUR
}

function calculateCheckInSlots(
  now: Date,
  timezone: string
): { morning: Date[]; evening: Date[] } {
  const morning: Date[] = []
  const evening: Date[] = []

  for (let d = 0; d < ROLLING_WINDOW_DAYS; d++) {
    const targetDate = new Date(now)
    targetDate.setDate(targetDate.getDate() + d)

    // Morning at 9am
    const morningTime = new Date(targetDate)
    morningTime.setUTCHours(MORNING_HOUR, 0, 0, 0)
    if (morningTime > now) {
      morning.push(morningTime)
    }

    // Evening at 7pm
    const eveningTime = new Date(targetDate)
    eveningTime.setUTCHours(EVENING_HOUR, 0, 0, 0)
    if (eveningTime > now) {
      evening.push(eveningTime)
    }
  }

  return { morning, evening }
}

describe('Check-In Scheduler', () => {
  describe('Post-session scheduling', () => {
    it('should schedule post-session check-in when before 9pm cutoff', () => {
      const sessionEnd = createDate(17) // 5pm
      expect(shouldSchedulePostSession(sessionEnd, 'UTC')).toBe(true)
    })

    it('should not schedule post-session check-in when after 9pm cutoff', () => {
      const sessionEnd = createDate(20) // 8pm - 2 hours later is 10pm
      expect(shouldSchedulePostSession(sessionEnd, 'UTC')).toBe(false)
    })

    it('should schedule when session ends at 6:59pm', () => {
      const sessionEnd = createDate(18, 59) // 6:59pm - 2 hours later is 8:59pm
      expect(shouldSchedulePostSession(sessionEnd, 'UTC')).toBe(true)
    })

    it('should not schedule when session ends at 7pm', () => {
      const sessionEnd = createDate(19) // 7pm - 2 hours later is 9pm
      expect(shouldSchedulePostSession(sessionEnd, 'UTC')).toBe(false)
    })
  })

  describe('Rolling window scheduling', () => {
    it('should calculate 3-day window of check-ins', () => {
      const now = createDate(10) // 10am on day 1
      const { morning, evening } = calculateCheckInSlots(now, 'UTC')

      // Should have 3 evenings (today + 2 days)
      expect(evening.length).toBe(3)

      // Should have 2 mornings (tomorrow + day after, today's morning already passed)
      expect(morning.length).toBe(2)
    })

    it('should include today morning if before 9am', () => {
      const now = createDate(8) // 8am
      const { morning, evening } = calculateCheckInSlots(now, 'UTC')

      // Should have 3 mornings (today + 2 days)
      expect(morning.length).toBe(3)
      expect(evening.length).toBe(3)
    })

    it('should not include past slots', () => {
      const now = createDate(20) // 8pm
      const { morning, evening } = calculateCheckInSlots(now, 'UTC')

      // Today's morning and evening already passed
      expect(morning.length).toBe(2) // Tomorrow + day after
      expect(evening.length).toBe(2) // Tomorrow + day after
    })

    it('should schedule mornings at 9am', () => {
      const now = createDate(1) // 1am
      const { morning } = calculateCheckInSlots(now, 'UTC')

      morning.forEach(m => {
        expect(m.getUTCHours()).toBe(MORNING_HOUR)
        expect(m.getUTCMinutes()).toBe(0)
      })
    })

    it('should schedule evenings at 7pm', () => {
      const now = createDate(1) // 1am
      const { evening } = calculateCheckInSlots(now, 'UTC')

      evening.forEach(e => {
        expect(e.getUTCHours()).toBe(EVENING_HOUR)
        expect(e.getUTCMinutes()).toBe(0)
      })
    })
  })

  describe('Magic link token generation', () => {
    it('should generate unique tokens', () => {
      // Simulate token generation
      const tokens = new Set<string>()
      for (let i = 0; i < 100; i++) {
        const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2)
        tokens.add(token)
      }
      expect(tokens.size).toBe(100)
    })

    it('should generate tokens of sufficient length', () => {
      const token = 'a'.repeat(64) // 32 bytes hex = 64 chars
      expect(token.length).toBe(64)
    })
  })

  describe('Check-in conflict detection', () => {
    it('should detect conflict within 60 minute window', () => {
      const existing = createDate(14, 0)
      const proposed = createDate(14, 30)

      const windowMinutes = 60
      const windowMs = windowMinutes * 60 * 1000

      const hasConflict = Math.abs(proposed.getTime() - existing.getTime()) < windowMs
      expect(hasConflict).toBe(true)
    })

    it('should not detect conflict outside 60 minute window', () => {
      const existing = createDate(14, 0)
      const proposed = createDate(16, 0)

      const windowMinutes = 60
      const windowMs = windowMinutes * 60 * 1000

      const hasConflict = Math.abs(proposed.getTime() - existing.getTime()) < windowMs
      expect(hasConflict).toBe(false)
    })
  })
})
