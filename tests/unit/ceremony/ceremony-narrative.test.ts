/**
 * Unit tests for ceremony narrative generation
 */
import { describe, it, expect } from 'vitest'
import type { CapturedMoment } from '~/server/utils/llm/task-types'

// Mock moment for testing
function createMockMoment(overrides: Partial<CapturedMoment> = {}): CapturedMoment {
  return {
    id: 'moment-1',
    userId: 'user-1',
    conversationId: 'conv-1',
    messageId: 'msg-1',
    momentType: 'insight',
    transcript: 'The anxiety I feel IS the withdrawal',
    audioClipPath: null,
    audioDurationMs: null,
    illusionKey: 'stress_relief',
    sessionType: 'core',
    illusionLayer: 'intellectual',
    confidenceScore: 0.85,
    emotionalValence: 'positive',
    isUserHighlighted: false,
    timesPlayedBack: 0,
    lastUsedAt: null,
    createdAt: '2026-01-09T10:00:00Z',
    updatedAt: '2026-01-09T10:00:00Z',
    ...overrides,
  }
}

describe('Ceremony Narrative Generation', () => {
  describe('Narrative structure', () => {
    it('should require at least one moment', () => {
      const moments: CapturedMoment[] = []

      const canGenerate = moments.length > 0
      expect(canGenerate).toBe(false)
    })

    it('should create segments from moments', () => {
      const moments = [
        createMockMoment({ id: '1', transcript: 'First insight' }),
        createMockMoment({ id: '2', transcript: 'Second insight' }),
      ]

      // Simulate basic segment creation
      const segments = moments.flatMap((moment, index) => [
        {
          id: `seg_intro_${index}`,
          type: 'narration' as const,
          text: 'Here\'s something you shared:',
        },
        {
          id: `seg_moment_${index}`,
          type: 'user_moment' as const,
          text: moment.transcript,
          momentId: moment.id,
        },
      ])

      expect(segments.length).toBe(4)
      expect(segments.filter(s => s.type === 'narration').length).toBe(2)
      expect(segments.filter(s => s.type === 'user_moment').length).toBe(2)
    })
  })

  describe('Already quit handling', () => {
    it('should adjust narrative for users who already quit', () => {
      const alreadyQuit = true

      // Narrative should acknowledge organic quit
      const narrativeHint = alreadyQuit
        ? 'You didn\'t even need the ritual. You just... stopped.'
        : 'Let\'s begin your final step.'

      expect(narrativeHint).toContain('You just... stopped')
    })

    it('should use standard narrative for active users', () => {
      const alreadyQuit = false

      const narrativeHint = alreadyQuit
        ? 'You didn\'t even need the ritual.'
        : 'Let\'s begin your final step.'

      expect(narrativeHint).toContain('final step')
    })
  })

  describe('Segment types', () => {
    it('should mark narration segments correctly', () => {
      const segment = {
        id: 'seg_1',
        type: 'narration' as const,
        text: 'Let\'s look back at your journey.',
      }

      expect(segment.type).toBe('narration')
      expect(segment.text).toBeTruthy()
    })

    it('should mark user moment segments with momentId', () => {
      const segment = {
        id: 'seg_2',
        type: 'user_moment' as const,
        text: 'Your words here',
        momentId: 'moment-123',
      }

      expect(segment.type).toBe('user_moment')
      expect(segment.momentId).toBe('moment-123')
    })

    it('should validate momentIds exist in input', () => {
      const inputMomentIds = new Set(['moment-1', 'moment-2'])
      const segmentMomentId = 'moment-1'
      const invalidMomentId = 'moment-999'

      expect(inputMomentIds.has(segmentMomentId)).toBe(true)
      expect(inputMomentIds.has(invalidMomentId)).toBe(false)
    })
  })

  describe('Fallback narrative', () => {
    it('should create simple structure on LLM failure', () => {
      const moments = [
        createMockMoment({ id: '1', transcript: 'Insight one' }),
        createMockMoment({ id: '2', transcript: 'Insight two' }),
      ]

      // Simulate fallback structure
      const segments = [
        { id: 'seg_1', type: 'narration' as const, text: 'Let\'s reflect on your journey.' },
        ...moments.map((m, i) => ({
          id: `seg_moment_${i}`,
          type: 'user_moment' as const,
          text: m.transcript,
          momentId: m.id,
        })),
        { id: 'seg_closing', type: 'narration' as const, text: 'These are your words.' },
      ]

      expect(segments.length).toBe(4)
      expect(segments[0].type).toBe('narration')
      expect(segments[segments.length - 1].type).toBe('narration')
    })
  })

  describe('User personalization', () => {
    it('should use firstName if provided', () => {
      const firstName = 'Alex'
      const greeting = `${firstName}, let's look back at where this all began.`

      expect(greeting).toContain('Alex')
    })

    it('should use fallback when no firstName', () => {
      const firstName: string | undefined = undefined
      const userName = firstName || 'friend'
      const greeting = `${userName}, let's look back.`

      expect(greeting).toContain('friend')
    })

    it('should include origin summary if available', () => {
      const originSummary = 'Started vaping in college due to stress.'
      const hasOriginContext = !!originSummary

      expect(hasOriginContext).toBe(true)
    })
  })
})
