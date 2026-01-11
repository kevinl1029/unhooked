/**
 * Streaming TTS Composable
 *
 * Orchestrates streaming TTS playback by consuming SSE events
 * and coordinating with the audio queue for playback.
 */

import type { AudioChunk } from '~/server/utils/tts/types'

interface StreamingTTSOptions {
  onTextUpdate?: (text: string) => void
  onComplete?: (fullText: string, sessionComplete: boolean, usedStreamingTTS: boolean) => void
  onError?: (error: string) => void
  onAudioComplete?: () => void
  onAudioStart?: () => void // Called when first audio chunk starts playing
}

interface SSEEvent {
  type: 'token' | 'audio_chunk' | 'done' | 'error'
  token?: string
  chunk?: AudioChunk
  done?: boolean
  conversationId?: string
  sessionComplete?: boolean
  streamingTTS?: boolean
  error?: string
}

export const useStreamingTTS = (options: StreamingTTSOptions = {}) => {
  const audioQueue = useStreamingAudioQueue({
    onComplete: () => {
      options.onAudioComplete?.()
    },
    onPlaybackStart: () => {
      options.onAudioStart?.()
    }
  })

  // State
  const isStreaming = ref(false)
  const fullText = ref('')
  const conversationId = ref<string | null>(null)
  const error = ref<string | null>(null)

  /**
   * Parse SSE data from a line
   */
  const parseSSELine = (line: string): SSEEvent | null => {
    if (!line.startsWith('data: ')) return null

    try {
      const jsonStr = line.slice(6) // Remove 'data: ' prefix
      return JSON.parse(jsonStr) as SSEEvent
    } catch {
      console.error('[streaming-tts] Failed to parse SSE event:', line)
      return null
    }
  }

  /**
   * Process a streaming response from the chat endpoint
   */
  const processStream = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
    const decoder = new TextDecoder()
    let buffer = ''

    // Reset state from any previous stream before starting new one
    // This clears allWordTimings so ttsWords/ttsText don't accumulate across messages
    audioQueue.reset()

    isStreaming.value = true
    fullText.value = ''
    error.value = null

    // Initialize audio context (requires user gesture context)
    await audioQueue.initialize()

    try {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          break
        }

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true })

        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue

          const event = parseSSELine(line)
          if (!event) continue

          // Handle different event types
          switch (event.type) {
            case 'token':
              if (event.token) {
                fullText.value += event.token
                options.onTextUpdate?.(fullText.value)
              }
              if (event.conversationId) {
                conversationId.value = event.conversationId
              }
              break

            case 'audio_chunk':
              if (event.chunk) {
                await audioQueue.enqueueChunk(event.chunk)
              }
              break

            case 'done':
              if (event.conversationId) {
                conversationId.value = event.conversationId
              }
              // Pass whether streaming TTS was actually used by the server
              options.onComplete?.(fullText.value, event.sessionComplete || false, event.streamingTTS || false)
              break

            case 'error':
              error.value = event.error || 'Unknown error'
              options.onError?.(error.value)
              break

            default:
              // Handle legacy format (no type field) for backwards compatibility
              if ('token' in event && event.token) {
                fullText.value += event.token
                options.onTextUpdate?.(fullText.value)
              }
              if ('done' in event && event.done) {
                options.onComplete?.(fullText.value, event.sessionComplete || false, event.streamingTTS || false)
              }
              if ('error' in event && event.error) {
                error.value = event.error
                options.onError?.(error.value)
              }
          }
        }
      }
    } catch (err) {
      console.error('[streaming-tts] Stream processing error:', err)
      error.value = err instanceof Error ? err.message : 'Stream processing failed'
      options.onError?.(error.value)
    } finally {
      isStreaming.value = false
    }
  }

  /**
   * Stop streaming and playback
   * @param triggerComplete - Whether to trigger onAudioComplete callback
   */
  const stop = (triggerComplete = false) => {
    isStreaming.value = false
    audioQueue.stop(triggerComplete)
    fullText.value = ''
    conversationId.value = null
    error.value = null
  }

  /**
   * Pause audio playback
   */
  const pause = async () => {
    await audioQueue.pause()
  }

  /**
   * Resume audio playback
   */
  const resume = async () => {
    await audioQueue.resume()
  }

  /**
   * Reset for new session
   */
  const reset = () => {
    stop()
    audioQueue.reset()
  }

  return {
    // State
    isStreaming: readonly(isStreaming),
    isPlaying: audioQueue.isPlaying,
    isWaitingForChunks: audioQueue.isWaitingForChunks,
    fullText: readonly(fullText),
    conversationId: readonly(conversationId),
    currentWordIndex: audioQueue.currentWordIndex,
    allWordTimings: audioQueue.allWordTimings,
    ttsWords: audioQueue.ttsWords,
    ttsText: audioQueue.ttsText,
    error: readonly(error),

    // Methods
    processStream,
    stop,
    pause,
    resume,
    reset
  }
}
