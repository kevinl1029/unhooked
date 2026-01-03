/**
 * ElevenLabs TTS Provider
 *
 * Uses ElevenLabs' TTS API with actual word-level timing data.
 * The /with-timestamps endpoint returns character-level alignment
 * which we aggregate into word timings.
 */

import type { TTSProvider, TTSResult, TTSOptions, WordTiming } from './types'

// ElevenLabs API response types
interface ElevenLabsAlignment {
  characters: string[]
  character_start_times_seconds: number[]
  character_end_times_seconds: number[]
}

interface ElevenLabsResponse {
  audio_base64: string
  alignment: ElevenLabsAlignment
}

export function createElevenLabsProvider(
  apiKey: string,
  defaultVoiceId: string = 'EXAVITQu4vr4xnSDxMaL', // Bella
  model: string = 'eleven_flash_v2_5'
): TTSProvider {
  return {
    async synthesize(options: TTSOptions): Promise<TTSResult> {
      const { text, voice = defaultVoiceId } = options

      if (!text || typeof text !== 'string') {
        throw new Error('Text is required')
      }

      // ElevenLabs has a higher character limit than OpenAI
      const maxLength = 5000
      if (text.length > maxLength) {
        throw new Error(`Text too long (max ${maxLength} characters)`)
      }

      // Call ElevenLabs TTS API with timestamps
      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text,
            model_id: model,
            output_format: 'mp3_44100_128'
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ElevenLabs TTS] API error:', response.status, errorText)

        if (response.status === 401) {
          throw new Error('Invalid ElevenLabs API key')
        } else if (response.status === 422) {
          throw new Error('Invalid request to ElevenLabs API')
        }
        throw new Error('Text-to-speech synthesis failed')
      }

      const data: ElevenLabsResponse = await response.json()

      // Convert base64 audio to ArrayBuffer
      const binaryString = atob(data.audio_base64)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const audioBuffer = bytes.buffer

      // Extract word timings from character-level alignment
      const wordTimings = extractWordTimings(text, data.alignment)

      // Calculate duration from the last character's end time
      const lastEndTime = data.alignment.character_end_times_seconds.length > 0
        ? data.alignment.character_end_times_seconds[data.alignment.character_end_times_seconds.length - 1]
        : 0
      const estimatedDurationMs = Math.round(lastEndTime * 1000)

      return {
        audioBuffer,
        contentType: 'audio/mpeg',
        wordTimings,
        estimatedDurationMs,
        provider: 'elevenlabs',
        timingSource: 'actual',
        voice
      }
    }
  }
}

/**
 * Extract word timings from ElevenLabs character-level alignment data.
 *
 * ElevenLabs returns timing for each character. We aggregate these into
 * word-level timings by tracking word boundaries (spaces).
 */
function extractWordTimings(
  originalText: string,
  alignment: ElevenLabsAlignment
): WordTiming[] {
  const { characters, character_start_times_seconds, character_end_times_seconds } = alignment

  if (characters.length === 0) {
    console.warn('[ElevenLabs] No alignment data received')
    return []
  }

  const wordTimings: WordTiming[] = []
  let currentWord = ''
  let wordStartMs: number | null = null
  let wordEndMs = 0

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i]
    const startMs = Math.round(character_start_times_seconds[i] * 1000)
    const endMs = Math.round(character_end_times_seconds[i] * 1000)

    // Check if this is a word boundary (space or punctuation followed by space)
    const isSpace = char === ' ' || char === '\n' || char === '\t'

    if (isSpace) {
      // End of current word
      if (currentWord.length > 0 && wordStartMs !== null) {
        wordTimings.push({
          word: currentWord,
          startMs: wordStartMs,
          endMs: wordEndMs
        })
      }
      // Reset for next word
      currentWord = ''
      wordStartMs = null
    } else {
      // Part of a word
      if (wordStartMs === null) {
        wordStartMs = startMs
      }
      currentWord += char
      wordEndMs = endMs
    }
  }

  // Don't forget the last word
  if (currentWord.length > 0 && wordStartMs !== null) {
    wordTimings.push({
      word: currentWord,
      startMs: wordStartMs,
      endMs: wordEndMs
    })
  }

  return wordTimings
}
