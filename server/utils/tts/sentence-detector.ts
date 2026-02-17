/**
 * Sentence Detector for Streaming TTS
 *
 * Accumulates tokens and detects complete sentences for incremental TTS synthesis.
 * Sentences are detected by terminal punctuation (.!?) followed by whitespace or EOF.
 *
 * Supports short-sentence merging: when `minWords` is set, sentences shorter than
 * the threshold are buffered and prepended to the next sentence. This prevents
 * very short audio chunks (e.g., "Hey Kev.") that finish playing before the next
 * chunk is synthesized, causing audible gaps.
 */

export interface SentenceDetectorOptions {
  /**
   * Minimum word count for a sentence to be emitted on its own.
   * Sentences shorter than this are merged with the next sentence.
   * Default: 1 (no merging).
   */
  minWords?: number
}

export class SentenceDetector {
  private buffer: string = ''
  private mergeBuffer: string = ''
  private minWords: number

  // Regex to find sentence endings: .!? followed by space, newline, or end of string
  // Also handles multiple punctuation like "..." or "!?"
  private sentenceEndPattern = /[.!?]+(?:\s|$)/

  constructor(options?: SentenceDetectorOptions) {
    this.minWords = options?.minWords ?? 1
  }

  /**
   * Add a token to the buffer and extract any complete sentences.
   * Short sentences (below minWords) are held and merged with the next sentence.
   * @param token - The token to add
   * @returns Array of complete sentences (may be empty if no sentence is complete)
   */
  addToken(token: string): string[] {
    this.buffer += token
    const rawSentences = this.extractCompleteSentences()
    return this.applyMerging(rawSentences)
  }

  /**
   * Flush the remaining buffer content as a final sentence.
   * Call this when the LLM stream is complete.
   * Any short sentences held in the merge buffer are combined with remaining text.
   * @returns The remaining text, or null if buffer is empty
   */
  flush(): string | null {
    const remaining = this.buffer.trim()
    this.buffer = ''

    let final = this.mergeBuffer
    this.mergeBuffer = ''

    if (remaining) {
      final = final ? final + ' ' + remaining : remaining
    }

    return final.length > 0 ? final : null
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
    this.mergeBuffer = ''
  }

  /**
   * Apply short-sentence merging. Sentences below minWords are buffered
   * and prepended to the next sentence that pushes the total over the threshold.
   */
  private applyMerging(sentences: string[]): string[] {
    if (this.minWords <= 1) return sentences

    const result: string[] = []
    for (const sentence of sentences) {
      if (this.mergeBuffer) {
        const merged = this.mergeBuffer + ' ' + sentence
        this.mergeBuffer = ''

        if (this.countWords(merged) < this.minWords) {
          this.mergeBuffer = merged
        } else {
          result.push(merged)
        }
      } else if (this.countWords(sentence) < this.minWords) {
        this.mergeBuffer = sentence
      } else {
        result.push(sentence)
      }
    }
    return result
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length
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
export function createSentenceDetector(options?: SentenceDetectorOptions): SentenceDetector {
  return new SentenceDetector(options)
}
