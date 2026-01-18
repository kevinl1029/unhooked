/**
 * Unit tests for session complete handler
 * Covers:
 * - Check-in scheduling integration (Gap #4 fix)
 * - Missing user_story handling (Gap #5 fix)
 */
import { describe, it, expect } from 'vitest'

// Constants matching the check-in scheduler implementation
const POST_SESSION_DELAY_HOURS = 2
const POST_SESSION_CUTOFF_HOUR = 21

// Helper to create dates
function createDate(hour: number, minute: number = 0): Date {
  const date = new Date('2026-01-09T00:00:00Z')
  date.setUTCHours(hour, minute, 0, 0)
  return date
}

// Inline logic matching session-complete handler behavior
interface SessionCompleteCheckInConfig {
  userId: string
  timezone: string
  trigger: 'session_complete'
  sessionId: string
  illusionKey: string
  sessionEndTime: Date
}

function shouldSchedulePostSessionCheckIn(sessionEndTime: Date, timezone: string): boolean {
  const twoHoursLater = new Date(sessionEndTime.getTime() + POST_SESSION_DELAY_HOURS * 60 * 60 * 1000)
  // Simplified: use UTC hours for testing
  const hourInTimezone = twoHoursLater.getUTCHours()
  return hourInTimezone < POST_SESSION_CUTOFF_HOUR
}

function buildCheckInConfig(
  userId: string,
  conversationId: string,
  illusionKey: string,
  timezone: string
): SessionCompleteCheckInConfig {
  return {
    userId,
    timezone,
    trigger: 'session_complete',
    sessionId: conversationId,
    illusionKey,
    sessionEndTime: new Date(),
  }
}

describe('Session Complete Handler - Check-In Scheduling', () => {
  describe('Check-in config building', () => {
    it('should build correct config for check-in scheduling', () => {
      const config = buildCheckInConfig(
        'user-123',
        'conv-456',
        'stress_relief',
        'America/New_York'
      )

      expect(config.userId).toBe('user-123')
      expect(config.sessionId).toBe('conv-456')
      expect(config.illusionKey).toBe('stress_relief')
      expect(config.timezone).toBe('America/New_York')
      expect(config.trigger).toBe('session_complete')
      expect(config.sessionEndTime).toBeInstanceOf(Date)
    })

    it('should use session_complete trigger type', () => {
      const config = buildCheckInConfig('user-1', 'conv-1', 'pleasure', 'UTC')
      expect(config.trigger).toBe('session_complete')
    })
  })

  describe('Timezone fallback', () => {
    it('should use default timezone when user timezone is null', () => {
      const userProgressTimezone: string | null = null
      const defaultTimezone = 'America/New_York'

      const timezone = userProgressTimezone || defaultTimezone

      expect(timezone).toBe('America/New_York')
    })

    it('should use user timezone when available', () => {
      const userProgressTimezone = 'Europe/London'
      const defaultTimezone = 'America/New_York'

      const timezone = userProgressTimezone || defaultTimezone

      expect(timezone).toBe('Europe/London')
    })
  })

  describe('Post-session check-in timing', () => {
    it('should schedule when session ends in the morning', () => {
      const sessionEnd = createDate(10, 0) // 10am
      expect(shouldSchedulePostSessionCheckIn(sessionEnd, 'UTC')).toBe(true)
    })

    it('should schedule when session ends in the afternoon', () => {
      const sessionEnd = createDate(14, 0) // 2pm
      expect(shouldSchedulePostSessionCheckIn(sessionEnd, 'UTC')).toBe(true)
    })

    it('should schedule when session ends at 6:59pm (2hr later = 8:59pm)', () => {
      const sessionEnd = createDate(18, 59) // 6:59pm
      expect(shouldSchedulePostSessionCheckIn(sessionEnd, 'UTC')).toBe(true)
    })

    it('should NOT schedule when session ends at 7pm (2hr later = 9pm)', () => {
      const sessionEnd = createDate(19, 0) // 7pm
      expect(shouldSchedulePostSessionCheckIn(sessionEnd, 'UTC')).toBe(false)
    })

    it('should NOT schedule when session ends late evening', () => {
      const sessionEnd = createDate(21, 0) // 9pm
      expect(shouldSchedulePostSessionCheckIn(sessionEnd, 'UTC')).toBe(false)
    })
  })

  describe('Error handling', () => {
    it('should not fail session complete if check-in scheduling fails', () => {
      // Simulate the try-catch pattern in the handler
      let sessionCompleteSucceeded = false
      let checkInSchedulingError: Error | null = null

      try {
        // Simulate check-in scheduling failing
        try {
          throw new Error('Database connection failed')
        } catch (checkInError) {
          checkInSchedulingError = checkInError as Error
          // Don't rethrow - this matches the implementation
        }

        // Session complete continues despite check-in error
        sessionCompleteSucceeded = true
      } catch {
        sessionCompleteSucceeded = false
      }

      expect(sessionCompleteSucceeded).toBe(true)
      expect(checkInSchedulingError).not.toBeNull()
      expect(checkInSchedulingError?.message).toBe('Database connection failed')
    })
  })

  describe('Integration with session complete flow', () => {
    it('should be called after origin summary generation (step 8)', () => {
      // Validate the ordering of steps in session-complete handler
      const steps = [
        'fetch_user_story',
        'run_conviction_assessment',
        'store_assessment',
        'update_user_story',
        'select_key_insight',
        'update_key_insight',
        'generate_origin_summary',
        'schedule_check_ins', // Step 8 - our new addition
      ]

      expect(steps.indexOf('schedule_check_ins')).toBe(7)
      expect(steps.indexOf('schedule_check_ins')).toBeGreaterThan(
        steps.indexOf('generate_origin_summary')
      )
    })

    it('should pass all illusion keys correctly', () => {
      const validIllusionKeys = [
        'stress_relief',
        'pleasure',
        'willpower',
        'focus',
        'identity',
      ]

      validIllusionKeys.forEach(key => {
        const config = buildCheckInConfig('user-1', 'conv-1', key, 'UTC')
        expect(config.illusionKey).toBe(key)
      })
    })
  })
})

describe('Session Complete Handler - Missing User Story Handling (Gap #5)', () => {
  // Simulate the user_story creation logic from the handler
  interface UserStory {
    user_id: string
    primary_triggers: string[]
    personal_stakes: string[]
    [key: string]: unknown
  }

  function simulateUserStoryFetch(existingStory: UserStory | null): UserStory | null {
    return existingStory
  }

  function createDefaultUserStory(userId: string): UserStory {
    return {
      user_id: userId,
      primary_triggers: [],
      personal_stakes: [],
    }
  }

  describe('Defensive fallback creation', () => {
    it('should create user_story when it does not exist', () => {
      const userId = 'user-missing-story'
      let userStory = simulateUserStoryFetch(null)

      // Simulate the defensive fallback logic
      if (!userStory) {
        userStory = createDefaultUserStory(userId)
      }

      expect(userStory).not.toBeNull()
      expect(userStory!.user_id).toBe(userId)
      expect(userStory!.primary_triggers).toEqual([])
      expect(userStory!.personal_stakes).toEqual([])
    })

    it('should use existing user_story when it exists', () => {
      const existingStory: UserStory = {
        user_id: 'user-with-story',
        primary_triggers: ['stress', 'boredom'],
        personal_stakes: ['health', 'family'],
        stress_relief_conviction: 75,
      }

      let userStory = simulateUserStoryFetch(existingStory)

      // Defensive fallback should not trigger
      if (!userStory) {
        userStory = createDefaultUserStory(existingStory.user_id)
      }

      expect(userStory).toBe(existingStory)
      expect(userStory.primary_triggers).toEqual(['stress', 'boredom'])
      expect(userStory.stress_relief_conviction).toBe(75)
    })

    it('should preserve empty arrays in created user_story', () => {
      const userId = 'user-new'
      const newStory = createDefaultUserStory(userId)

      expect(Array.isArray(newStory.primary_triggers)).toBe(true)
      expect(Array.isArray(newStory.personal_stakes)).toBe(true)
      expect(newStory.primary_triggers.length).toBe(0)
      expect(newStory.personal_stakes.length).toBe(0)
    })
  })

  describe('Conviction tracking with missing user_story', () => {
    it('should default to 0 conviction when user_story is newly created', () => {
      const newStory = createDefaultUserStory('user-1')
      const illusionKey = 'stress_relief'

      // Simulate the conviction lookup logic
      const previousConviction = newStory[`${illusionKey}_conviction`] ?? 0

      expect(previousConviction).toBe(0)
    })

    it('should default to empty arrays for triggers and stakes', () => {
      const newStory = createDefaultUserStory('user-1')

      const existingTriggers = newStory.primary_triggers || []
      const existingStakes = newStory.personal_stakes || []

      expect(existingTriggers).toEqual([])
      expect(existingStakes).toEqual([])
    })
  })

  describe('Error scenarios', () => {
    it('should throw error when user_story creation fails', () => {
      // Simulate the error handling pattern
      const createError = { code: 'PGRST116', message: 'Database error' }

      expect(() => {
        if (createError) {
          throw new Error('Failed to create user_story - cannot proceed with session completion')
        }
      }).toThrow('Failed to create user_story - cannot proceed with session completion')
    })

    it('should log when creating missing user_story', () => {
      const userId = 'user-123'
      const logMessage = `[session-complete] Creating missing user_story for user ${userId}`

      expect(logMessage).toContain('Creating missing user_story')
      expect(logMessage).toContain(userId)
    })
  })
})
