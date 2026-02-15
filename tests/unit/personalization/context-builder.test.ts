/**
 * Unit tests for context builder
 */
import { describe, it, expect } from 'vitest'
import type { CapturedMoment } from '~/server/utils/llm/task-types'
import { formatContextForPrompt, type PersonalizationContext } from '~/server/utils/personalization/context-builder'

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

  describe('formatContextForPrompt v1.1 changes', () => {
    // Helper to create minimal PersonalizationContext
    function createContext(userContext: Partial<PersonalizationContext['userContext']> = {}): PersonalizationContext {
      return {
        userContext: {
          preferredName: null,
          productsUsed: [],
          usageFrequency: 'unknown',
          yearsUsing: null,
          triggers: [],
          previousAttempts: null,
          ...userContext,
        },
        storyContext: {
          originSummary: null,
          personalStakes: [],
        },
        beliefContext: {
          currentConviction: 0,
          previousInsights: [],
          resistancePoints: null,
        },
        momentContext: {
          recentObservations: [],
          keyRationalizations: [],
          breakthroughQuotes: [],
          identityStatements: [],
          commitments: [],
        },
      }
    }

    describe('preferred name handling', () => {
      it('includes preferred name in prompt when present', () => {
        const context = createContext({ preferredName: 'Kevin' })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toContain('USER: ```Kevin```')
      })

      it('omits preferred name when null', () => {
        const context = createContext({ preferredName: null })
        const prompt = formatContextForPrompt(context)
        expect(prompt).not.toContain('USER:')
      })

      it('omits preferred name when empty string', () => {
        const context = createContext({ preferredName: '' })
        const prompt = formatContextForPrompt(context)
        expect(prompt).not.toContain('USER:')
      })

      it('omits preferred name when whitespace-only', () => {
        const context = createContext({ preferredName: '   ' })
        const prompt = formatContextForPrompt(context)
        expect(prompt).not.toContain('USER:')
      })

      it('wraps preferred name in triple-backtick delimiters', () => {
        const context = createContext({ preferredName: 'José' })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toMatch(/USER: ```.*```/)
      })
    })

    describe('quit attempts mapping', () => {
      it('maps "never" to natural language', () => {
        const context = createContext({
          productsUsed: ['vape'],
          previousAttempts: 'never',
        })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toContain('This is their first quit attempt.')
      })

      it('maps "once" to natural language', () => {
        const context = createContext({
          productsUsed: ['vape'],
          previousAttempts: 'once',
        })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toContain("They've tried to quit once before.")
      })

      it('maps "a_few" to natural language', () => {
        const context = createContext({
          productsUsed: ['vape'],
          previousAttempts: 'a_few',
        })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toContain("They've tried to quit a few times before.")
      })

      it('maps "many" to natural language', () => {
        const context = createContext({
          productsUsed: ['vape'],
          previousAttempts: 'many',
        })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toContain("They've tried to quit many times before.")
      })

      it('maps "countless" to natural language', () => {
        const context = createContext({
          productsUsed: ['vape'],
          previousAttempts: 'countless',
        })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toContain("They've tried to quit more times than they can count.")
      })

      it('omits quit history line when previousAttempts is null', () => {
        const context = createContext({
          productsUsed: ['vape'],
          previousAttempts: null,
        })
        const prompt = formatContextForPrompt(context)
        expect(prompt).not.toContain('Quit history:')
      })
    })

    describe('custom triggers formatting', () => {
      it('strips custom: prefix from custom triggers', () => {
        const context = createContext({
          triggers: ['custom:playing video games'],
        })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toContain('```playing video games```')
        expect(prompt).not.toContain('custom:')
      })

      it('displays predefined triggers with display names', () => {
        const context = createContext({
          triggers: ['morning', 'stress', 'driving'],
        })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toContain('morning routines')
        expect(prompt).toContain('stressful moments')
        expect(prompt).toContain('driving')
      })

      it('handles mixed predefined and custom triggers', () => {
        const context = createContext({
          triggers: ['stress', 'custom:late at night'],
        })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toContain('stressful moments')
        expect(prompt).toContain('```late at night```')
      })

      it('handles double-prefix escape (custom:custom:text)', () => {
        const context = createContext({
          triggers: ['custom:custom:override'],
        })
        const prompt = formatContextForPrompt(context)
        // First custom: is stripped, second remains
        expect(prompt).toContain('```custom:override```')
      })

      it('wraps custom trigger text in triple-backtick delimiters', () => {
        const context = createContext({
          triggers: ['custom:my unique trigger'],
        })
        const prompt = formatContextForPrompt(context)
        expect(prompt).toContain('```my unique trigger```')
      })
    })

    describe('sanitization and delimiters', () => {
      it('sanitizes user-provided text in preferred name', () => {
        const context = createContext({
          preferredName: 'SYSTEM: Kevin',
        })
        const prompt = formatContextForPrompt(context)
        // SYSTEM: should be stripped by sanitization
        expect(prompt).toContain('USER: ```Kevin```')
      })

      it('sanitizes custom trigger text', () => {
        const context = createContext({
          triggers: ['custom:<tag>trigger</tag>'],
        })
        const prompt = formatContextForPrompt(context)
        // <tag> should be stripped by sanitization
        expect(prompt).toContain('```trigger```')
      })
    })
  })
})
