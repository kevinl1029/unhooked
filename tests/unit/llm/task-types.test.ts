import { describe, it, expect } from 'vitest'
import {
  MYTH_KEYS,
  MYTH_DATA,
  mythNumberToKey,
  mythKeyToNumber,
  validateCheatSheet,
  type MythKey,
  type MythsCheatSheet,
} from '~/server/utils/llm/task-types'

describe('task-types', () => {
  describe('MYTH_KEYS', () => {
    it('contains all 5 myth keys in correct order', () => {
      expect(MYTH_KEYS).toEqual([
        'stress_relief',
        'pleasure',
        'willpower',
        'focus',
        'identity',
      ])
    })

    it('has correct length', () => {
      expect(MYTH_KEYS.length).toBe(5)
    })
  })

  describe('MYTH_DATA', () => {
    it('maps all myth keys to correct data', () => {
      expect(MYTH_DATA.stress_relief).toEqual({
        number: 1,
        displayName: 'The Stress Relief Myth',
        shortName: 'Stress',
      })

      expect(MYTH_DATA.pleasure).toEqual({
        number: 2,
        displayName: 'The Pleasure Myth',
        shortName: 'Pleasure',
      })

      expect(MYTH_DATA.willpower).toEqual({
        number: 3,
        displayName: 'The Willpower Myth',
        shortName: 'Willpower',
      })

      expect(MYTH_DATA.focus).toEqual({
        number: 4,
        displayName: 'The Focus Myth',
        shortName: 'Focus',
      })

      expect(MYTH_DATA.identity).toEqual({
        number: 5,
        displayName: 'The Identity Myth',
        shortName: 'Identity',
      })
    })
  })

  describe('mythNumberToKey', () => {
    it('converts valid myth numbers to keys', () => {
      expect(mythNumberToKey(1)).toBe('stress_relief')
      expect(mythNumberToKey(2)).toBe('pleasure')
      expect(mythNumberToKey(3)).toBe('willpower')
      expect(mythNumberToKey(4)).toBe('focus')
      expect(mythNumberToKey(5)).toBe('identity')
    })

    it('returns null for invalid myth numbers', () => {
      expect(mythNumberToKey(0)).toBeNull()
      expect(mythNumberToKey(6)).toBeNull()
      expect(mythNumberToKey(-1)).toBeNull()
    })
  })

  describe('mythKeyToNumber', () => {
    it('converts valid myth keys to numbers', () => {
      expect(mythKeyToNumber('stress_relief')).toBe(1)
      expect(mythKeyToNumber('pleasure')).toBe(2)
      expect(mythKeyToNumber('willpower')).toBe(3)
      expect(mythKeyToNumber('focus')).toBe(4)
      expect(mythKeyToNumber('identity')).toBe(5)
    })

    it('returns null for invalid myth keys', () => {
      expect(mythKeyToNumber('invalid')).toBeNull()
      expect(mythKeyToNumber('')).toBeNull()
      expect(mythKeyToNumber('stress')).toBeNull()
    })
  })

  describe('validateCheatSheet', () => {
    const validCheatSheet: MythsCheatSheet = {
      myths: [
        {
          myth_key: 'stress_relief',
          myth_number: 1,
          display_name: 'The Stress Relief Myth',
          the_myth: 'Nicotine helps me manage stress',
          the_truth: 'Nicotine creates the stress it appears to relieve',
          your_insight: 'I realized the anxiety was withdrawal',
          your_insight_audio_path: null,
        },
      ],
      generated_at: '2024-01-01T00:00:00Z',
    }

    it('validates a correct cheat sheet', () => {
      expect(validateCheatSheet(validCheatSheet)).toBe(true)
    })

    it('validates cheat sheet with null insight', () => {
      const sheet: MythsCheatSheet = {
        myths: [
          {
            myth_key: 'stress_relief',
            myth_number: 1,
            display_name: 'The Stress Relief Myth',
            the_myth: 'Nicotine helps me manage stress',
            the_truth: 'Nicotine creates the stress',
            your_insight: null,
            your_insight_audio_path: null,
          },
        ],
        generated_at: '2024-01-01T00:00:00Z',
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

    it('rejects cheat sheet without myths array', () => {
      expect(validateCheatSheet({ generated_at: '2024-01-01' })).toBe(false)
    })

    it('rejects cheat sheet without generated_at', () => {
      expect(validateCheatSheet({ myths: [] })).toBe(false)
    })

    it('rejects cheat sheet with invalid myth entry', () => {
      const invalid = {
        myths: [{ myth_key: 'stress_relief' }], // Missing required fields
        generated_at: '2024-01-01',
      }
      expect(validateCheatSheet(invalid)).toBe(false)
    })

    it('rejects myth with non-string myth_key', () => {
      const invalid = {
        myths: [
          {
            myth_key: 123,
            myth_number: 1,
            display_name: 'Test',
            the_myth: 'Test',
            the_truth: 'Test',
            your_insight: null,
            your_insight_audio_path: null,
          },
        ],
        generated_at: '2024-01-01',
      }
      expect(validateCheatSheet(invalid)).toBe(false)
    })
  })
})
