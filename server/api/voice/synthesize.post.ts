import { serverSupabaseUser } from '#supabase/server'
import { getTTSProviderFromConfig } from '~/server/utils/tts'

export default defineEventHandler(async (event) => {
  // Verify authentication
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { text, voice } = body as {
    text: string
    voice?: string
  }

  if (!text || typeof text !== 'string') {
    throw createError({ statusCode: 400, message: 'Text is required' })
  }

  try {
    // Get the configured TTS provider
    const provider = getTTSProviderFromConfig()

    // Synthesize speech
    const result = await provider.synthesize({ text, voice })

    // Convert ArrayBuffer to base64 for JSON response
    const base64Audio = Buffer.from(result.audioBuffer).toString('base64')

    return {
      audio: base64Audio,
      contentType: result.contentType,
      wordTimings: result.wordTimings,
      estimatedDurationMs: result.estimatedDurationMs,
      voice: result.voice,
      provider: result.provider,
      timingSource: result.timingSource
    }
  } catch (error: any) {
    // Re-throw if it's already a Nuxt error
    if (error.statusCode) {
      throw error
    }
    console.error('[synthesize] TTS error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to synthesize speech'
    })
  }
})
