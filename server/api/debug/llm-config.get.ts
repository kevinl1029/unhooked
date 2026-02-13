/**
 * Debug endpoint to check LLM provider configuration
 * Shows which providers are available and what the defaults are
 */

import { getModelRouter, getDefaultModel } from '~/server/utils/llm'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const router = getModelRouter()

  const availableProviders = router.listAvailableModels()
  const defaultProvider = getDefaultModel()
  const chatPrimaryProvider = (config.chatPrimaryProvider as string | undefined) || defaultProvider
  const chatSecondaryProvider = (config.chatSecondaryProvider as string | undefined) || null
  const effectiveGroqModel = (config.groqModel as string | undefined) || 'openai/gpt-oss-20b'
  const effectiveGeminiModel = (config.geminiModel as string | undefined) || 'gemini-3-flash-preview'

  return {
    defaultModel: defaultProvider,
    availableProviders,
    routing: {
      chatPrimaryProvider,
      chatSecondaryProvider,
      effectiveGroqModelWhenSelected: effectiveGroqModel,
      effectiveGeminiModelWhenSelected: effectiveGeminiModel,
      defaultProviderModel:
        defaultProvider === 'groq'
          ? effectiveGroqModel
          : defaultProvider === 'gemini'
            ? effectiveGeminiModel
            : null,
    },
    configuration: {
      groq: {
        configured: !!config.groqApiKey,
        apiKeySet: config.groqApiKey ? '✓ Set' : '✗ Not set',
        defaultModel: effectiveGroqModel,
      },
      gemini: {
        configured: !!config.geminiApiKey,
        apiKeySet: config.geminiApiKey ? '✓ Set' : '✗ Not set',
        defaultModel: effectiveGeminiModel,
      },
      anthropic: {
        configured: !!config.anthropicApiKey,
        apiKeySet: config.anthropicApiKey ? '✓ Set' : '✗ Not set',
      },
      openai: {
        configured: !!config.openaiApiKey,
        apiKeySet: config.openaiApiKey ? '✓ Set' : '✗ Not set',
      },
    },
    envPresence: {
      defaultLlmProvider: process.env.DEFAULT_LLM_PROVIDER ? 'set' : 'unset',
      nuxtDefaultLlmProvider: process.env.NUXT_DEFAULT_LLM_PROVIDER ? 'set' : 'unset',
      groqModel: process.env.GROQ_MODEL ? 'set' : 'unset',
      chatPrimaryProvider: process.env.CHAT_PRIMARY_PROVIDER ? 'set' : 'unset',
      chatSecondaryProvider: process.env.CHAT_SECONDARY_PROVIDER ? 'set' : 'unset',
    },
    timestamp: new Date().toISOString(),
  }
})
