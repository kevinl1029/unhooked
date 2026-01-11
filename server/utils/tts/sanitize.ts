/**
 * TTS Text Sanitization
 *
 * Cleans text before sending to TTS providers to ensure only
 * user-facing content is spoken aloud. Removes:
 * - System tokens like [SESSION_COMPLETE]
 * - Markdown formatting
 * - Other meta-content that shouldn't be vocalized
 */

/**
 * Known system tokens that should never be spoken
 */
const SYSTEM_TOKENS = [
  '[SESSION_COMPLETE]',
  '[END]',
  '[DONE]',
]

/**
 * Patterns to remove from TTS input
 */
const SANITIZATION_PATTERNS: Array<{ pattern: RegExp; replacement: string; description: string }> = [
  // Markdown links [text](url) - keep the text, remove the URL
  // MUST come before bracket removal so we preserve link text
  {
    pattern: /\[([^\]]+)\]\([^)]+\)/g,
    replacement: '$1',
    description: 'Markdown links'
  },
  // All bracket content - removes system tokens, vocal directions, and any other bracketed text
  // This is safer than whitelisting since Groq's handling of [directions] is unreliable
  {
    pattern: /\[[^\]]*\]/g,
    replacement: '',
    description: 'All bracket content'
  },
  // Markdown bold/italic markers
  {
    pattern: /(\*\*|__)(.*?)\1/g,
    replacement: '$2',
    description: 'Markdown bold'
  },
  {
    pattern: /(\*|_)(.*?)\1/g,
    replacement: '$2',
    description: 'Markdown italic'
  },
  // Markdown inline code
  {
    pattern: /`([^`]+)`/g,
    replacement: '$1',
    description: 'Markdown inline code'
  },
  // Markdown headers (# Header)
  {
    pattern: /^#{1,6}\s+/gm,
    replacement: '',
    description: 'Markdown headers'
  },
  // Markdown horizontal rules
  {
    pattern: /^[-*_]{3,}\s*$/gm,
    replacement: '',
    description: 'Markdown horizontal rules'
  },
  // Markdown blockquotes
  {
    pattern: /^>\s+/gm,
    replacement: '',
    description: 'Markdown blockquotes'
  },
  // Markdown list markers (unordered)
  {
    pattern: /^[-*+]\s+/gm,
    replacement: '',
    description: 'Markdown unordered list markers'
  },
  // Markdown list markers (ordered)
  {
    pattern: /^\d+\.\s+/gm,
    replacement: '',
    description: 'Markdown ordered list markers'
  },
  // Multiple consecutive spaces (normalize to single space)
  {
    pattern: /  +/g,
    replacement: ' ',
    description: 'Multiple spaces'
  },
  // Trailing spaces on lines
  {
    pattern: / +$/gm,
    replacement: '',
    description: 'Trailing spaces'
  },
  // Multiple consecutive newlines (normalize to single newline)
  {
    pattern: /\n{3,}/g,
    replacement: '\n\n',
    description: 'Multiple newlines'
  },
]

/**
 * Sanitize text for TTS synthesis.
 * Removes system tokens, markdown formatting, and other meta-content
 * that shouldn't be spoken aloud.
 *
 * @param text - The raw text to sanitize
 * @returns Cleaned text suitable for TTS
 */
export function sanitizeForTTS(text: string): string {
  if (!text || typeof text !== 'string') {
    return ''
  }

  let sanitized = text

  // Apply all sanitization patterns
  for (const { pattern, replacement } of SANITIZATION_PATTERNS) {
    sanitized = sanitized.replace(pattern, replacement)
  }

  // Trim whitespace
  sanitized = sanitized.trim()

  return sanitized
}

/**
 * Check if text contains any system tokens that would be removed.
 * Useful for debugging/logging.
 *
 * @param text - The text to check
 * @returns Array of found system tokens
 */
export function findSystemTokens(text: string): string[] {
  const found: string[] = []

  for (const token of SYSTEM_TOKENS) {
    if (text.includes(token)) {
      found.push(token)
    }
  }

  return found
}
