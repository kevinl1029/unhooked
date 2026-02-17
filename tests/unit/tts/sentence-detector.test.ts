/**
 * Tests for SentenceDetector
 *
 * Covers basic sentence detection and the short-sentence merging feature
 * that prevents tiny audio chunks from causing audible gaps.
 */

import { describe, it, expect } from 'vitest'
import { SentenceDetector } from '~/server/utils/tts/sentence-detector'

describe('SentenceDetector', () => {
  describe('basic sentence detection (no merging)', () => {
    it('should detect a complete sentence', () => {
      const detector = new SentenceDetector()
      const result = detector.addToken('Hello world. ')
      expect(result).toEqual(['Hello world.'])
    })

    it('should detect multiple sentences in one token', () => {
      const detector = new SentenceDetector()
      const result = detector.addToken('First. Second. ')
      expect(result).toEqual(['First.', 'Second.'])
    })

    it('should accumulate across tokens', () => {
      const detector = new SentenceDetector()
      expect(detector.addToken('Hello ')).toEqual([])
      expect(detector.addToken('world. ')).toEqual(['Hello world.'])
    })

    it('should flush remaining buffer', () => {
      const detector = new SentenceDetector()
      detector.addToken('Hello world')
      expect(detector.flush()).toBe('Hello world')
    })

    it('should return null on flush when empty', () => {
      const detector = new SentenceDetector()
      expect(detector.flush()).toBeNull()
    })

    it('should handle question marks and exclamation points', () => {
      const detector = new SentenceDetector()
      const result = detector.addToken('Really? Yes! ')
      expect(result).toEqual(['Really?', 'Yes!'])
    })
  })

  describe('short-sentence merging', () => {
    it('should merge a short sentence with the next sentence', () => {
      const detector = new SentenceDetector({ minWords: 6 })
      // "Hey Kev." is 2 words — too short, gets buffered
      expect(detector.addToken('Hey Kev. ')).toEqual([])
      // Next sentence pushes it over the threshold
      const result = detector.addToken('Since we talked about how that label felt. ')
      expect(result).toEqual(['Hey Kev. Since we talked about how that label felt.'])
    })

    it('should pass through sentences at or above the threshold', () => {
      const detector = new SentenceDetector({ minWords: 6 })
      const result = detector.addToken('This is a sentence with six words. ')
      expect(result).toEqual(['This is a sentence with six words.'])
    })

    it('should accumulate multiple short sentences before merging', () => {
      const detector = new SentenceDetector({ minWords: 6 })
      // "Hi." = 1 word, "Sure." = 1 word — both too short
      expect(detector.addToken('Hi. ')).toEqual([])
      expect(detector.addToken('Sure. ')).toEqual([])
      // "Let me think about that for a moment." pushes total over threshold
      const result = detector.addToken('Let me think about that for a moment. ')
      // "Hi. Sure." = 2 words + "Let me think about that for a moment." = 8 words = 10 total
      expect(result).toEqual(['Hi. Sure. Let me think about that for a moment.'])
    })

    it('should emit buffered short sentence on flush', () => {
      const detector = new SentenceDetector({ minWords: 6 })
      detector.addToken('Hey Kev. ')
      // Nothing more arrives — flush returns the short sentence as-is
      expect(detector.flush()).toBe('Hey Kev.')
    })

    it('should combine merge buffer with remaining text on flush', () => {
      const detector = new SentenceDetector({ minWords: 6 })
      detector.addToken('Hey Kev. ')
      // Add incomplete sentence (no terminal punctuation yet)
      detector.addToken('Since we talked about')
      // Flush combines merge buffer + remaining buffer
      expect(detector.flush()).toBe('Hey Kev. Since we talked about')
    })

    it('should not merge when minWords is 1 (default)', () => {
      const detector = new SentenceDetector({ minWords: 1 })
      const result = detector.addToken('Hi. Sure. ')
      expect(result).toEqual(['Hi.', 'Sure.'])
    })

    it('should not merge when no options provided', () => {
      const detector = new SentenceDetector()
      const result = detector.addToken('Hi. Sure. ')
      expect(result).toEqual(['Hi.', 'Sure.'])
    })

    it('should reset merge buffer on reset()', () => {
      const detector = new SentenceDetector({ minWords: 6 })
      detector.addToken('Hey Kev. ')
      detector.reset()
      // After reset, merge buffer is cleared
      const result = detector.addToken('This is a brand new long sentence. ')
      expect(result).toEqual(['This is a brand new long sentence.'])
    })

    it('should handle short sentence followed by long sentence in same token', () => {
      const detector = new SentenceDetector({ minWords: 6 })
      const result = detector.addToken('Hey Kev. Since we talked about how things have been going lately. ')
      expect(result).toEqual(['Hey Kev. Since we talked about how things have been going lately.'])
    })

    it('should handle multiple sentences where first is short and rest are long', () => {
      const detector = new SentenceDetector({ minWords: 6 })
      const result = detector.addToken('Hey Kev. Since we talked about that label. You were going to keep an eye on those moments. ')
      // "Hey Kev." merges with next sentence, third sentence stands alone
      expect(result).toEqual([
        'Hey Kev. Since we talked about that label.',
        'You were going to keep an eye on those moments.'
      ])
    })
  })
})
