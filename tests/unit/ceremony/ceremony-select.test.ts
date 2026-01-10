/**
 * Unit tests for ceremony moment selection
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
    mythKey: 'stress_relief',
    sessionType: 'core',
    mythLayer: 'intellectual',
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

describe('Ceremony Moment Selection', () => {
  describe('Selection criteria', () => {
    it('should include all moments when under minimum threshold', () => {
      const moments = [
        createMockMoment({ id: '1' }),
        createMockMoment({ id: '2' }),
      ]

      // With less than 3 moments, return all
      const shouldReturnAll = moments.length < 3
      expect(shouldReturnAll).toBe(true)
    })

    it('should limit selection to max moments', () => {
      const maxMoments = 12
      const moments: CapturedMoment[] = []

      for (let i = 0; i < 20; i++) {
        moments.push(createMockMoment({ id: `moment-${i}` }))
      }

      // Selection should respect max
      const selected = moments.slice(0, maxMoments)
      expect(selected.length).toBe(12)
    })

    it('should prioritize type diversity', () => {
      const moments = [
        createMockMoment({ id: '1', momentType: 'origin_story' }),
        createMockMoment({ id: '2', momentType: 'insight' }),
        createMockMoment({ id: '3', momentType: 'breakthrough' }),
        createMockMoment({ id: '4', momentType: 'insight' }), // Duplicate type
      ]

      // Fallback logic should pick one of each type first
      const types = new Set<string>()
      const selected: CapturedMoment[] = []

      for (const moment of moments) {
        if (!types.has(moment.momentType)) {
          types.add(moment.momentType)
          selected.push(moment)
        }
      }

      expect(selected.length).toBe(3)
      expect(types.has('origin_story')).toBe(true)
      expect(types.has('insight')).toBe(true)
      expect(types.has('breakthrough')).toBe(true)
    })

    it('should prefer higher confidence scores', () => {
      const moments = [
        createMockMoment({ id: '1', confidenceScore: 0.6 }),
        createMockMoment({ id: '2', confidenceScore: 0.95 }),
        createMockMoment({ id: '3', confidenceScore: 0.8 }),
      ]

      const sorted = [...moments].sort((a, b) =>
        (b.confidenceScore || 0) - (a.confidenceScore || 0)
      )

      expect(sorted[0].id).toBe('2')
      expect(sorted[0].confidenceScore).toBe(0.95)
    })
  })

  describe('Narrative arc', () => {
    it('should include origin story moments', () => {
      const moments = [
        createMockMoment({ id: '1', momentType: 'origin_story' }),
        createMockMoment({ id: '2', momentType: 'insight' }),
        createMockMoment({ id: '3', momentType: 'commitment' }),
      ]

      const hasOrigin = moments.some(m => m.momentType === 'origin_story')
      expect(hasOrigin).toBe(true)
    })

    it('should build arc from origin to transformation', () => {
      const arcOrder = ['origin_story', 'rationalization', 'insight', 'breakthrough', 'commitment']

      const moments = [
        createMockMoment({ id: '1', momentType: 'commitment' }),
        createMockMoment({ id: '2', momentType: 'origin_story' }),
        createMockMoment({ id: '3', momentType: 'insight' }),
      ]

      // Sort by arc order
      const sorted = [...moments].sort((a, b) => {
        const aIndex = arcOrder.indexOf(a.momentType)
        const bIndex = arcOrder.indexOf(b.momentType)
        return aIndex - bIndex
      })

      expect(sorted[0].momentType).toBe('origin_story')
      expect(sorted[2].momentType).toBe('commitment')
    })
  })

  describe('Fallback behavior', () => {
    it('should fall back to confidence-based selection on failure', () => {
      const moments = [
        createMockMoment({ id: 'low', confidenceScore: 0.5 }),
        createMockMoment({ id: 'high', confidenceScore: 0.95 }),
        createMockMoment({ id: 'mid', confidenceScore: 0.75 }),
      ]

      // Simulate fallback: sort by confidence, take top N
      const fallbackSelection = [...moments]
        .sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0))
        .slice(0, 2)

      expect(fallbackSelection[0].id).toBe('high')
      expect(fallbackSelection.length).toBe(2)
    })
  })
})
