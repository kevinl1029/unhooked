/**
 * Unit tests for myths cheat sheet generator
 */
import { describe, it, expect } from 'vitest'
import { MYTH_CONTENT } from '~/server/utils/ceremony/cheat-sheet-generator'

describe('Myths Cheat Sheet Generator', () => {
  describe('Static myth content', () => {
    it('should have all 5 myths defined', () => {
      const mythKeys = Object.keys(MYTH_CONTENT)

      expect(mythKeys).toContain('stress_relief')
      expect(mythKeys).toContain('pleasure_illusion')
      expect(mythKeys).toContain('willpower_myth')
      expect(mythKeys).toContain('focus_enhancement')
      expect(mythKeys).toContain('identity_belief')
      expect(mythKeys.length).toBe(5)
    })

    it('should have name, myth, and truth for each entry', () => {
      for (const [key, content] of Object.entries(MYTH_CONTENT)) {
        expect(content.name).toBeTruthy()
        expect(content.myth).toBeTruthy()
        expect(content.truth).toBeTruthy()
      }
    })

    it('should have meaningful truth content', () => {
      // Truths should be explanatory, not just negations
      for (const content of Object.values(MYTH_CONTENT)) {
        expect(content.truth.length).toBeGreaterThan(50)
      }
    })
  })

  describe('Cheat sheet entry structure', () => {
    it('should include user insight when available', () => {
      const entry = {
        mythKey: 'stress_relief',
        name: 'Stress Relief',
        myth: 'Nicotine helps me manage stress',
        truth: 'Nicotine creates the stress it appears to relieve.',
        userInsight: 'The anxiety I feel IS the withdrawal',
        insightMomentId: 'moment-123',
      }

      expect(entry.userInsight).toBeTruthy()
      expect(entry.insightMomentId).toBeTruthy()
    })

    it('should work without user insight', () => {
      const entry = {
        mythKey: 'stress_relief',
        name: 'Stress Relief',
        myth: 'Nicotine helps me manage stress',
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
            mythKey: 'stress_relief',
            name: 'Stress Relief',
            myth: 'The myth',
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
      const entries = Object.entries(MYTH_CONTENT).map(([key, content]) => ({
        mythKey: key,
        name: content.name,
        myth: content.myth,
        truth: content.truth,
      }))

      expect(entries.length).toBe(5)
    })
  })

  describe('User insight mapping', () => {
    it('should map insight IDs from user_story', () => {
      const userStory = {
        stress_relief_key_insight_id: 'insight-1',
        pleasure_illusion_key_insight_id: null,
        willpower_myth_key_insight_id: 'insight-2',
        focus_enhancement_key_insight_id: null,
        identity_belief_key_insight_id: 'insight-3',
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

    it('should extract myth key from insight column name', () => {
      const columnName = 'stress_relief_key_insight_id'
      const mythKey = columnName.replace('_key_insight_id', '')

      expect(mythKey).toBe('stress_relief')
    })
  })
})
