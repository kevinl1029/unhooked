/**
 * Groq TTS Provider
 *
 * Uses Groq's TTS API (Orpheus model) with estimated word timings.
 * Supports vocal directions like [cheerful], [sad], [whisper] in text.
 * Word timings are calculated based on average speaking rate (150 WPM).
 */

import type { TTSProvider, TTSResult, TTSOptions, WordTiming } from './types'

// Groq Orpheus voices
type GroqVoice = 'troy' | 'hannah' | 'austin'

// Average speaking rate for word timing estimation (words per minute)
const WORDS_PER_MINUTE = 150

const VALID_VOICES: GroqVoice[] = ['troy', 'hannah', 'austin']

export function createGroqProvider(apiKey: string, defaultVoice: string = 'troy'): TTSProvider {
  return {
    async synthesize(options: TTSOptions): Promise<TTSResult> {
      const { text, voice = defaultVoice } = options

      if (!text || typeof text !== 'string') {
        throw new Error('Text is required')
      }

      // Validate voice
      const voiceToUse = VALID_VOICES.includes(voice as GroqVoice) ? voice : defaultVoice

      // Call Groq TTS API (OpenAI-compatible endpoint)
      const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'canopylabs/orpheus-v1-english',
          input: text,
          voice: voiceToUse,
          response_format: 'mp3'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Groq TTS] API error:', response.status, errorText)
        throw new Error('Text-to-speech synthesis failed')
      }

      // Get audio as buffer
      const audioBuffer = await response.arrayBuffer()

      // Calculate estimated word timings (excluding vocal direction markers)
      const wordTimings = calculateWordTimings(text)

      // Estimate total duration based on word count
      const words = getSpokenWords(text)
      const estimatedDurationMs = Math.round((words.length / WORDS_PER_MINUTE) * 60 * 1000)

      return {
        audioBuffer,
        contentType: 'audio/mpeg',
        wordTimings,
        estimatedDurationMs,
        provider: 'groq',
        timingSource: 'estimated',
        voice: voiceToUse
      }
    }
  }
}

/**
 * Extract spoken words from text, excluding vocal direction markers like [cheerful]
 */
function getSpokenWords(text: string): string[] {
  // Remove vocal direction markers
  const cleanText = text.replace(/\[[^\]]+\]/g, '')
  return cleanText.split(/\s+/).filter(w => w.length > 0)
}

function calculateWordTimings(text: string): WordTiming[] {
  const words = getSpokenWords(text)
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
