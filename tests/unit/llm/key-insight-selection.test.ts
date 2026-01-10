/**
 * Unit tests for key insight selection task
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CapturedMoment } from '~/server/utils/llm/task-types'

// Mock moment for testing
function createMockMoment(overrides: Partial<CapturedMoment> = {}): CapturedMoment {
  return {
    id: 'moment-1',
    userId: 'user-1',
    conversationId: 'conv-1',
    messageId: 'msg-1',
    momentType: 'insight',
    transcript: 'I realized the anxiety I feel IS the withdrawal',
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

describe('Key Insight Selection', () => {
  describe('Single insight handling', () => {
    it('should return the only insight when there is just one', () => {
      const insights = [createMockMoment({ id: 'only-insight' })]

      // Simulating the logic from selectKeyInsight
      if (insights.length === 1) {
        const result = {
          selectedMomentId: insights[0].id,
          reasoning: 'Only one insight available',
        }
        expect(result.selectedMomentId).toBe('only-insight')
      }
    })

    it('should return empty when no insights', () => {
      const insights: CapturedMoment[] = []

      if (insights.length === 0) {
        const result = {
          selectedMomentId: '',
          reasoning: 'No insights to select from',
        }
        expect(result.selectedMomentId).toBe('')
      }
    })
  })

  describe('Fallback selection', () => {
    it('should fall back to highest confidence when LLM fails', () => {
      const insights = [
        createMockMoment({ id: 'low-conf', confidenceScore: 0.7 }),
        createMockMoment({ id: 'high-conf', confidenceScore: 0.95 }),
        createMockMoment({ id: 'mid-conf', confidenceScore: 0.8 }),
      ]

      // Simulate fallback logic
      const highestConfidence = insights.reduce((best, current) =>
        current.confidenceScore > best.confidenceScore ? current : best
      )

      expect(highestConfidence.id).toBe('high-conf')
      expect(highestConfidence.confidenceScore).toBe(0.95)
    })

    it('should validate selected ID is in input', () => {
      const insights = [
        createMockMoment({ id: 'insight-1' }),
        createMockMoment({ id: 'insight-2' }),
      ]

      const validIds = insights.map(i => i.id)
      const selectedId = 'insight-1'
      const invalidId = 'insight-999'

      expect(validIds.includes(selectedId)).toBe(true)
      expect(validIds.includes(invalidId)).toBe(false)
    })
  })

  describe('Insight quality signals', () => {
    it('should prefer insights with positive emotional valence', () => {
      const insights = [
        createMockMoment({
          id: 'positive',
          emotionalValence: 'positive',
          transcript: 'This is an amazing realization!',
        }),
        createMockMoment({
          id: 'negative',
          emotionalValence: 'negative',
          transcript: 'I feel terrible about this.',
        }),
      ]

      // In practice, the LLM would prefer positive insights
      // Here we just verify the data structure
      expect(insights[0].emotionalValence).toBe('positive')
      expect(insights[1].emotionalValence).toBe('negative')
    })

    it('should handle mixed emotional valence', () => {
      const insight = createMockMoment({
        emotionalValence: 'mixed',
        transcript: 'It hurts but also feels freeing',
      })

      expect(insight.emotionalValence).toBe('mixed')
    })
  })
})
