import type { SentenceDetector } from './sentence-detector'
import type { SequentialTTSProcessor } from './sequential-processor'

interface FinalizeStreamingTTSOptions {
  sentenceDetector: SentenceDetector
  ttsProcessor: SequentialTTSProcessor
  stripControlTokens: (text: string) => string
}

/**
 * Finalize streaming TTS for chat streaming responses.
 * Ensures the client always receives an audio completion marker when needed.
 */
export async function finalizeStreamingTTS({
  sentenceDetector,
  ttsProcessor,
  stripControlTokens
}: FinalizeStreamingTTSOptions): Promise<void> {
  const remaining = sentenceDetector.flush()
  let enqueuedTerminalSentence = false

  if (remaining) {
    const cleanRemaining = stripControlTokens(remaining)
    if (cleanRemaining) {
      ttsProcessor.enqueueSentence(cleanRemaining, true)
      enqueuedTerminalSentence = true
    }
  }

  await ttsProcessor.flush()

  // If the final buffer was empty or stripped to nothing, no "last" chunk was enqueued.
  // Send an explicit completion marker so client audio state can resolve.
  if (!enqueuedTerminalSentence) {
    await ttsProcessor.sendCompletionMarker()
  }
}
