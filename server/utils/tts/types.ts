/**
 * TTS Provider Types
 *
 * Shared interfaces for text-to-speech providers (OpenAI, ElevenLabs, etc.)
 */

export interface WordTiming {
  word: string
  startMs: number
  endMs: number
}

export interface TTSResult {
  audioBuffer: ArrayBuffer
  contentType: string
  wordTimings: WordTiming[]
  estimatedDurationMs: number
  provider: 'openai' | 'elevenlabs' | 'groq' | 'inworld'
  timingSource: 'actual' | 'estimated' // So UI knows confidence level
  voice: string
}

export interface TTSOptions {
  text: string
  voice?: string
}

/**
 * Streaming chunk for sub-sentence audio streaming.
 * Used by providers that support progressive audio delivery (e.g., InWorld).
 */
export interface TTSStreamChunk {
  audioBuffer: ArrayBuffer
  contentType: string
  wordTimings: WordTiming[]
  durationMs: number
}

export interface TTSProvider {
  synthesize(options: TTSOptions): Promise<TTSResult>

  /**
   * Optional streaming method for providers that support progressive audio delivery.
   * Yields audio chunks as they become available, enabling lower time-to-first-byte.
   * Only implemented by providers with true streaming support (e.g., InWorld).
   */
  synthesizeStream?(options: TTSOptions): AsyncGenerator<TTSStreamChunk, void, unknown>

  /**
   * Whether this provider supports streaming synthesis.
   * When true, synthesizeStream should be implemented.
   */
  supportsStreaming?: boolean
}

export type TTSProviderType = 'openai' | 'elevenlabs' | 'groq' | 'inworld'

/**
 * Audio chunk for streaming TTS
 * Sent via SSE during streaming responses
 */
export interface AudioChunk {
  chunkIndex: number
  audioBase64: string
  contentType: string
  wordTimings: WordTiming[]
  cumulativeOffsetMs: number // Time offset from start of conversation
  durationMs: number
  isLast: boolean
  text: string // The sentence text for this chunk
}
