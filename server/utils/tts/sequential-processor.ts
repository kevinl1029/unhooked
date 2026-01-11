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
   * @param text - The sentence text to synthesize
   * @param isLast - Whether this is the last sentence in the stream
   */
  enqueueSentence(text: string, isLast: boolean): void {
    if (this.hasError) {
      console.warn('[sequential-tts] Skipping sentence due to previous error:', text.slice(0, 50))
      return
    }

    // Capture the chunk index NOW, before any async operations
    // This ensures indices are assigned in enqueue order, not completion order
    const myChunkIndex = this.chunkIndex++

    // Chain this synthesis operation after all previous ones
    this.synthesisChain = this.synthesisChain.then(async () => {
      if (this.hasError) return

      try {
        console.log('[sequential-tts] Synthesizing chunk %d: "%s"',
          myChunkIndex, text.slice(0, 40) + (text.length > 40 ? '...' : ''))

        const result = await this.provider.synthesize({ text })

        const chunk: AudioChunk = {
          chunkIndex: myChunkIndex,
          audioBase64: Buffer.from(result.audioBuffer).toString('base64'),
          contentType: result.contentType,
          wordTimings: result.wordTimings,
          cumulativeOffsetMs: this.cumulativeOffsetMs,
          durationMs: result.estimatedDurationMs,
          isLast,
          text
        }

        // Update cumulative offset for next chunk
        this.cumulativeOffsetMs += result.estimatedDurationMs

        console.log('[sequential-tts] Emitting chunk %d (duration: %dms, cumulative: %dms)',
          myChunkIndex, result.estimatedDurationMs, this.cumulativeOffsetMs)

        // Emit the chunk - this happens in strict order because we're in a chain
        this.onChunk(chunk)
      } catch (err) {
        console.error('[sequential-tts] Failed to synthesize chunk %d:', myChunkIndex, err)
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
