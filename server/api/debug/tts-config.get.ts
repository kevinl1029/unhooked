/**
 * Debug endpoint to inspect effective TTS configuration at runtime.
 * Never returns secret values; only presence/derived state.
 */

import type { TTSProviderType } from '~/server/utils/tts'

function deriveEffectiveProvider(config: ReturnType<typeof useRuntimeConfig>): TTSProviderType | 'unconfigured' {
  const provider = (config.ttsProvider as TTSProviderType) || 'groq'

  if (provider === 'groq') {
    if (config.groqApiKey) return 'groq'
    if (config.openaiApiKey) return 'openai'
    return 'unconfigured'
  }

  if (provider === 'inworld') {
    if (config.inworldApiKey) return 'inworld'
    if (config.openaiApiKey) return 'openai'
    return 'unconfigured'
  }

  if (provider === 'elevenlabs') {
    if (config.elevenlabsApiKey) return 'elevenlabs'
    if (config.openaiApiKey) return 'openai'
    return 'unconfigured'
  }

  if (provider === 'openai') {
    if (config.openaiApiKey) return 'openai'
    return 'unconfigured'
  }

  return 'unconfigured'
}

export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const configuredProvider = (config.ttsProvider as TTSProviderType) || 'groq'
  const effectiveProvider = deriveEffectiveProvider(config)

  return {
    configuredProvider,
    effectiveProvider,
    credentials: {
      groqApiKeySet: !!config.groqApiKey,
      inworldApiKeySet: !!config.inworldApiKey,
      elevenlabsApiKeySet: !!config.elevenlabsApiKey,
      openaiApiKeySet: !!config.openaiApiKey,
    },
    envPresence: {
      ttsProvider: process.env.TTS_PROVIDER ? 'set' : 'unset',
      nuxtTtsProvider: process.env.NUXT_TTS_PROVIDER ? 'set' : 'unset',
    },
    voices: {
      groq: config.groqTtsVoice || null,
      inworld: config.inworldVoiceId || null,
      openai: config.openaiTtsVoice || null,
      elevenlabs: config.elevenlabsVoiceId || null,
    },
    timestamp: new Date().toISOString(),
  }
})
