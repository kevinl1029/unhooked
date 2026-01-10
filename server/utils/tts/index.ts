/**
 * TTS Provider Factory
 *
 * Creates the appropriate TTS provider based on configuration.
 * Supports Groq (default), OpenAI (estimated timings), and ElevenLabs (actual timings).
 */

import type { TTSProvider, TTSProviderType } from './types'
import { createOpenAIProvider } from './openai'
import { createElevenLabsProvider } from './elevenlabs'
import { createGroqProvider } from './groq'

export * from './types'

interface TTSConfig {
  provider: TTSProviderType
  groqApiKey?: string
  groqVoice?: string
  openaiApiKey?: string
  openaiVoice?: string
  elevenlabsApiKey?: string
  elevenlabsVoiceId?: string
  elevenlabsModel?: string
}

/**
 * Create a TTS provider based on the configuration.
 *
 * Priority: Groq (default) > ElevenLabs > OpenAI
 * Falls back through the chain if requested provider is not configured.
 */
export function createTTSProvider(config: TTSConfig): TTSProvider {
  const { provider, groqApiKey, groqVoice, openaiApiKey, openaiVoice, elevenlabsApiKey, elevenlabsVoiceId, elevenlabsModel } = config

  // Groq provider (default)
  if (provider === 'groq') {
    if (!groqApiKey) {
      console.warn('[TTS] Groq requested but no API key configured, falling back to OpenAI')
      if (!openaiApiKey) {
        throw new Error('No TTS provider API key configured')
      }
      return createOpenAIProvider(openaiApiKey, openaiVoice)
    }
    return createGroqProvider(groqApiKey, groqVoice)
  }

  // ElevenLabs provider
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

  // OpenAI provider
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
    provider: (config.ttsProvider as TTSProviderType) || 'groq',
    groqApiKey: config.groqApiKey,
    groqVoice: config.groqTtsVoice,
    openaiApiKey: config.openaiApiKey,
    openaiVoice: config.openaiTtsVoice,
    elevenlabsApiKey: config.elevenlabsApiKey,
    elevenlabsVoiceId: config.elevenlabsVoiceId,
    elevenlabsModel: config.elevenlabsModel
  })
}
