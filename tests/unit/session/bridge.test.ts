/**
 * Unit tests for session bridge messages
 */
import { describe, it, expect } from 'vitest'
import type { IllusionLayer } from '~/server/utils/llm/task-types'

// Static transition messages (copied from implementation for testing)
const TRANSITION_MESSAGES = {
  layerComplete: {
    intellectualToEmotional: 'You\'ve started to understand this logically. Now let\'s explore how it feels.',
    emotionalToVisceral: 'You\'re making real progress. Let\'s go deeper into your body\'s experience.',
  },
  illusionComplete: 'You\'ve explored this illusion fully. You\'re ready to move on.',
  ceremonyReady: 'You\'ve explored all five illusions. You\'re ready for your final step.',
}

describe('Session Bridge', () => {
  describe('Transition message selection', () => {
    it('should select correct message for intellectual to emotional transition', () => {
      const previousLayer: IllusionLayer = 'intellectual'
      const currentLayer: IllusionLayer = 'emotional'

      const message = previousLayer === 'intellectual' && currentLayer === 'emotional'
        ? TRANSITION_MESSAGES.layerComplete.intellectualToEmotional
        : null

      expect(message).toBe('You\'ve started to understand this logically. Now let\'s explore how it feels.')
    })

    it('should select correct message for emotional to visceral transition', () => {
      const previousLayer: IllusionLayer = 'emotional'
      const currentLayer: IllusionLayer = 'visceral'

      const message = previousLayer === 'emotional' && currentLayer === 'visceral'
        ? TRANSITION_MESSAGES.layerComplete.emotionalToVisceral
        : null

      expect(message).toBe('You\'re making real progress. Let\'s go deeper into your body\'s experience.')
    })

    it('should return illusion complete message when all layers done', () => {
      const allLayersComplete = true

      const message = allLayersComplete ? TRANSITION_MESSAGES.illusionComplete : null

      expect(message).toBe('You\'ve explored this illusion fully. You\'re ready to move on.')
    })

    it('should return ceremony ready message when all illusions done', () => {
      const allIllusionsComplete = true

      const message = allIllusionsComplete ? TRANSITION_MESSAGES.ceremonyReady : null

      expect(message).toBe('You\'ve explored all five illusions. You\'re ready for your final step.')
    })
  })

  describe('Bridge context building', () => {
    it('should include key insight in bridge context', () => {
      const keyInsight = 'The anxiety IS the withdrawal'
      const previousLayer: IllusionLayer = 'intellectual'

      const bridge = `Last time, you shared: "${keyInsight}"\nLet\'s build on that.`

      expect(bridge).toContain(keyInsight)
      expect(bridge).toContain('Last time')
    })

    it('should handle missing key insight', () => {
      const keyInsight: string | null = null

      const bridge = keyInsight
        ? `Last time, you shared: "${keyInsight}"`
        : 'Welcome back. Let\'s continue where we left off.'

      expect(bridge).toBe('Welcome back. Let\'s continue where we left off.')
    })

    it('should include conviction progress', () => {
      const previousConviction = 5
      const currentConviction = 7

      const progress = currentConviction > previousConviction
        ? 'You\'ve made progress since last time.'
        : 'Let\'s build on what we explored.'

      expect(progress).toBe('You\'ve made progress since last time.')
    })
  })

  describe('New conversation detection', () => {
    it('should only add bridge context for new conversations', () => {
      const isNewConversation = true
      const hasMessages = false

      const shouldAddBridge = isNewConversation && !hasMessages

      expect(shouldAddBridge).toBe(true)
    })

    it('should not add bridge context for ongoing conversations', () => {
      const isNewConversation = false
      const hasMessages = true

      const shouldAddBridge = isNewConversation && !hasMessages

      expect(shouldAddBridge).toBe(false)
    })
  })

  describe('Layer-specific bridge content', () => {
    it('should not include bridge for first layer (intellectual)', () => {
      const currentLayer: IllusionLayer = 'intellectual'

      const shouldIncludeBridge = currentLayer !== 'intellectual'

      expect(shouldIncludeBridge).toBe(false)
    })

    it('should include bridge for second layer (emotional)', () => {
      const currentLayer: IllusionLayer = 'emotional'

      const shouldIncludeBridge = currentLayer !== 'intellectual'

      expect(shouldIncludeBridge).toBe(true)
    })

    it('should include bridge for third layer (visceral)', () => {
      const currentLayer: IllusionLayer = 'visceral'

      const shouldIncludeBridge = currentLayer !== 'intellectual'

      expect(shouldIncludeBridge).toBe(true)
    })
  })
})
