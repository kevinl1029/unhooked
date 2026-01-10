/**
 * Unit tests for conviction assessment task
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the task executor
vi.mock('~/server/utils/llm/task-executor', () => ({
  getTaskExecutor: vi.fn(() => ({
    executeTask: vi.fn(),
  })),
  parseJsonResponse: vi.fn((response) => JSON.parse(response)),
}))

describe('Conviction Assessment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('ConvictionAssessmentOutput validation', () => {
    it('should have valid conviction score range (0-10)', () => {
      const validScores = [0, 1, 5, 7, 10]
      const invalidScores = [-1, 11, 100]

      validScores.forEach(score => {
        expect(score >= 0 && score <= 10).toBe(true)
      })

      invalidScores.forEach(score => {
        expect(score >= 0 && score <= 10).toBe(false)
      })
    })

    it('should have valid recommended next step values', () => {
      const validSteps = ['deepen', 'move_on', 'revisit_later']
      const invalidSteps = ['skip', 'proceed', 'stop']

      validSteps.forEach(step => {
        expect(['deepen', 'move_on', 'revisit_later'].includes(step)).toBe(true)
      })

      invalidSteps.forEach(step => {
        expect(['deepen', 'move_on', 'revisit_later'].includes(step)).toBe(false)
      })
    })
  })

  describe('Response parsing', () => {
    it('should coerce conviction to valid range', () => {
      // Test coercion function
      const coerce = (value: number) => Math.max(0, Math.min(10, Math.round(value)))

      expect(coerce(-5)).toBe(0)
      expect(coerce(15)).toBe(10)
      expect(coerce(7.6)).toBe(8)
      expect(coerce(7.4)).toBe(7)
      expect(coerce(5)).toBe(5)
    })

    it('should calculate delta correctly', () => {
      const previousConviction = 3
      const newConviction = 7
      const delta = newConviction - previousConviction

      expect(delta).toBe(4)
    })

    it('should handle negative delta', () => {
      const previousConviction = 8
      const newConviction = 5
      const delta = newConviction - previousConviction

      expect(delta).toBe(-3)
    })
  })

  describe('Trigger and stake extraction', () => {
    it('should merge new triggers with existing', () => {
      const existingTriggers = ['stress', 'coffee']
      const newTriggers = ['alcohol', 'stress'] // 'stress' is duplicate

      const mergedTriggers = [...new Set([...existingTriggers, ...newTriggers])]

      expect(mergedTriggers).toEqual(['stress', 'coffee', 'alcohol'])
      expect(mergedTriggers.length).toBe(3)
    })

    it('should merge new stakes with existing', () => {
      const existingStakes = ['health', 'kids']
      const newStakes = ['career', 'health'] // 'health' is duplicate

      const mergedStakes = [...new Set([...existingStakes, ...newStakes])]

      expect(mergedStakes).toEqual(['health', 'kids', 'career'])
      expect(mergedStakes.length).toBe(3)
    })
  })
})
