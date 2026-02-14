import { describe, it, expect, vi } from 'vitest'
import { createSentenceDetector } from '~/server/utils/tts/sentence-detector'
import { finalizeStreamingTTS } from '~/server/utils/tts/finalize-streaming'
import type { SequentialTTSProcessor } from '~/server/utils/tts/sequential-processor'

describe('finalizeStreamingTTS (chat.post flush logic)', () => {
  it('sends completion marker when remaining is truthy but strips to empty', async () => {
    const detector = createSentenceDetector()
    detector.addToken('[SESSION_COMPLETE]')

    const enqueueSentence = vi.fn()
    const flush = vi.fn().mockResolvedValue(undefined)
    const sendCompletionMarker = vi.fn().mockResolvedValue(undefined)

    const mockProcessor = {
      enqueueSentence,
      flush,
      sendCompletionMarker
    } as unknown as SequentialTTSProcessor

    await finalizeStreamingTTS({
      sentenceDetector: detector,
      ttsProcessor: mockProcessor,
      stripControlTokens: () => ''
    })

    expect(enqueueSentence).not.toHaveBeenCalled()
    expect(flush).toHaveBeenCalledTimes(1)
    expect(sendCompletionMarker).toHaveBeenCalledTimes(1)
  })
})
