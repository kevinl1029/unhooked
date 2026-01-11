import { describe, it, expect } from 'vitest'
import { sanitizeForTTS, findSystemTokens } from '~/server/utils/tts/sanitize'

describe('sanitizeForTTS', () => {
  describe('system tokens', () => {
    it('removes [SESSION_COMPLETE] token', () => {
      const input = 'Great work today! [SESSION_COMPLETE]'
      expect(sanitizeForTTS(input)).toBe('Great work today!')
    })

    it('removes [SESSION_COMPLETE] in the middle of text', () => {
      const input = 'First part [SESSION_COMPLETE] second part'
      expect(sanitizeForTTS(input)).toBe('First part second part')
    })

    it('removes [END] token', () => {
      const input = 'This is the end. [END]'
      expect(sanitizeForTTS(input)).toBe('This is the end.')
    })

    it('removes [DONE] token', () => {
      const input = 'All done! [DONE]'
      expect(sanitizeForTTS(input)).toBe('All done!')
    })

    it('handles case-insensitive system tokens', () => {
      const input = 'Complete! [session_complete]'
      expect(sanitizeForTTS(input)).toBe('Complete!')
    })

    it('removes multiple system tokens', () => {
      const input = '[START] Hello there [PAUSE] and goodbye [END]'
      expect(sanitizeForTTS(input)).toBe('Hello there and goodbye')
    })
  })

  describe('markdown formatting', () => {
    it('removes bold markdown (**text**)', () => {
      const input = 'This is **important** text'
      expect(sanitizeForTTS(input)).toBe('This is important text')
    })

    it('removes bold markdown (__text__)', () => {
      const input = 'This is __important__ text'
      expect(sanitizeForTTS(input)).toBe('This is important text')
    })

    it('removes italic markdown (*text*)', () => {
      const input = 'This is *emphasized* text'
      expect(sanitizeForTTS(input)).toBe('This is emphasized text')
    })

    it('removes italic markdown (_text_)', () => {
      const input = 'This is _emphasized_ text'
      expect(sanitizeForTTS(input)).toBe('This is emphasized text')
    })

    it('removes inline code markdown', () => {
      const input = 'Use the `quit` command'
      expect(sanitizeForTTS(input)).toBe('Use the quit command')
    })

    it('converts markdown links to just the text', () => {
      const input = 'Visit [our website](https://example.com) for more'
      expect(sanitizeForTTS(input)).toBe('Visit our website for more')
    })

    it('removes header markers', () => {
      const input = '# Welcome\n\nThis is content'
      expect(sanitizeForTTS(input)).toBe('Welcome\n\nThis is content')
    })

    it('removes multiple header levels', () => {
      const input = '## Section\n\n### Subsection'
      expect(sanitizeForTTS(input)).toBe('Section\n\nSubsection')
    })

    it('removes blockquote markers', () => {
      const input = '> This is a quote'
      expect(sanitizeForTTS(input)).toBe('This is a quote')
    })

    it('removes unordered list markers', () => {
      const input = '- First item\n- Second item'
      expect(sanitizeForTTS(input)).toBe('First item\nSecond item')
    })

    it('removes ordered list markers', () => {
      const input = '1. First step\n2. Second step'
      expect(sanitizeForTTS(input)).toBe('First step\nSecond step')
    })

    it('removes horizontal rules', () => {
      const input = 'Above\n---\nBelow'
      expect(sanitizeForTTS(input)).toBe('Above\n\nBelow')
    })
  })

  describe('whitespace normalization', () => {
    it('normalizes multiple spaces to single space', () => {
      const input = 'Too   many    spaces'
      expect(sanitizeForTTS(input)).toBe('Too many spaces')
    })

    it('normalizes multiple newlines', () => {
      const input = 'First\n\n\n\nSecond'
      expect(sanitizeForTTS(input)).toBe('First\n\nSecond')
    })

    it('trims leading and trailing whitespace', () => {
      const input = '  Hello world  '
      expect(sanitizeForTTS(input)).toBe('Hello world')
    })
  })

  describe('edge cases', () => {
    it('returns empty string for null input', () => {
      expect(sanitizeForTTS(null as any)).toBe('')
    })

    it('returns empty string for undefined input', () => {
      expect(sanitizeForTTS(undefined as any)).toBe('')
    })

    it('returns empty string for empty string input', () => {
      expect(sanitizeForTTS('')).toBe('')
    })

    it('handles text with no formatting', () => {
      const input = 'Just plain text with no special formatting.'
      expect(sanitizeForTTS(input)).toBe('Just plain text with no special formatting.')
    })

    it('removes all bracket content including vocal directions', () => {
      // All bracket content is removed since Groq's handling is unreliable
      // and we've observed bracket content being spoken aloud
      const input = '[cheerful] Hello there!'
      expect(sanitizeForTTS(input)).toBe('Hello there!')
    })

    it('handles complex mixed content', () => {
      const input = `## Welcome to your session

**Great** work on completing that! [SESSION_COMPLETE]

Here's what to remember:
- Stay focused
- Keep going

Visit [988 Lifeline](https://988lifeline.org) for support.`

      const expected = `Welcome to your session

Great work on completing that!

Here's what to remember:
Stay focused
Keep going

Visit 988 Lifeline for support.`

      expect(sanitizeForTTS(input)).toBe(expected)
    })
  })
})

describe('findSystemTokens', () => {
  it('finds SESSION_COMPLETE token', () => {
    const input = 'Text with [SESSION_COMPLETE] in it'
    expect(findSystemTokens(input)).toEqual(['[SESSION_COMPLETE]'])
  })

  it('finds multiple tokens', () => {
    const input = '[SESSION_COMPLETE] and [END] and [DONE]'
    expect(findSystemTokens(input)).toEqual(['[SESSION_COMPLETE]', '[END]', '[DONE]'])
  })

  it('returns empty array when no tokens found', () => {
    const input = 'Just regular text'
    expect(findSystemTokens(input)).toEqual([])
  })
})
