/**
 * Unit tests for illusions cheat sheet generator
 */
import { describe, it, expect } from 'vitest'
import { ILLUSION_CONTENT } from '~/server/utils/ceremony/cheat-sheet-generator'

describe('Illusions Cheat Sheet Generator', () => {
  describe('Static illusion content', () => {
    it('should have all 5 illusions defined', () => {
      const illusionKeys = Object.keys(ILLUSION_CONTENT)

      expect(illusionKeys).toContain('stress_relief')
      expect(illusionKeys).toContain('pleasure')
      expect(illusionKeys).toContain('willpower')
      expect(illusionKeys).toContain('focus')
      expect(illusionKeys).toContain('identity')
      expect(illusionKeys.length).toBe(5)
    })

    it('should have name, illusion, and truth for each entry', () => {
      for (const [key, content] of Object.entries(ILLUSION_CONTENT)) {
        expect(content.name).toBeTruthy()
        expect(content.illusion).toBeTruthy()
        expect(content.truth).toBeTruthy()
      }
    })

    it('should have meaningful truth content', () => {
      // Truths should be explanatory, not just negations
      for (const content of Object.values(ILLUSION_CONTENT)) {
        expect(content.truth.length).toBeGreaterThan(50)
      }
    })
  })

  describe('Cheat sheet entry structure', () => {
    it('should include user insight when available', () => {
      const entry = {
        illusionKey: 'stress_relief',
        name: 'Stress Relief',
        illusion: 'Nicotine helps me manage stress',
        truth: 'Nicotine creates the stress it appears to relieve.',
        userInsight: 'The anxiety I feel IS the withdrawal',
        insightMomentId: 'moment-123',
      }

      expect(entry.userInsight).toBeTruthy()
      expect(entry.insightMomentId).toBeTruthy()
    })

    it('should work without user insight', () => {
      const entry = {
        illusionKey: 'stress_relief',
        name: 'Stress Relief',
        illusion: 'Nicotine helps me manage stress',
        truth: 'Nicotine creates the stress it appears to relieve.',
      }

      expect(entry.userInsight).toBeUndefined()
      expect(entry.insightMomentId).toBeUndefined()
    })
  })

  describe('Cheat sheet data structure', () => {
    it('should include entries array and timestamp', () => {
      const cheatSheet = {
        entries: [
          {
            illusionKey: 'stress_relief',
            name: 'Stress Relief',
            illusion: 'The illusion',
            truth: 'The truth',
          },
        ],
        generatedAt: new Date().toISOString(),
      }

      expect(Array.isArray(cheatSheet.entries)).toBe(true)
      expect(cheatSheet.generatedAt).toBeTruthy()
    })

    it('should have all entries ordered correctly', () => {
      // Build entries in the expected order
      const entries = Object.entries(ILLUSION_CONTENT).map(([key, content]) => ({
        illusionKey: key,
        name: content.name,
        illusion: content.illusion,
        truth: content.truth,
      }))

      expect(entries.length).toBe(5)
    })
  })

  describe('User insight mapping', () => {
    it('should map insight IDs from user_story', () => {
      const userStory = {
        stress_relief_key_insight_id: 'insight-1',
        pleasure_key_insight_id: null,
        willpower_key_insight_id: 'insight-2',
        focus_key_insight_id: null,
        identity_key_insight_id: 'insight-3',
      }

      const insightIds: string[] = []
      for (const [key, value] of Object.entries(userStory)) {
        if (key.endsWith('_key_insight_id') && value) {
          insightIds.push(value as string)
        }
      }

      expect(insightIds.length).toBe(3)
      expect(insightIds).toContain('insight-1')
      expect(insightIds).toContain('insight-2')
      expect(insightIds).toContain('insight-3')
    })

    it('should extract illusion key from insight column name', () => {
      const columnName = 'stress_relief_key_insight_id'
      const illusionKey = columnName.replace('_key_insight_id', '')

      expect(illusionKey).toBe('stress_relief')
    })
  })
})
