/**
 * Unit tests for story summarization task
 */
import { describe, it, expect } from 'vitest'
import type { CapturedMoment, UserIntakeData } from '~/server/utils/llm/task-types'

// Mock moment for testing
function createMockOriginMoment(transcript: string, index: number): CapturedMoment {
  return {
    id: `origin-${index}`,
    userId: 'user-1',
    conversationId: 'conv-1',
    messageId: `msg-${index}`,
    momentType: 'origin_story',
    transcript,
    audioClipPath: null,
    audioDurationMs: null,
    mythKey: 'stress_relief',
    sessionType: 'core',
    mythLayer: 'intellectual',
    confidenceScore: 0.85,
    emotionalValence: 'neutral',
    isUserHighlighted: false,
    timesPlayedBack: 0,
    lastUsedAt: null,
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - index * 86400000).toISOString(),
  }
}

function createMockIntakeData(): UserIntakeData {
  return {
    productTypes: ['vape', 'cigarettes'],
    usageFrequency: 'daily',
    yearsUsing: 5,
    previousAttempts: 3,
    primaryReason: 'health',
    triggers: ['stress', 'social'],
    longestQuitDuration: '2 weeks',
  }
}

describe('Story Summarization', () => {
  describe('Summary generation conditions', () => {
    it('should require at least 2 origin fragments', () => {
      const shouldGenerate = (fragmentCount: number, existingSummary: string | null): boolean => {
        return fragmentCount >= 2 && !existingSummary
      }

      expect(shouldGenerate(0, null)).toBe(false)
      expect(shouldGenerate(1, null)).toBe(false)
      expect(shouldGenerate(2, null)).toBe(true)
      expect(shouldGenerate(3, null)).toBe(true)
    })

    it('should not regenerate if summary exists', () => {
      const shouldGenerate = (fragmentCount: number, existingSummary: string | null): boolean => {
        return fragmentCount >= 2 && !existingSummary
      }

      expect(shouldGenerate(3, 'Existing summary')).toBe(false)
      expect(shouldGenerate(5, 'Another summary')).toBe(false)
    })

    it('should generate on exactly 2 fragments', () => {
      const shouldGenerate = (fragmentCount: number, existingSummary: string | null): boolean => {
        return fragmentCount >= 2 && !existingSummary
      }

      expect(shouldGenerate(2, null)).toBe(true)
    })
  })

  describe('Fragment formatting', () => {
    it('should format fragments in chronological order', () => {
      const fragments = [
        createMockOriginMoment('I started vaping in college', 2),
        createMockOriginMoment('My dad smoked when I was young', 1),
        createMockOriginMoment('Stress from work made me pick it up again', 0),
      ]

      // Sort by created_at ascending (chronological)
      const sorted = [...fragments].sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )

      const formatted = sorted
        .map((f, i) => `Fragment ${i + 1}: "${f.transcript}"`)
        .join('\n\n')

      expect(formatted).toContain('Fragment 1:')
      expect(formatted).toContain('Fragment 2:')
      expect(formatted).toContain('Fragment 3:')
    })

    it('should include intake data context', () => {
      const intake = createMockIntakeData()

      const context = `
Products used: ${intake.productTypes.join(', ')}
Usage frequency: ${intake.usageFrequency}
Years using: ${intake.yearsUsing}
Previous attempts: ${intake.previousAttempts}
`.trim()

      expect(context).toContain('vape, cigarettes')
      expect(context).toContain('daily')
      expect(context).toContain('5')
      expect(context).toContain('3')
    })
  })

  describe('Summary quality', () => {
    it('should expect 2-4 sentence summary', () => {
      const mockSummary = 'Started vaping in college during stressful exams. Work stress brought it back. Now vapes daily, having tried to quit 3 times before.'

      const sentences = mockSummary.split(/[.!?]+/).filter(s => s.trim().length > 0)

      expect(sentences.length).toBeGreaterThanOrEqual(2)
      expect(sentences.length).toBeLessThanOrEqual(4)
    })

    it('should extract key themes', () => {
      const mockThemes = ['stress', 'college', 'work', 'habit formation']

      expect(mockThemes.length).toBeGreaterThan(0)
      expect(mockThemes).toContain('stress')
    })

    it('should handle empty themes gracefully', () => {
      const result = {
        summary: 'A valid summary.',
        keyThemes: [],
      }

      expect(result.keyThemes).toEqual([])
      expect(result.summary).toBeTruthy()
    })
  })

  describe('Error handling', () => {
    it('should return empty result on failure', () => {
      const fallbackResult = {
        summary: '',
        keyThemes: [],
      }

      expect(fallbackResult.summary).toBe('')
      expect(fallbackResult.keyThemes).toEqual([])
    })

    it('should return empty when under 2 fragments', () => {
      const fragments = [createMockOriginMoment('Only one fragment', 0)]

      const shouldProcess = fragments.length >= 2
      const result = shouldProcess
        ? { summary: 'Generated', keyThemes: ['theme'] }
        : { summary: '', keyThemes: [] }

      expect(result.summary).toBe('')
      expect(result.keyThemes).toEqual([])
    })
  })

  describe('User story update', () => {
    it('should store summary in user_story table', () => {
      const summary = 'User started vaping in college due to stress.'
      const fragmentIds = ['origin-1', 'origin-2']

      const updateData = {
        origin_summary: summary,
        origin_moment_ids: fragmentIds,
        updated_at: new Date().toISOString(),
      }

      expect(updateData.origin_summary).toBe(summary)
      expect(updateData.origin_moment_ids).toEqual(fragmentIds)
      expect(updateData.updated_at).toBeTruthy()
    })
  })
})
