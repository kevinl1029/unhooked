/**
 * Sequential TTS Processor
 *
 * Guarantees audio chunks are synthesized and emitted in strict order
 * by chaining synthesis operations in a promise chain.
 *
 * This solves the fundamental race condition in parallel TTS synthesis
 * where faster-completing requests could overtake slower ones.
 */

import type { TTSProvider, AudioChunk } from './types'
import { getWavDurationMs, scaleWordTimings } from './wav-utils'
import { sanitizeForTTS } from './sanitize'

export type ChunkCallback = (chunk: AudioChunk) => void

export class SequentialTTSProcessor {
  private synthesisChain: Promise<void> = Promise.resolve()
  private chunkIndex = 0
  private cumulativeOffsetMs = 0
  private hasError = false

  constructor(
    private provider: TTSProvider,
    private onChunk: ChunkCallback
  ) {}

  /**
   * Enqueue a sentence for synthesis.
   * Sentences are processed strictly in the order they are enqueued.
   * Each synthesis waits for the previous one to complete before starting.
   *
   * For streaming providers (e.g., InWorld), multiple sub-sentence chunks
   * are emitted progressively as they arrive from the provider.
   *
   * @param text - The sentence text to synthesize
   * @param isLast - Whether this is the last sentence in the stream
   */
  enqueueSentence(text: string, isLast: boolean): void {
    if (this.hasError) {
      console.warn('[sequential-tts] Skipping sentence due to previous error:', text.slice(0, 50))
      return
    }

    // Sanitize text before processing - removes system tokens, markdown, etc.
    const sanitizedText = sanitizeForTTS(text)

    // Skip empty sentences (e.g., "[SESSION_COMPLETE]" becomes empty after sanitization)
    // But if this was marked as the last sentence, we still need to send a completion marker
    if (!sanitizedText) {
      if (isLast) {
        // Send completion marker so client knows audio stream is done
        this.sendCompletionMarker()
      }
      return
    }

    // Chain this synthesis operation after all previous ones
    this.synthesisChain = this.synthesisChain.then(async () => {
      if (this.hasError) return

      try {
        // Check if provider supports streaming synthesis
        if (this.provider.supportsStreaming && this.provider.synthesizeStream) {
          // STREAMING PATH: Emit multiple sub-sentence chunks progressively
          // This reduces time-to-first-byte significantly
          let subChunkCount = 0

          for await (const streamChunk of this.provider.synthesizeStream({ text: sanitizedText })) {
            const chunk: AudioChunk = {
              chunkIndex: this.chunkIndex++,
              audioBase64: Buffer.from(streamChunk.audioBuffer).toString('base64'),
              contentType: streamChunk.contentType,
              wordTimings: streamChunk.wordTimings,
              cumulativeOffsetMs: this.cumulativeOffsetMs,
              durationMs: streamChunk.durationMs,
              isLast: false, // Individual sub-chunks are never the last chunk
              text: subChunkCount === 0 ? sanitizedText : '' // Only include text on first sub-chunk
            }

            // Update cumulative offset for next chunk
            this.cumulativeOffsetMs += streamChunk.durationMs
            subChunkCount++

            // Emit the chunk immediately - streaming provides progressive audio
            this.onChunk(chunk)
          }

          // If this was the last sentence and we emitted chunks, send a completion marker
          if (isLast && subChunkCount > 0) {
            const completionChunk: AudioChunk = {
              chunkIndex: this.chunkIndex++,
              audioBase64: '',
              contentType: 'audio/mpeg',
              wordTimings: [],
              cumulativeOffsetMs: this.cumulativeOffsetMs,
              durationMs: 0,
              isLast: true,
              text: ''
            }
            this.onChunk(completionChunk)
          }
        } else {
          // NON-STREAMING PATH: Existing behavior for Groq, OpenAI, ElevenLabs
          // Capture chunk index for this sentence
          const myChunkIndex = this.chunkIndex++

          const result = await this.provider.synthesize({ text: sanitizedText })

          // For estimated timings (Groq, OpenAI), scale to actual audio duration
          let wordTimings = result.wordTimings
          let durationMs = result.estimatedDurationMs

          if (result.timingSource === 'estimated' && result.contentType === 'audio/wav') {
            // Get actual duration from WAV header
            const actualDurationMs = getWavDurationMs(result.audioBuffer)

            if (actualDurationMs !== null && actualDurationMs > 0) {
              // Scale word timings to match actual audio duration
              wordTimings = scaleWordTimings(result.wordTimings, actualDurationMs)
              durationMs = actualDurationMs
            }
          }

          const chunk: AudioChunk = {
            chunkIndex: myChunkIndex,
            audioBase64: Buffer.from(result.audioBuffer).toString('base64'),
            contentType: result.contentType,
            wordTimings,
            cumulativeOffsetMs: this.cumulativeOffsetMs,
            durationMs,
            isLast,
            text: sanitizedText
          }

          // Update cumulative offset for next chunk
          this.cumulativeOffsetMs += durationMs

          // Emit the chunk - this happens in strict order because we're in a chain
          this.onChunk(chunk)
        }
      } catch (err) {
        console.error('[sequential-tts] Failed to synthesize sentence:', sanitizedText.slice(0, 50), err)
        // Don't set hasError for individual chunk failures - let the stream continue
        // The chunk simply won't be sent, but subsequent chunks can still work
      }
    })
  }

  /**
   * Wait for all queued synthesis operations to complete.
   * Call this before closing the SSE stream to ensure all audio is sent.
   *
   * @returns Promise that resolves when all synthesis is complete
   */
  async flush(): Promise<void> {
    await this.synthesisChain
  }

  /**
   * Send a final "completion marker" chunk.
   * Used when we need to signal stream completion without additional audio.
   * Only call this if the last enqueued sentence didn't have isLast=true.
   */
  async sendCompletionMarker(): Promise<void> {
    await this.synthesisChain

    const finalChunk: AudioChunk = {
      chunkIndex: this.chunkIndex,
      audioBase64: '',
      contentType: 'audio/wav',
      wordTimings: [],
      cumulativeOffsetMs: this.cumulativeOffsetMs,
      durationMs: 0,
      isLast: true,
      text: ''
    }

    this.onChunk(finalChunk)
  }

  /**
   * Get the number of chunks that have been enqueued (not necessarily sent yet).
   */
  getEnqueuedCount(): number {
    return this.chunkIndex
  }

  /**
   * Get the current cumulative time offset.
   */
  getCumulativeOffset(): number {
    return this.cumulativeOffsetMs
  }

  /**
   * Mark the processor as having encountered an error.
   * Subsequent enqueue calls will be ignored.
   */
  abort(): void {
    this.hasError = true
  }
}

/**
 * Create a new sequential TTS processor.
 *
 * @param provider - The TTS provider to use for synthesis
 * @param onChunk - Callback invoked for each synthesized chunk (in order)
 */
export function createSequentialTTSProcessor(
  provider: TTSProvider,
  onChunk: ChunkCallback
): SequentialTTSProcessor {
  return new SequentialTTSProcessor(provider, onChunk)
}
