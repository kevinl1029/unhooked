/**
 * Sanitizes user-provided text before injection into LLM prompts.
 * Applied at context builder level (NFR-4.3).
 *
 * Strategy:
 * 1. Strip obvious LLM control patterns (NFR-4.2)
 * 2. Wrap in delimiters in the prompt template (done by formatContextForPrompt)
 */
export function sanitizeForPrompt(text: string): string {
  let sanitized = text

  // Strip lines that look like LLM role markers
  sanitized = sanitized.replace(/^(SYSTEM|ASSISTANT|Human|AI|User):\s*/gmi, '')

  // Strip markdown headers that could be confused with prompt structure
  sanitized = sanitized.replace(/^#{1,6}\s+/gm, '')

  // Strip triple backticks (our delimiter)
  sanitized = sanitized.replace(/```/g, '')

  // Strip XML-like tags that could be prompt injection
  sanitized = sanitized.replace(/<\/?[a-z][a-z0-9]*[^>]*>/gi, '')

  return sanitized.trim()
}
