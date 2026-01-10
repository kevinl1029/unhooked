/**
 * Streaming TTS Synthesizer
 *
 * Manages chunk-based TTS synthesis for streaming responses.
 * Tracks cumulative time offsets across multiple audio chunks.
 */

import type { TTSProvider, AudioChunk } from './types'

export class StreamingTTSSynthesizer {
  private provider: TTSProvider
  private chunkIndex = 0
  private cumulativeOffsetMs = 0

  constructor(provider: TTSProvider) {
    this.provider = provider
  }

  /**
   * Synthesize a sentence into an audio chunk.
   * @param text - The sentence text to synthesize
   * @param isLast - Whether this is the last chunk in the stream
   * @returns AudioChunk ready for SSE transmission
   */
  async synthesizeChunk(text: string, isLast: boolean): Promise<AudioChunk> {
    const result = await this.provider.synthesize({ text })

    const chunk: AudioChunk = {
      chunkIndex: this.chunkIndex++,
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

    return chunk
  }

  /**
   * Get the current cumulative offset in milliseconds.
   */
  getCumulativeOffset(): number {
    return this.cumulativeOffsetMs
  }

  /**
   * Get the number of chunks synthesized so far.
   */
  getChunkCount(): number {
    return this.chunkIndex
  }

  /**
   * Reset the synthesizer state.
   */
  reset(): void {
    this.chunkIndex = 0
    this.cumulativeOffsetMs = 0
  }
}

/**
 * Create a new streaming synthesizer instance.
 * @param provider - The TTS provider to use for synthesis
 */
export function createStreamingSynthesizer(provider: TTSProvider): StreamingTTSSynthesizer {
  return new StreamingTTSSynthesizer(provider)
}
