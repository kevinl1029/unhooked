/**
 * Tests for InWorld extractWordTimings token-merging.
 *
 * On the 1.5/2 models the WORD response returns one entry per *token* — words,
 * punctuation, AND whitespace as separate array elements, e.g.
 *   ["", "Hello", " ", "world", ", ", "this", ...]
 * extractWordTimings must collapse that into clean, displayable words while
 * preserving accurate start/end timing.
 */

import { describe, it, expect } from 'vitest'
import { extractWordTimings } from '~/server/utils/tts/inworld'

// Helper: build a timestampInfo from parallel token/time arrays (seconds).
function ts(words: string[], starts: number[], ends: number[]) {
  return { wordAlignment: { words, wordStartTimeSeconds: starts, wordEndTimeSeconds: ends } }
}

describe('extractWordTimings - token merging (tts-2 format)', () => {
  it('returns empty for missing timestamp info', () => {
    expect(extractWordTimings(undefined)).toEqual([])
    expect(extractWordTimings({})).toEqual([])
  })

  it('keeps plain words and converts seconds to ms', () => {
    const result = extractWordTimings(
      ts(['Hello', 'world'], [0, 0.5], [0.4, 0.9])
    )
    expect(result).toEqual([
      { word: 'Hello', startMs: 0, endMs: 400 },
      { word: 'world', startMs: 500, endMs: 900 },
    ])
  })

  it('drops empty/whitespace tokens but extends the previous word through the pause', () => {
    // ["", "Hello", " ", "world"]
    const result = extractWordTimings(
      ts(['', 'Hello', ' ', 'world'], [0, 0, 0.4, 0.5], [0, 0.4, 0.5, 0.9])
    )
    expect(result).toEqual([
      // "Hello" endMs extended from 400 -> 500 by the following whitespace token
      { word: 'Hello', startMs: 0, endMs: 500 },
      { word: 'world', startMs: 500, endMs: 900 },
    ])
  })

  it('appends punctuation tokens to the preceding word and extends its end', () => {
    // ["Hello", ", ", "world", "."]
    const result = extractWordTimings(
      ts(['Hello', ', ', 'world', '.'], [0, 0.4, 0.6, 1.0], [0.4, 0.6, 1.0, 1.1])
    )
    expect(result).toEqual([
      { word: 'Hello,', startMs: 0, endMs: 600 },
      { word: 'world.', startMs: 600, endMs: 1100 },
    ])
  })

  it('discards leading punctuation/whitespace with no preceding word', () => {
    // [" ", ",", "Hi"]
    const result = extractWordTimings(
      ts([' ', ',', 'Hi'], [0, 0, 0.1], [0, 0.1, 0.5])
    )
    expect(result).toEqual([{ word: 'Hi', startMs: 100, endMs: 500 }])
  })

  it('treats numbers as words', () => {
    const result = extractWordTimings(
      ts(['I', ' ', 'quit', ' ', '10', ' ', 'days'], [0, 0.2, 0.3, 0.6, 0.7, 1.0, 1.1], [0.2, 0.3, 0.6, 0.7, 1.0, 1.1, 1.6])
    )
    expect(result.map(w => w.word)).toEqual(['I', 'quit', '10', 'days'])
  })

  it('handles a realistic mixed token stream', () => {
    // ["", "Hello", " ", "world", ", ", "this", " ", "works", "!"]
    const words = ['', 'Hello', ' ', 'world', ', ', 'this', ' ', 'works', '!']
    const starts = [0, 0, 0.40, 0.45, 0.85, 0.95, 1.30, 1.35, 1.80]
    const ends = [0, 0.40, 0.45, 0.85, 0.95, 1.30, 1.35, 1.80, 1.90]
    const result = extractWordTimings(ts(words, starts, ends))
    expect(result.map(w => w.word)).toEqual(['Hello', 'world,', 'this', 'works!'])
    // First word highlight spans through the trailing space (0.40 -> 0.45)
    expect(result[0]).toEqual({ word: 'Hello', startMs: 0, endMs: 450 })
    // "world," end extended through ", " (0.85 -> 0.95)
    expect(result[1].word).toBe('world,')
    expect(result[1].endMs).toBe(950)
  })
})
