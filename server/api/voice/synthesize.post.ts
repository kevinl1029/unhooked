import { serverSupabaseUser } from '#supabase/server'

// OpenAI TTS voices
type TTSVoice = 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer'

// Default voice for the app (nova is friendly and warm)
const DEFAULT_VOICE: TTSVoice = 'nova'

// Average speaking rate for word timing estimation (words per minute)
const WORDS_PER_MINUTE = 150

export default defineEventHandler(async (event) => {
  // Verify authentication
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  if (!config.openaiApiKey) {
    throw createError({ statusCode: 500, message: 'OpenAI API key not configured' })
  }

  const body = await readBody(event)
  const { text, voice = DEFAULT_VOICE } = body as {
    text: string
    voice?: TTSVoice
  }

  if (!text || typeof text !== 'string') {
    throw createError({ statusCode: 400, message: 'Text is required' })
  }

  // Limit text length (OpenAI TTS has a 4096 character limit)
  const maxLength = 4096
  if (text.length > maxLength) {
    throw createError({
      statusCode: 400,
      message: `Text too long (max ${maxLength} characters)`
    })
  }

  // Validate voice
  const validVoices: TTSVoice[] = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
  if (!validVoices.includes(voice)) {
    throw createError({
      statusCode: 400,
      message: `Invalid voice. Must be one of: ${validVoices.join(', ')}`
    })
  }

  try {
    // Call OpenAI TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: text,
        voice: voice,
        response_format: 'mp3'
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('TTS API error:', response.status, errorText)
      throw createError({
        statusCode: response.status,
        message: 'Text-to-speech synthesis failed'
      })
    }

    // Get audio as buffer and convert to base64
    const audioBuffer = await response.arrayBuffer()
    const base64Audio = Buffer.from(audioBuffer).toString('base64')

    // Calculate estimated word timings
    const wordTimings = calculateWordTimings(text)

    // Estimate total duration based on word count
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const estimatedDurationMs = Math.round((words.length / WORDS_PER_MINUTE) * 60 * 1000)

    return {
      audio: base64Audio,
      contentType: 'audio/mpeg',
      wordTimings,
      estimatedDurationMs,
      voice
    }
  } catch (error: any) {
    // Re-throw if it's already a Nuxt error
    if (error.statusCode) {
      throw error
    }
    console.error('TTS error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to synthesize speech'
    })
  }
})

interface WordTiming {
  word: string
  startMs: number
  endMs: number
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
