/**
 * Debug endpoint to check LLM provider configuration
 * Shows which providers are available and what the defaults are
 */

import { getModelRouter, getDefaultModel } from '~/server/utils/llm'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const router = getModelRouter()

  const availableProviders = router.listAvailableModels()

  return {
    defaultModel: getDefaultModel(),
    availableProviders,
    configuration: {
      groq: {
        configured: !!config.groqApiKey,
        apiKeySet: config.groqApiKey ? '✓ Set' : '✗ Not set',
        defaultModel: config.groqModel,
      },
      gemini: {
        configured: !!config.geminiApiKey,
        apiKeySet: config.geminiApiKey ? '✓ Set' : '✗ Not set',
        defaultModel: config.geminiModel,
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
    timestamp: new Date().toISOString(),
  }
})
