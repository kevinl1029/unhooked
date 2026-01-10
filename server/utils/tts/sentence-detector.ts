/**
 * Sentence Detector for Streaming TTS
 *
 * Accumulates tokens and detects complete sentences for incremental TTS synthesis.
 * Sentences are detected by terminal punctuation (.!?) followed by whitespace or EOF.
 */

export class SentenceDetector {
  private buffer: string = ''

  // Regex to find sentence endings: .!? followed by space, newline, or end of string
  // Also handles multiple punctuation like "..." or "!?"
  private sentenceEndPattern = /[.!?]+(?:\s|$)/

  /**
   * Add a token to the buffer and extract any complete sentences.
   * @param token - The token to add
   * @returns Array of complete sentences (may be empty if no sentence is complete)
   */
  addToken(token: string): string[] {
    this.buffer += token
    return this.extractCompleteSentences()
  }

  /**
   * Flush the remaining buffer content as a final sentence.
   * Call this when the LLM stream is complete.
   * @returns The remaining text, or null if buffer is empty
   */
  flush(): string | null {
    const remaining = this.buffer.trim()
    this.buffer = ''
    return remaining.length > 0 ? remaining : null
  }

  /**
   * Get the current buffer content (for debugging)
   */
  getBuffer(): string {
    return this.buffer
  }

  /**
   * Reset the detector state
   */
  reset(): void {
    this.buffer = ''
  }

  private extractCompleteSentences(): string[] {
    const sentences: string[] = []

    // Keep extracting sentences while we find complete ones
    let match: RegExpExecArray | null
    while ((match = this.sentenceEndPattern.exec(this.buffer)) !== null) {
      // Calculate where the sentence ends (including the punctuation)
      const sentenceEnd = match.index + match[0].length

      // Extract the sentence
      const sentence = this.buffer.slice(0, sentenceEnd).trim()

      if (sentence.length > 0) {
        sentences.push(sentence)
      }

      // Remove the extracted sentence from the buffer
      this.buffer = this.buffer.slice(sentenceEnd)

      // Reset regex lastIndex since we modified the string
      this.sentenceEndPattern.lastIndex = 0
    }

    return sentences
  }
}

/**
 * Create a new sentence detector instance
 */
export function createSentenceDetector(): SentenceDetector {
  return new SentenceDetector()
}
