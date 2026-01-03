/**
 * OpenAI TTS Provider
 *
 * Uses OpenAI's TTS API with estimated word timings.
 * Word timings are calculated based on average speaking rate (150 WPM)
 * and adjusted based on word length and punctuation.
 */

import type { TTSProvider, TTSResult, TTSOptions, WordTiming } from './types'

// OpenAI TTS voices
type OpenAIVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

// Average speaking rate for word timing estimation (words per minute)
const WORDS_PER_MINUTE = 150

const VALID_VOICES: OpenAIVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']

export function createOpenAIProvider(apiKey: string, defaultVoice: string = 'nova'): TTSProvider {
  return {
    async synthesize(options: TTSOptions): Promise<TTSResult> {
      const { text, voice = defaultVoice } = options

      if (!text || typeof text !== 'string') {
        throw new Error('Text is required')
      }

      // Limit text length (OpenAI TTS has a 4096 character limit)
      const maxLength = 4096
      if (text.length > maxLength) {
        throw new Error(`Text too long (max ${maxLength} characters)`)
      }

      // Validate voice
      const voiceToUse = VALID_VOICES.includes(voice as OpenAIVoice) ? voice : defaultVoice

      // Call OpenAI TTS API
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: voiceToUse,
          response_format: 'mp3'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[OpenAI TTS] API error:', response.status, errorText)
        throw new Error('Text-to-speech synthesis failed')
      }

      // Get audio as buffer
      const audioBuffer = await response.arrayBuffer()

      // Calculate estimated word timings
      const wordTimings = calculateWordTimings(text)

      // Estimate total duration based on word count
      const words = text.split(/\s+/).filter(w => w.length > 0)
      const estimatedDurationMs = Math.round((words.length / WORDS_PER_MINUTE) * 60 * 1000)

      return {
        audioBuffer,
        contentType: 'audio/mpeg',
        wordTimings,
        estimatedDurationMs,
        provider: 'openai',
        timingSource: 'estimated',
        voice: voiceToUse
      }
    }
  }
}

function calculateWordTimings(text: string): WordTiming[] {
  const words = text.split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return []

  // Calculate milliseconds per word based on speaking rate
  const msPerWord = (60 * 1000) / WORDS_PER_MINUTE
  const timings: WordTiming[] = []

  let currentTime = 0

  for (const word of words) {
    // Adjust timing based on word length and punctuation
    let wordDuration = msPerWord

    // Longer words take slightly longer
    if (word.length > 8) {
      wordDuration *= 1.2
    } else if (word.length < 3) {
      wordDuration *= 0.8
    }

    // Add pause after punctuation
    const hasPunctuation = /[.!?]$/.test(word)
    const hasComma = /[,;:]$/.test(word)

    timings.push({
      word: word,
      startMs: Math.round(currentTime),
      endMs: Math.round(currentTime + wordDuration)
    })

    currentTime += wordDuration

    // Add pauses after punctuation
    if (hasPunctuation) {
      currentTime += 300 // 300ms pause after sentence
    } else if (hasComma) {
      currentTime += 150 // 150ms pause after comma
    }
  }

  return timings
}
