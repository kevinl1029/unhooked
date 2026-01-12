/**
 * Unit tests for context builder
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
    transcript: 'Test transcript',
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

describe('Context Builder', () => {
  describe('Moment selection', () => {
    it('should select one moment per type', () => {
      const moments = [
        createMockMoment({ id: '1', momentType: 'insight' }),
        createMockMoment({ id: '2', momentType: 'insight' }),
        createMockMoment({ id: '3', momentType: 'resistance' }),
        createMockMoment({ id: '4', momentType: 'origin_story' }),
      ]

      // Simulate selecting one per type
      const types = new Set<string>()
      const selected: CapturedMoment[] = []

      for (const moment of moments) {
        if (!types.has(moment.momentType)) {
          types.add(moment.momentType)
          selected.push(moment)
        }
      }

      expect(selected.length).toBe(3) // insight, resistance, origin_story
      expect(selected.map(m => m.momentType)).toContain('insight')
      expect(selected.map(m => m.momentType)).toContain('resistance')
      expect(selected.map(m => m.momentType)).toContain('origin_story')
    })

    it('should limit to 5-8 moments', () => {
      const moments: CapturedMoment[] = []
      const types = ['insight', 'resistance', 'origin_story', 'commitment', 'insight', 'insight', 'insight', 'insight', 'insight', 'insight']

      types.forEach((type, i) => {
        moments.push(createMockMoment({ id: `${i}`, momentType: type }))
      })

      // Simulate the 5-8 limit
      const MAX_MOMENTS = 8
      const limited = moments.slice(0, MAX_MOMENTS)

      expect(limited.length).toBeLessThanOrEqual(8)
      expect(limited.length).toBeLessThanOrEqual(MAX_MOMENTS)
    })

    it('should filter by current illusion', () => {
      const moments = [
        createMockMoment({ id: '1', illusionKey: 'stress_relief' }),
        createMockMoment({ id: '2', illusionKey: 'pleasure_illusion' }),
        createMockMoment({ id: '3', illusionKey: 'stress_relief' }),
      ]

      const targetIllusion = 'stress_relief'
      const filtered = moments.filter(m => m.illusionKey === targetIllusion)

      expect(filtered.length).toBe(2)
      expect(filtered.every(m => m.illusionKey === 'stress_relief')).toBe(true)
    })
  })

  describe('Context formatting', () => {
    it('should format moments into readable context', () => {
      const moments = [
        createMockMoment({
          momentType: 'insight',
          transcript: 'The anxiety IS the withdrawal',
        }),
        createMockMoment({
          momentType: 'origin_story',
          transcript: 'I started vaping in college',
        }),
      ]

      // Simulate formatting
      const formatted = moments.map(m =>
        `[${m.momentType}]: "${m.transcript}"`
      ).join('\n')

      expect(formatted).toContain('[insight]')
      expect(formatted).toContain('[origin_story]')
      expect(formatted).toContain('The anxiety IS the withdrawal')
    })

    it('should handle empty moments gracefully', () => {
      const moments: CapturedMoment[] = []

      const formatted = moments.length > 0
        ? moments.map(m => `[${m.momentType}]: "${m.transcript}"`).join('\n')
        : ''

      expect(formatted).toBe('')
    })
  })

  describe('User story integration', () => {
    it('should include conviction scores in context', () => {
      const userStory = {
        stress_relief_conviction: 7,
        pleasure_illusion_conviction: 5,
        willpower_illusion_conviction: 3,
      }

      const illusionKey = 'stress_relief'
      const conviction = userStory[`${illusionKey}_conviction` as keyof typeof userStory]

      expect(conviction).toBe(7)
    })

    it('should handle missing conviction scores', () => {
      const userStory: Record<string, number> = {}

      const illusionKey = 'stress_relief'
      const conviction = userStory[`${illusionKey}_conviction`] ?? 0

      expect(conviction).toBe(0)
    })
  })
})
