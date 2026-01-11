/**
 * InWorld TTS Provider
 *
 * Uses InWorld AI's TTS API with actual word-level timing data.
 * The API returns word alignment directly, providing perfect
 * synchronization for word-by-word highlighting.
 */

import type { TTSProvider, TTSResult, TTSOptions, TTSStreamChunk, WordTiming } from './types'

// InWorld API response types
interface InworldWordAlignment {
  words: string[]
  wordStartTimeSeconds: number[]
  wordEndTimeSeconds: number[]
}

interface InworldTimestampInfo {
  wordAlignment?: InworldWordAlignment
}

interface InworldResponse {
  audioContent: string // base64 encoded audio
  timestampInfo?: InworldTimestampInfo
  usage?: {
    characters: number
  }
}

// Streaming endpoint wraps response in a result object
interface InworldStreamResponse {
  result: InworldResponse
}

const INWORLD_API_BASE = 'https://api.inworld.ai'

/**
 * Extract word timings from InWorld timestamp info
 */
function extractWordTimings(timestampInfo?: InworldTimestampInfo): WordTiming[] {
  const wordTimings: WordTiming[] = []

  if (timestampInfo?.wordAlignment) {
    const { words, wordStartTimeSeconds, wordEndTimeSeconds } = timestampInfo.wordAlignment

    if (words && words.length > 0) {
      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        if (!word || word.trim() === '') continue

        wordTimings.push({
          word,
          startMs: Math.round((wordStartTimeSeconds[i] || 0) * 1000),
          endMs: Math.round((wordEndTimeSeconds[i] || 0) * 1000)
        })
      }
    }
  }

  return wordTimings
}

export function createInworldProvider(
  apiKey: string,
  defaultVoiceId: string = 'Dennis',
  model: string = 'inworld-tts-1'
): TTSProvider {
  // Shared request body builder
  const buildRequestBody = (text: string, voice: string) => ({
    text,
    voiceId: voice,
    modelId: model,
    timestampType: 'WORD',
    audioConfig: {
      audioEncoding: 'MP3',
      sampleRateHertz: 44100,
      bitRate: 128000,
      speakingRate: 0.8 // Slower for better clarity (range: 0.5-1.5)
    }
  })

  // Shared error handler
  const handleError = (status: number, errorText: string) => {
    console.error('[InWorld TTS] API error:', status, errorText)

    if (status === 401) {
      throw new Error('Invalid InWorld API key')
    } else if (status === 400 || status === 422) {
      throw new Error('Invalid request to InWorld API')
    } else if (status === 429) {
      throw new Error('InWorld API rate limit exceeded')
    }
    throw new Error('Text-to-speech synthesis failed')
  }

  // Shared validation
  const validateText = (text: string) => {
    if (!text || typeof text !== 'string') {
      throw new Error('Text is required')
    }

    // InWorld has a 2,000 character limit
    const maxLength = 2000
    if (text.length > maxLength) {
      throw new Error(`Text too long (max ${maxLength} characters)`)
    }
  }

  return {
    // Flag indicating this provider supports streaming
    supportsStreaming: true,

    /**
     * Non-streaming synthesis (fallback method)
     * Returns complete audio with word-level timestamps in a single response
     */
    async synthesize(options: TTSOptions): Promise<TTSResult> {
      const { text, voice = defaultVoiceId } = options

      validateText(text)

      console.log('[InWorld TTS] Synthesizing (non-streaming):', text.substring(0, 100), '... (length:', text.length, ')')

      const response = await fetch(
        `${INWORLD_API_BASE}/tts/v1/voice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(buildRequestBody(text, voice))
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        handleError(response.status, errorText)
      }

      const data: InworldResponse = await response.json()

      if (!data.audioContent) {
        throw new Error('No audio data received from InWorld')
      }

      const audioBuffer = Buffer.from(data.audioContent, 'base64').buffer
      const wordTimings = extractWordTimings(data.timestampInfo)

      console.log('[InWorld TTS] Word timings count:', wordTimings.length, '- words:', wordTimings.map(w => w.word).join(' '))

      const estimatedDurationMs = wordTimings.length > 0
        ? wordTimings[wordTimings.length - 1].endMs
        : 0

      return {
        audioBuffer,
        contentType: 'audio/mpeg',
        wordTimings,
        estimatedDurationMs,
        provider: 'inworld',
        timingSource: 'actual',
        voice
      }
    },

    /**
     * Streaming synthesis for lower time-to-first-byte
     * Yields audio chunks progressively as they arrive from the streaming endpoint
     */
    async *synthesizeStream(options: TTSOptions): AsyncGenerator<TTSStreamChunk, void, unknown> {
      const { text, voice = defaultVoiceId } = options

      validateText(text)

      console.log('[InWorld TTS] Synthesizing (streaming):', text.substring(0, 100), '... (length:', text.length, ')')

      const startTime = Date.now()

      const response = await fetch(
        `${INWORLD_API_BASE}/tts/v1/voice:stream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(buildRequestBody(text, voice))
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        handleError(response.status, errorText)
      }

      if (!response.body) {
        throw new Error('No response body from InWorld streaming endpoint')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      // Track the previous chunk's absolute end time to calculate chunk duration
      // InWorld returns absolute timings, so chunk N's duration = endTime - prevEndTime
      let prevAbsoluteEndMs = 0

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete lines (newline-delimited JSON)
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue

            try {
              const parsed: InworldStreamResponse = JSON.parse(line)

              if (parsed.result?.audioContent) {
                const wordTimings = extractWordTimings(parsed.result.timestampInfo)

                // InWorld returns absolute timings from sentence start
                // Calculate this chunk's duration as the difference from previous end
                const absoluteEndMs = wordTimings.length > 0
                  ? wordTimings[wordTimings.length - 1].endMs
                  : prevAbsoluteEndMs
                const chunkDurationMs = absoluteEndMs - prevAbsoluteEndMs
                prevAbsoluteEndMs = absoluteEndMs

                yield {
                  audioBuffer: Buffer.from(parsed.result.audioContent, 'base64').buffer,
                  contentType: 'audio/mpeg',
                  wordTimings,
                  durationMs: chunkDurationMs
                }
              }
            } catch (e) {
              console.warn('[InWorld TTS] Failed to parse streaming chunk:', line.substring(0, 100))
            }
          }
        }

        // Handle any remaining data in buffer
        if (buffer.trim()) {
          try {
            const parsed: InworldStreamResponse = JSON.parse(buffer)

            if (parsed.result?.audioContent) {
              const wordTimings = extractWordTimings(parsed.result.timestampInfo)
              const absoluteEndMs = wordTimings.length > 0
                ? wordTimings[wordTimings.length - 1].endMs
                : prevAbsoluteEndMs
              const chunkDurationMs = absoluteEndMs - prevAbsoluteEndMs

              yield {
                audioBuffer: Buffer.from(parsed.result.audioContent, 'base64').buffer,
                contentType: 'audio/mpeg',
                wordTimings,
                durationMs: chunkDurationMs
              }
            }
          } catch (e) {
            console.warn('[InWorld TTS] Failed to parse final buffer:', buffer.substring(0, 100))
          }
        }
      } finally {
        reader.releaseLock()
      }
    }
  }
}
