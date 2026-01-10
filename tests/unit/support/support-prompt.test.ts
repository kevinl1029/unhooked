/**
 * Unit tests for support conversation prompt builder
 */
import { describe, it, expect } from 'vitest'
import { buildSupportPrompt, type SupportMode } from '~/server/utils/prompts/support-prompt'

// Mock context
function createMockContext(overrides = {}) {
  return {
    background: {
      productTypes: ['vape'],
      usageFrequency: 'daily',
      yearsUsing: 3,
      previousAttempts: 2,
      triggers: ['stress', 'boredom'],
      primaryReason: 'health',
    },
    originSummary: 'Started vaping in college during stressful exams.',
    convictions: {
      stress_relief: 8,
      pleasure_illusion: 7,
    },
    keyInsights: [
      { mythKey: 'stress_relief', transcript: 'The anxiety IS the withdrawal' },
    ],
    recentMoments: [
      { moment_type: 'insight', transcript: 'I feel better already', myth_key: 'stress_relief' },
    ],
    personalStakes: ['Be healthy for my kids', 'Save money'],
    primaryTriggers: ['Morning coffee', 'After meals'],
    ceremonyCompleted: true,
    alreadyQuit: false,
    ...overrides,
  }
}

describe('Support Prompt Builder', () => {
  describe('Mode-specific intros', () => {
    it('should include struggling-specific intro', () => {
      const context = createMockContext()
      const prompt = buildSupportPrompt(context, 'struggling')

      expect(prompt).toContain('struggling')
      expect(prompt).toContain('courage')
    })

    it('should include boost-specific intro', () => {
      const context = createMockContext()
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('motivational')
      expect(prompt).toContain('reinforcement')
    })
  })

  describe('Context inclusion', () => {
    it('should include user background', () => {
      const context = createMockContext()
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('vape')
      expect(prompt).toContain('daily')
      expect(prompt).toContain('health')
    })

    it('should include origin summary', () => {
      const context = createMockContext()
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('Started vaping in college')
    })

    it('should include key insights', () => {
      const context = createMockContext()
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('The anxiety IS the withdrawal')
      expect(prompt).toContain('stress_relief')
    })

    it('should include personal stakes', () => {
      const context = createMockContext()
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('Be healthy for my kids')
      expect(prompt).toContain('Save money')
    })

    it('should include triggers', () => {
      const context = createMockContext()
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('Morning coffee')
      expect(prompt).toContain('After meals')
    })
  })

  describe('Ceremony status', () => {
    it('should note ceremony completion', () => {
      const context = createMockContext({ ceremonyCompleted: true })
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('completed their ceremony')
      expect(prompt).toContain('reinforcement mode')
    })

    it('should celebrate organic quit', () => {
      const context = createMockContext({ ceremonyCompleted: true, alreadyQuit: true })
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('quit organically')
    })
  })

  describe('Empty/missing data handling', () => {
    it('should handle missing background', () => {
      const context = createMockContext({ background: null })
      const prompt = buildSupportPrompt(context, 'boost')

      // Should not throw, should still build prompt
      expect(prompt).toContain('supportive coach')
    })

    it('should handle empty key insights', () => {
      const context = createMockContext({ keyInsights: [] })
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).not.toContain('Key Insights')
    })

    it('should handle empty stakes and triggers', () => {
      const context = createMockContext({ personalStakes: [], primaryTriggers: [] })
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).not.toContain('At Stake')
      expect(prompt).not.toContain('Known Triggers')
    })
  })

  describe('Base prompt content', () => {
    it('should include empathy guidance', () => {
      const context = createMockContext()
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('empathy')
      expect(prompt).toContain('without judgment')
    })

    it('should include medical disclaimer', () => {
      const context = createMockContext()
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('NOT a medical professional')
    })

    it('should encourage using user\'s own words', () => {
      const context = createMockContext()
      const prompt = buildSupportPrompt(context, 'boost')

      expect(prompt).toContain('their own words')
    })
  })
})
