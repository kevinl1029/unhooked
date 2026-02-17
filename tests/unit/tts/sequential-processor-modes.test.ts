/**
 * Tests for SequentialTTSProcessor TTS Streaming Mode Routing
 *
 * Validates that the ttsStreamingMode parameter correctly controls
 * whether the streaming or batch synthesis path is used, independent
 * of provider capability flags.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SequentialTTSProcessor } from '~/server/utils/tts/sequential-processor'
import type { TTSProvider, AudioChunk, TTSStreamChunk } from '~/server/utils/tts/types'

// --- Mock Providers ---

/**
 * Creates a mock provider that supports both streaming and batch synthesis.
 * Tracks which methods are called to verify routing.
 */
function createStreamingCapableProvider() {
  const synthesize = vi.fn<any, Promise<any>>().mockResolvedValue({
    audioBuffer: new ArrayBuffer(100),
    contentType: 'audio/mpeg',
    wordTimings: [{ word: 'hello', startMs: 0, endMs: 100 }],
    estimatedDurationMs: 100,
    provider: 'inworld',
    timingSource: 'actual' as const,
    voice: 'Dennis',
  })

  const synthesizeStream = vi.fn<any, AsyncGenerator<TTSStreamChunk, void, unknown>>()
  synthesizeStream.mockImplementation(async function* () {
    yield {
      audioBuffer: new ArrayBuffer(50),
      contentType: 'audio/mpeg',
      wordTimings: [{ word: 'hello', startMs: 0, endMs: 50 }],
      durationMs: 50,
    }
    yield {
      audioBuffer: new ArrayBuffer(50),
      contentType: 'audio/mpeg',
      wordTimings: [{ word: 'world', startMs: 50, endMs: 100 }],
      durationMs: 50,
    }
  })

  const provider: TTSProvider = {
    supportsStreaming: true,
    synthesize,
    synthesizeStream,
  }

  return { provider, synthesize, synthesizeStream }
}

/**
 * Creates a mock provider that only supports batch synthesis.
 */
function createBatchOnlyProvider() {
  const synthesize = vi.fn<any, Promise<any>>().mockResolvedValue({
    audioBuffer: new ArrayBuffer(100),
    contentType: 'audio/mpeg',
    wordTimings: [{ word: 'hello', startMs: 0, endMs: 100 }],
    estimatedDurationMs: 100,
    provider: 'openai',
    timingSource: 'estimated' as const,
    voice: 'nova',
  })

  const provider: TTSProvider = {
    supportsStreaming: false,
    synthesize,
  }

  return { provider, synthesize }
}

describe('SequentialTTSProcessor - Mode Routing', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('sentence-batch mode', () => {
    it('should call synthesize() even if provider supports streaming', async () => {
      const { provider, synthesize, synthesizeStream } = createStreamingCapableProvider()
      const chunks: AudioChunk[] = []
      const processor = new SequentialTTSProcessor(
        provider,
        (chunk) => chunks.push(chunk),
        'sentence-batch'
      )

      processor.enqueueSentence('Hello world.', true)
      await processor.flush()

      expect(synthesize).toHaveBeenCalledOnce()
      expect(synthesizeStream).not.toHaveBeenCalled()
    })

    it('should emit one chunk per sentence', async () => {
      const { provider } = createStreamingCapableProvider()
      const chunks: AudioChunk[] = []
      const processor = new SequentialTTSProcessor(
        provider,
        (chunk) => chunks.push(chunk),
        'sentence-batch'
      )

      processor.enqueueSentence('First sentence.', false)
      processor.enqueueSentence('Second sentence.', true)
      await processor.flush()

      // Two audio chunks + isLast on the second one
      const audioChunks = chunks.filter((c) => c.audioBase64 !== '')
      expect(audioChunks).toHaveLength(2)
      expect(processor.getSentCount()).toBe(2)
    })

    it('should return sentence-batch from getEffectiveMode()', async () => {
      const { provider } = createStreamingCapableProvider()
      const processor = new SequentialTTSProcessor(
        provider,
        () => {},
        'sentence-batch'
      )

      expect(processor.getEffectiveMode()).toBe('sentence-batch')
    })
  })

  describe('true-streaming mode with streaming provider', () => {
    it('should call synthesizeStream() instead of synthesize()', async () => {
      const { provider, synthesize, synthesizeStream } = createStreamingCapableProvider()
      const chunks: AudioChunk[] = []
      const processor = new SequentialTTSProcessor(
        provider,
        (chunk) => chunks.push(chunk),
        'true-streaming'
      )

      processor.enqueueSentence('Hello world.', true)
      await processor.flush()

      expect(synthesizeStream).toHaveBeenCalledOnce()
      expect(synthesize).not.toHaveBeenCalled()
    })

    it('should emit multiple sub-sentence chunks per sentence', async () => {
      const { provider } = createStreamingCapableProvider()
      const chunks: AudioChunk[] = []
      const processor = new SequentialTTSProcessor(
        provider,
        (chunk) => chunks.push(chunk),
        'true-streaming'
      )

      processor.enqueueSentence('Hello world.', true)
      await processor.flush()

      // The mock yields 2 sub-chunks + 1 completion marker
      const audioChunks = chunks.filter((c) => c.audioBase64 !== '')
      expect(audioChunks).toHaveLength(2)

      const completionChunks = chunks.filter((c) => c.isLast === true)
      expect(completionChunks).toHaveLength(1)
    })

    it('should return true-streaming from getEffectiveMode() when no degradation', async () => {
      const { provider } = createStreamingCapableProvider()
      const processor = new SequentialTTSProcessor(
        provider,
        () => {},
        'true-streaming'
      )

      // Process a sentence so routing actually happens
      processor.enqueueSentence('Hello.', true)
      await processor.flush()

      expect(processor.getEffectiveMode()).toBe('true-streaming')
    })
  })

  describe('true-streaming mode with non-streaming provider (degradation)', () => {
    it('should fall back to synthesize() and log a warning', async () => {
      const { provider, synthesize } = createBatchOnlyProvider()
      const chunks: AudioChunk[] = []
      const processor = new SequentialTTSProcessor(
        provider,
        (chunk) => chunks.push(chunk),
        'true-streaming'
      )

      processor.enqueueSentence('Hello world.', true)
      await processor.flush()

      expect(synthesize).toHaveBeenCalledOnce()
      expect(warnSpy).toHaveBeenCalledWith(
        '[sequential-tts] Provider does not support streaming, using sentence-batch'
      )
    })

    it('should only warn once across multiple sentences', async () => {
      const { provider } = createBatchOnlyProvider()
      const chunks: AudioChunk[] = []
      const processor = new SequentialTTSProcessor(
        provider,
        (chunk) => chunks.push(chunk),
        'true-streaming'
      )

      processor.enqueueSentence('First sentence.', false)
      processor.enqueueSentence('Second sentence.', false)
      processor.enqueueSentence('Third sentence.', true)
      await processor.flush()

      const degradationWarnings = warnSpy.mock.calls.filter(
        (call) => call[0] === '[sequential-tts] Provider does not support streaming, using sentence-batch'
      )
      expect(degradationWarnings).toHaveLength(1)
    })

    it('should return sentence-batch from getEffectiveMode() after degradation', async () => {
      const { provider } = createBatchOnlyProvider()
      const processor = new SequentialTTSProcessor(
        provider,
        () => {},
        'true-streaming'
      )

      processor.enqueueSentence('Hello.', true)
      await processor.flush()

      expect(processor.getEffectiveMode()).toBe('sentence-batch')
    })
  })

  describe('ordering and error handling (mode-independent)', () => {
    it('should maintain strict sentence ordering in sentence-batch mode', async () => {
      const { provider } = createBatchOnlyProvider()
      const chunks: AudioChunk[] = []
      const processor = new SequentialTTSProcessor(
        provider,
        (chunk) => chunks.push(chunk),
        'sentence-batch'
      )

      processor.enqueueSentence('First.', false)
      processor.enqueueSentence('Second.', false)
      processor.enqueueSentence('Third.', true)
      await processor.flush()

      const audioChunks = chunks.filter((c) => c.audioBase64 !== '')
      expect(audioChunks[0].chunkIndex).toBe(0)
      expect(audioChunks[1].chunkIndex).toBe(1)
      expect(audioChunks[2].chunkIndex).toBe(2)
    })

    it('should maintain strict sentence ordering in true-streaming mode', async () => {
      const { provider } = createStreamingCapableProvider()
      const chunks: AudioChunk[] = []
      const processor = new SequentialTTSProcessor(
        provider,
        (chunk) => chunks.push(chunk),
        'true-streaming'
      )

      processor.enqueueSentence('First.', false)
      processor.enqueueSentence('Second.', true)
      await processor.flush()

      const audioChunks = chunks.filter((c) => c.audioBase64 !== '')
      // Each sentence produces 2 sub-chunks, so indices 0,1,2,3
      for (let i = 0; i < audioChunks.length; i++) {
        expect(audioChunks[i].chunkIndex).toBe(i)
      }
    })

    it('should send completion marker on last sentence failure in sentence-batch', async () => {
      const provider: TTSProvider = {
        supportsStreaming: false,
        synthesize: vi.fn().mockRejectedValue(new Error('API error')),
      }
      const chunks: AudioChunk[] = []
      const processor = new SequentialTTSProcessor(
        provider,
        (chunk) => chunks.push(chunk),
        'sentence-batch'
      )

      processor.enqueueSentence('Will fail.', true)
      await processor.flush()

      const completionChunks = chunks.filter((c) => c.isLast === true)
      expect(completionChunks).toHaveLength(1)
    })

    it('should skip failed sentence and continue processing others', async () => {
      let callCount = 0
      const provider: TTSProvider = {
        supportsStreaming: false,
        synthesize: vi.fn().mockImplementation(async () => {
          callCount++
          if (callCount === 2) {
            throw new Error('Transient failure')
          }
          return {
            audioBuffer: new ArrayBuffer(100),
            contentType: 'audio/mpeg',
            wordTimings: [{ word: 'word', startMs: 0, endMs: 100 }],
            estimatedDurationMs: 100,
            provider: 'openai',
            timingSource: 'estimated' as const,
            voice: 'nova',
          }
        }),
      }
      const chunks: AudioChunk[] = []
      const processor = new SequentialTTSProcessor(
        provider,
        (chunk) => chunks.push(chunk),
        'sentence-batch'
      )

      processor.enqueueSentence('First.', false)
      processor.enqueueSentence('Second will fail.', false)
      processor.enqueueSentence('Third.', true)
      await processor.flush()

      // Sentences 1 and 3 succeed, sentence 2 fails
      const audioChunks = chunks.filter((c) => c.audioBase64 !== '')
      expect(audioChunks).toHaveLength(2)
      expect(processor.getSentCount()).toBe(2)
    })
  })
})
