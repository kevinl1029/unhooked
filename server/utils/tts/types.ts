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
  provider: 'openai' | 'elevenlabs' | 'groq'
  timingSource: 'actual' | 'estimated' // So UI knows confidence level
  voice: string
}

export interface TTSOptions {
  text: string
  voice?: string
}

export interface TTSProvider {
  synthesize(options: TTSOptions): Promise<TTSResult>
}

export type TTSProviderType = 'openai' | 'elevenlabs' | 'groq'

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
