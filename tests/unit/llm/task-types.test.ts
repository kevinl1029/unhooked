import { describe, it, expect } from 'vitest'
import {
  ILLUSION_KEYS,
  ILLUSION_DATA,
  illusionNumberToKey,
  illusionKeyToNumber,
  validateCheatSheet,
  type IllusionKey,
  type CheatSheetData,
} from '~/server/utils/llm/task-types'

describe('task-types', () => {
  describe('ILLUSION_KEYS', () => {
    it('contains all 5 illusion keys in correct order', () => {
      expect(ILLUSION_KEYS).toEqual([
        'stress_relief',
        'pleasure',
        'willpower',
        'focus',
        'identity',
      ])
    })

    it('has correct length', () => {
      expect(ILLUSION_KEYS.length).toBe(5)
    })
  })

  describe('ILLUSION_DATA', () => {
    it('maps all illusion keys to correct data', () => {
      expect(ILLUSION_DATA.stress_relief).toEqual({
        number: 1,
        displayName: 'The Stress Relief Illusion',
        shortName: 'Stress',
      })

      expect(ILLUSION_DATA.pleasure).toEqual({
        number: 2,
        displayName: 'The Pleasure Illusion',
        shortName: 'Pleasure',
      })

      expect(ILLUSION_DATA.willpower).toEqual({
        number: 3,
        displayName: 'The Willpower Illusion',
        shortName: 'Willpower',
      })

      expect(ILLUSION_DATA.focus).toEqual({
        number: 4,
        displayName: 'The Focus Illusion',
        shortName: 'Focus',
      })

      expect(ILLUSION_DATA.identity).toEqual({
        number: 5,
        displayName: 'The Identity Illusion',
        shortName: 'Identity',
      })
    })
  })

  describe('illusionNumberToKey', () => {
    it('converts valid illusion numbers to keys', () => {
      expect(illusionNumberToKey(1)).toBe('stress_relief')
      expect(illusionNumberToKey(2)).toBe('pleasure')
      expect(illusionNumberToKey(3)).toBe('willpower')
      expect(illusionNumberToKey(4)).toBe('focus')
      expect(illusionNumberToKey(5)).toBe('identity')
    })

    it('returns null for invalid illusion numbers', () => {
      expect(illusionNumberToKey(0)).toBeNull()
      expect(illusionNumberToKey(6)).toBeNull()
      expect(illusionNumberToKey(-1)).toBeNull()
    })
  })

  describe('illusionKeyToNumber', () => {
    it('converts valid illusion keys to numbers', () => {
      expect(illusionKeyToNumber('stress_relief')).toBe(1)
      expect(illusionKeyToNumber('pleasure')).toBe(2)
      expect(illusionKeyToNumber('willpower')).toBe(3)
      expect(illusionKeyToNumber('focus')).toBe(4)
      expect(illusionKeyToNumber('identity')).toBe(5)
    })

    it('returns null for invalid illusion keys', () => {
      expect(illusionKeyToNumber('invalid')).toBeNull()
      expect(illusionKeyToNumber('')).toBeNull()
      expect(illusionKeyToNumber('stress')).toBeNull()
    })
  })

  describe('validateCheatSheet', () => {
    const validCheatSheet: CheatSheetData = {
      entries: [
        {
          illusionKey: 'stress_relief',
          name: 'Stress Relief',
          illusion: 'Nicotine helps me manage stress',
          truth: 'Nicotine creates the stress it appears to relieve',
          userInsight: 'I realized the anxiety was withdrawal',
          insightMomentId: 'moment-123',
        },
      ],
      generatedAt: '2024-01-01T00:00:00Z',
    }

    it('validates a correct cheat sheet', () => {
      expect(validateCheatSheet(validCheatSheet)).toBe(true)
    })

    it('validates cheat sheet without optional insight fields', () => {
      const sheet: CheatSheetData = {
        entries: [
          {
            illusionKey: 'stress_relief',
            name: 'Stress Relief',
            illusion: 'Nicotine helps me manage stress',
            truth: 'Nicotine creates the stress',
          },
        ],
        generatedAt: '2024-01-01T00:00:00Z',
      }
      expect(validateCheatSheet(sheet)).toBe(true)
    })

    it('rejects null data', () => {
      expect(validateCheatSheet(null)).toBe(false)
    })

    it('rejects non-object data', () => {
      expect(validateCheatSheet('string')).toBe(false)
      expect(validateCheatSheet(123)).toBe(false)
      expect(validateCheatSheet([])).toBe(false)
    })

    it('rejects cheat sheet without entries array', () => {
      expect(validateCheatSheet({ generatedAt: '2024-01-01' })).toBe(false)
    })

    it('rejects cheat sheet without generatedAt', () => {
      expect(validateCheatSheet({ entries: [] })).toBe(false)
    })

    it('rejects cheat sheet with invalid entry', () => {
      const invalid = {
        entries: [{ illusionKey: 'stress_relief' }], // Missing required fields
        generatedAt: '2024-01-01',
      }
      expect(validateCheatSheet(invalid)).toBe(false)
    })

    it('rejects entry with non-string illusionKey', () => {
      const invalid = {
        entries: [
          {
            illusionKey: 123,
            name: 'Test',
            illusion: 'Test',
            truth: 'Test',
          },
        ],
        generatedAt: '2024-01-01',
      }
      expect(validateCheatSheet(invalid)).toBe(false)
    })
  })
})
