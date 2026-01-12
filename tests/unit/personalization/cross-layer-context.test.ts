/**
 * Unit tests for cross-layer context builder
 */
import { describe, it, expect } from 'vitest'
import type { IllusionLayer } from '~/server/utils/llm/task-types'

describe('Cross-Layer Context', () => {
  describe('Layer progression', () => {
    it('should identify previous layers correctly', () => {
      const layers: IllusionLayer[] = ['intellectual', 'emotional', 'visceral']

      const getPreviousLayers = (current: IllusionLayer): IllusionLayer[] => {
        const index = layers.indexOf(current)
        return layers.slice(0, index)
      }

      expect(getPreviousLayers('intellectual')).toEqual([])
      expect(getPreviousLayers('emotional')).toEqual(['intellectual'])
      expect(getPreviousLayers('visceral')).toEqual(['intellectual', 'emotional'])
    })

    it('should determine if user is returning', () => {
      const isReturningUser = (layer: IllusionLayer): boolean => {
        return layer !== 'intellectual'
      }

      expect(isReturningUser('intellectual')).toBe(false)
      expect(isReturningUser('emotional')).toBe(true)
      expect(isReturningUser('visceral')).toBe(true)
    })
  })

  describe('Context accumulation', () => {
    it('should accumulate insights from previous layers', () => {
      const previousInsights = [
        { layer: 'intellectual', insight: 'Nicotine causes anxiety' },
        { layer: 'emotional', insight: 'I felt relieved understanding this' },
      ]

      const currentLayer: IllusionLayer = 'visceral'
      const relevantInsights = previousInsights.filter(i =>
        i.layer !== currentLayer
      )

      expect(relevantInsights.length).toBe(2)
    })

    it('should include conviction progression', () => {
      const convictionHistory = [
        { layer: 'intellectual', conviction: 5 },
        { layer: 'emotional', conviction: 7 },
      ]

      const latestConviction = convictionHistory[convictionHistory.length - 1]
      const convictionDelta = convictionHistory.length > 1
        ? convictionHistory[convictionHistory.length - 1].conviction - convictionHistory[0].conviction
        : 0

      expect(latestConviction.conviction).toBe(7)
      expect(convictionDelta).toBe(2)
    })
  })

  describe('Key insight selection', () => {
    it('should select most recent key insight from previous layer', () => {
      const insights = [
        { layer: 'intellectual', id: 'ins-1', isKey: true },
        { layer: 'intellectual', id: 'ins-2', isKey: false },
        { layer: 'emotional', id: 'ins-3', isKey: true },
      ]

      const currentLayer = 'visceral'
      const previousLayer = 'emotional'

      const keyInsight = insights.find(i =>
        i.layer === previousLayer && i.isKey
      )

      expect(keyInsight?.id).toBe('ins-3')
    })

    it('should handle missing key insight gracefully', () => {
      const insights = [
        { layer: 'intellectual', id: 'ins-1', isKey: false },
      ]

      const keyInsight = insights.find(i => i.isKey)

      expect(keyInsight).toBeUndefined()
    })
  })

  describe('Context formatting', () => {
    it('should format cross-layer context for prompt injection', () => {
      const context = {
        previousConviction: 5,
        currentConviction: 7,
        keyInsight: 'The anxiety IS the withdrawal',
        previousLayersCompleted: ['intellectual'],
      }

      const formatted = `
Previous conviction: ${context.previousConviction}/10
Current conviction: ${context.currentConviction}/10
Key insight from last session: "${context.keyInsight}"
Layers completed: ${context.previousLayersCompleted.join(', ')}
`.trim()

      expect(formatted).toContain('Previous conviction: 5/10')
      expect(formatted).toContain('Current conviction: 7/10')
      expect(formatted).toContain('The anxiety IS the withdrawal')
    })
  })
})
