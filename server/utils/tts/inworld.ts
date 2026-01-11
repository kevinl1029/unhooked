/**
 * InWorld TTS Provider
 *
 * Uses InWorld AI's TTS API with actual word-level timing data.
 * The API returns word alignment directly, providing perfect
 * synchronization for word-by-word highlighting.
 */

import type { TTSProvider, TTSResult, TTSOptions, WordTiming } from './types'

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

const INWORLD_API_BASE = 'https://api.inworld.ai'

export function createInworldProvider(
  apiKey: string,
  defaultVoiceId: string = 'Dennis',
  model: string = 'inworld-tts-1'
): TTSProvider {
  return {
    async synthesize(options: TTSOptions): Promise<TTSResult> {
      const { text, voice = defaultVoiceId } = options

      if (!text || typeof text !== 'string') {
        throw new Error('Text is required')
      }

      // InWorld has a 2,000 character limit
      const maxLength = 2000
      if (text.length > maxLength) {
        throw new Error(`Text too long (max ${maxLength} characters)`)
      }

      console.log('[InWorld TTS] Synthesizing text:', text.substring(0, 100), '... (length:', text.length, ')')

      // Call InWorld TTS non-streaming API
      // Returns complete audio with word-level timestamps in a single response
      const response = await fetch(
        `${INWORLD_API_BASE}/tts/v1/voice`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            voiceId: voice,
            modelId: model,
            timestampType: 'WORD',
            audioConfig: {
              audioEncoding: 'MP3',
              sampleRateHertz: 44100,
              bitRate: 128000,
              speakingRate: 0.9 // Slightly slower for better clarity (range: 0.5-1.5)
            }
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[InWorld TTS] API error:', response.status, errorText)

        if (response.status === 401) {
          throw new Error('Invalid InWorld API key')
        } else if (response.status === 400 || response.status === 422) {
          throw new Error('Invalid request to InWorld API')
        } else if (response.status === 429) {
          throw new Error('InWorld API rate limit exceeded')
        }
        throw new Error('Text-to-speech synthesis failed')
      }

      const data: InworldResponse = await response.json()

      if (!data.audioContent) {
        throw new Error('No audio data received from InWorld')
      }

      // Convert base64 audio to ArrayBuffer using Node's Buffer
      const audioBuffer = Buffer.from(data.audioContent, 'base64').buffer

      // Extract word timings from response
      const wordTimings: WordTiming[] = []
      if (data.timestampInfo?.wordAlignment) {
        const { words, wordStartTimeSeconds, wordEndTimeSeconds } = data.timestampInfo.wordAlignment

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

      console.log('[InWorld TTS] Word timings count:', wordTimings.length, '- words:', wordTimings.map(w => w.word).join(' '))

      // Calculate duration from the last word's end time
      const estimatedDurationMs = wordTimings.length > 0
        ? wordTimings[wordTimings.length - 1].endMs
        : 0

      return {
        audioBuffer,
        contentType: 'audio/mpeg',
        wordTimings,
        estimatedDurationMs,
        provider: 'inworld',
        timingSource: 'actual', // InWorld provides actual word-level timestamps
        voice
      }
    }
  }
}
