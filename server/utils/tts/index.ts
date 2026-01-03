/**
 * TTS Provider Factory
 *
 * Creates the appropriate TTS provider based on configuration.
 * Supports OpenAI (with estimated timings) and ElevenLabs (with actual timings).
 */

import type { TTSProvider, TTSProviderType } from './types'
import { createOpenAIProvider } from './openai'
import { createElevenLabsProvider } from './elevenlabs'

export * from './types'

interface TTSConfig {
  provider: TTSProviderType
  openaiApiKey?: string
  openaiVoice?: string
  elevenlabsApiKey?: string
  elevenlabsVoiceId?: string
  elevenlabsModel?: string
}

/**
 * Create a TTS provider based on the configuration.
 *
 * Falls back to OpenAI if ElevenLabs is requested but not configured.
 */
export function createTTSProvider(config: TTSConfig): TTSProvider {
  const { provider, openaiApiKey, openaiVoice, elevenlabsApiKey, elevenlabsVoiceId, elevenlabsModel } = config

  if (provider === 'elevenlabs') {
    if (!elevenlabsApiKey) {
      console.warn('[TTS] ElevenLabs requested but no API key configured, falling back to OpenAI')
      if (!openaiApiKey) {
        throw new Error('No TTS provider API key configured')
      }
      return createOpenAIProvider(openaiApiKey, openaiVoice)
    }
    return createElevenLabsProvider(elevenlabsApiKey, elevenlabsVoiceId, elevenlabsModel)
  }

  // Default to OpenAI
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured')
  }
  return createOpenAIProvider(openaiApiKey, openaiVoice)
}

/**
 * Get TTS provider from Nuxt runtime config.
 *
 * This is a convenience function for use in API endpoints.
 */
export function getTTSProviderFromConfig(): TTSProvider {
  const config = useRuntimeConfig()

  return createTTSProvider({
    provider: (config.ttsProvider as TTSProviderType) || 'openai',
    openaiApiKey: config.openaiApiKey,
    openaiVoice: config.openaiTtsVoice,
    elevenlabsApiKey: config.elevenlabsApiKey,
    elevenlabsVoiceId: config.elevenlabsVoiceId,
    elevenlabsModel: config.elevenlabsModel
  })
}
