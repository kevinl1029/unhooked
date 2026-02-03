/**
 * Tests for SequentialTTSProcessor
 *
 * Reproduces the bug where InWorld TTS failure causes UI freeze:
 * When all TTS synthesis fails silently, no completion marker is sent,
 * and the server inaccurately reports streamingTTS: true in the done event.
 *
 * The client then enters "speaking" mode (isAISpeaking=true) with no audio
 * queued, and onAudioComplete never fires, freezing the UI permanently.
 */

import { describe, it, expect, vi } from 'vitest'
import { SequentialTTSProcessor } from '~/server/utils/tts/sequential-processor'
import type { TTSProvider, AudioChunk } from '~/server/utils/tts/types'

/**
 * Creates a mock streaming TTS provider (like InWorld) that always throws.
 * Simulates InWorld API errors (rate limit, network timeout, etc.)
 */
function createFailingStreamingProvider(): TTSProvider {
  return {
    supportsStreaming: true,
    synthesize: vi.fn().mockRejectedValue(new Error('Synthesis failed')),
    async *synthesizeStream() {
      throw new Error('InWorld API error: rate limited')
    },
  }
}

/**
 * Creates a mock streaming TTS provider that succeeds.
 * Each sentence yields one audio chunk.
 */
function createSuccessfulStreamingProvider(): TTSProvider {
  return {
    supportsStreaming: true,
    synthesize: vi.fn().mockRejectedValue(new Error('Use synthesizeStream')),
    async *synthesizeStream({ text }: { text: string }) {
      yield {
        audioBuffer: new ArrayBuffer(100),
        contentType: 'audio/mpeg',
        wordTimings: [{ word: text.split(' ')[0], startMs: 0, endMs: 100 }],
        durationMs: 100,
      }
    },
  }
}

/**
 * Creates a mock non-streaming TTS provider (like Groq) that always throws.
 */
function createFailingNonStreamingProvider(): TTSProvider {
  return {
    supportsStreaming: false,
    synthesize: vi.fn().mockRejectedValue(new Error('Groq API error')),
  }
}

describe('SequentialTTSProcessor', () => {
  describe('streaming provider (InWorld) - all synthesis fails', () => {
    it('should send a completion marker when the last sentence fails', async () => {
      const chunks: AudioChunk[] = []
      const provider = createFailingStreamingProvider()
      const processor = new SequentialTTSProcessor(provider, (chunk) => {
        chunks.push(chunk)
      })

      processor.enqueueSentence('That is so sneaky, isn\'t it?', false)
      processor.enqueueSentence('Think back to what you discovered.', true)

      await processor.flush()

      // A completion marker (isLast=true, empty audio) should always be sent
      // so the client's audio queue can properly signal completion.
      const completionChunks = chunks.filter((c) => c.isLast === true)
      expect(completionChunks).toHaveLength(1)
    })

    it('should report zero sent count when all streaming synthesis fails', async () => {
      const chunks: AudioChunk[] = []
      const provider = createFailingStreamingProvider()
      const processor = new SequentialTTSProcessor(provider, (chunk) => {
        chunks.push(chunk)
      })

      processor.enqueueSentence('First sentence.', false)
      processor.enqueueSentence('Second sentence.', true)

      await processor.flush()

      // No real audio chunks should have been emitted
      const audioChunks = chunks.filter((c) => c.audioBase64 !== '')
      expect(audioChunks).toHaveLength(0)

      // getSentCount() tracks actually-emitted audio chunks (not completion markers).
      // This is used by the server to set streamingTTS accurately in the done event.
      expect(typeof processor.getSentCount).toBe('function')
      expect(processor.getSentCount()).toBe(0)
    })

    it('should not block subsequent sentences when one fails', async () => {
      let callCount = 0
      const chunks: AudioChunk[] = []

      // Provider that fails on first call but succeeds on second
      const provider: TTSProvider = {
        supportsStreaming: true,
        synthesize: vi.fn().mockRejectedValue(new Error('not used')),
        async *synthesizeStream({ text }: { text: string }) {
          callCount++
          if (callCount === 1) {
            throw new Error('Transient InWorld failure')
          }
          yield {
            audioBuffer: new ArrayBuffer(100),
            contentType: 'audio/mpeg',
            wordTimings: [{ word: text.split(' ')[0], startMs: 0, endMs: 100 }],
            durationMs: 100,
          }
        },
      }

      const processor = new SequentialTTSProcessor(provider, (chunk) => {
        chunks.push(chunk)
      })

      processor.enqueueSentence('This will fail.', false)
      processor.enqueueSentence('This will succeed.', true)

      await processor.flush()

      // Second sentence should still be synthesized even though first failed
      const audioChunks = chunks.filter((c) => c.audioBase64 !== '')
      expect(audioChunks).toHaveLength(1)

      // Completion marker should be present (from the successful last sentence)
      const completionChunks = chunks.filter((c) => c.isLast === true)
      expect(completionChunks).toHaveLength(1)

      // Only one real audio chunk was sent
      expect(processor.getSentCount()).toBe(1)
    })
  })

  describe('streaming provider - all synthesis succeeds', () => {
    it('should send audio chunks and a completion marker', async () => {
      const chunks: AudioChunk[] = []
      const provider = createSuccessfulStreamingProvider()
      const processor = new SequentialTTSProcessor(provider, (chunk) => {
        chunks.push(chunk)
      })

      processor.enqueueSentence('Hello world.', false)
      processor.enqueueSentence('Goodbye.', true)

      await processor.flush()

      const audioChunks = chunks.filter((c) => c.audioBase64 !== '')
      expect(audioChunks).toHaveLength(2)

      const completionChunks = chunks.filter((c) => c.isLast === true)
      expect(completionChunks).toHaveLength(1)

      expect(processor.getSentCount()).toBe(2)
    })
  })

  describe('non-streaming provider (Groq) - all synthesis fails', () => {
    it('should send a completion marker when all non-streaming synthesis fails', async () => {
      const chunks: AudioChunk[] = []
      const provider = createFailingNonStreamingProvider()
      const processor = new SequentialTTSProcessor(provider, (chunk) => {
        chunks.push(chunk)
      })

      processor.enqueueSentence('First sentence.', false)
      processor.enqueueSentence('Last sentence.', true)

      await processor.flush()

      const completionChunks = chunks.filter((c) => c.isLast === true)
      expect(completionChunks).toHaveLength(1)
    })

    it('should report zero sent count when all non-streaming synthesis fails', async () => {
      const chunks: AudioChunk[] = []
      const provider = createFailingNonStreamingProvider()
      const processor = new SequentialTTSProcessor(provider, (chunk) => {
        chunks.push(chunk)
      })

      processor.enqueueSentence('Hello.', true)
      await processor.flush()

      expect(processor.getSentCount()).toBe(0)
    })
  })

  describe('server done event accuracy (integration scenario)', () => {
    it('should allow server to distinguish real TTS success from silent failure', async () => {
      // Simulates the server's logic in chat.post.ts onComplete handler
      const chunks: AudioChunk[] = []
      const provider = createFailingStreamingProvider()
      const processor = new SequentialTTSProcessor(provider, (chunk) => {
        chunks.push(chunk)
      })

      processor.enqueueSentence('Hello.', false)
      processor.enqueueSentence('Goodbye.', true)

      await processor.flush()

      // Config says TTS was enabled, but no audio was actually sent
      const useStreamingTTS = true // server config
      const actuallyUsedTTS = processor.getSentCount() > 0

      expect(useStreamingTTS).toBe(true)
      expect(actuallyUsedTTS).toBe(false)

      // The done event should report the ACTUAL state, not the config
      const doneEvent = {
        type: 'done',
        streamingTTS: actuallyUsedTTS,
      }
      expect(doneEvent.streamingTTS).toBe(false)
    })
  })
})
