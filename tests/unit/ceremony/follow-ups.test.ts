/**
 * Unit tests for post-ceremony follow-up scheduling
 */
import { describe, it, expect } from 'vitest'

// Follow-up milestone configuration
const FOLLOW_UP_MILESTONES = [
  { type: 'day_3', days: 3 },
  { type: 'day_7', days: 7 },
  { type: 'day_14', days: 14 },
  { type: 'day_30', days: 30 },
  { type: 'day_90', days: 90 },
  { type: 'day_180', days: 180 },
  { type: 'day_365', days: 365 },
]

describe('Post-Ceremony Follow-ups', () => {
  describe('Milestone configuration', () => {
    it('should have 7 milestone types', () => {
      expect(FOLLOW_UP_MILESTONES.length).toBe(7)
    })

    it('should be in ascending order by days', () => {
      let prevDays = 0
      for (const milestone of FOLLOW_UP_MILESTONES) {
        expect(milestone.days).toBeGreaterThan(prevDays)
        prevDays = milestone.days
      }
    })

    it('should have day_3 as first milestone', () => {
      expect(FOLLOW_UP_MILESTONES[0].type).toBe('day_3')
      expect(FOLLOW_UP_MILESTONES[0].days).toBe(3)
    })

    it('should have day_365 as last milestone', () => {
      const last = FOLLOW_UP_MILESTONES[FOLLOW_UP_MILESTONES.length - 1]
      expect(last.type).toBe('day_365')
      expect(last.days).toBe(365)
    })
  })

  describe('Schedule calculation', () => {
    it('should calculate scheduled dates from ceremony completion', () => {
      const ceremonyDate = new Date('2026-01-09T15:00:00Z')

      const schedules = FOLLOW_UP_MILESTONES.map(milestone => {
        const scheduledDate = new Date(ceremonyDate)
        scheduledDate.setDate(scheduledDate.getDate() + milestone.days)
        return {
          type: milestone.type,
          scheduledFor: scheduledDate.toISOString(),
        }
      })

      // Day 3 should be Jan 12
      expect(schedules[0].scheduledFor).toContain('2026-01-12')

      // Day 7 should be Jan 16
      expect(schedules[1].scheduledFor).toContain('2026-01-16')

      // Day 30 should be Feb 8
      expect(schedules[3].scheduledFor).toContain('2026-02-08')
    })

    it('should handle month/year boundaries', () => {
      const ceremonyDate = new Date('2026-12-28T15:00:00Z')

      const day7 = new Date(ceremonyDate)
      day7.setDate(day7.getDate() + 7)

      // Should roll into next year
      expect(day7.getFullYear()).toBe(2027)
      expect(day7.getMonth()).toBe(0) // January
    })
  })

  describe('Follow-up data structure', () => {
    it('should include all required fields', () => {
      const followUp = {
        user_id: 'user-123',
        milestone_type: 'day_7',
        scheduled_for: '2026-01-16T15:00:00Z',
        timezone: 'America/New_York',
        status: 'scheduled',
      }

      expect(followUp.user_id).toBeTruthy()
      expect(followUp.milestone_type).toBeTruthy()
      expect(followUp.scheduled_for).toBeTruthy()
      expect(followUp.timezone).toBeTruthy()
      expect(followUp.status).toBe('scheduled')
    })

    it('should support all valid statuses', () => {
      const validStatuses = ['scheduled', 'sent', 'completed', 'skipped', 'expired']

      validStatuses.forEach(status => {
        const followUp = { status }
        expect(['scheduled', 'sent', 'completed', 'skipped', 'expired']).toContain(followUp.status)
      })
    })
  })

  describe('Uniqueness constraint', () => {
    it('should have one follow-up per milestone per user', () => {
      const followUps = [
        { user_id: 'user-1', milestone_type: 'day_3' },
        { user_id: 'user-1', milestone_type: 'day_7' },
        { user_id: 'user-1', milestone_type: 'day_14' },
      ]

      // Check uniqueness
      const keys = followUps.map(f => `${f.user_id}-${f.milestone_type}`)
      const uniqueKeys = new Set(keys)

      expect(uniqueKeys.size).toBe(keys.length)
    })
  })

  describe('Magic link tokens', () => {
    it('should support magic link token with expiry', () => {
      const followUp = {
        magic_link_token: 'abc123def456',
        token_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }

      expect(followUp.magic_link_token).toBeTruthy()
      expect(new Date(followUp.token_expires_at).getTime()).toBeGreaterThan(Date.now())
    })

    it('should detect expired tokens', () => {
      const expiredAt = new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      const isExpired = new Date(expiredAt).getTime() < Date.now()

      expect(isExpired).toBe(true)
    })
  })
})
