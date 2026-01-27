import { ModelRouter } from './router'
import type { ModelType } from './types'
import { FALLBACK_MODEL } from './types'

let router: ModelRouter | null = null

export function getModelRouter(): ModelRouter {
  if (!router) {
    const config = useRuntimeConfig()
    router = new ModelRouter({
      groqApiKey: config.groqApiKey,
      groqModel: config.groqModel,
      geminiApiKey: config.geminiApiKey,
      geminiModel: config.geminiModel,
      anthropicApiKey: config.anthropicApiKey,
      openaiApiKey: config.openaiApiKey
    })
  }
  return router
}

export function getDefaultModel(): ModelType {
  const config = useRuntimeConfig()
  return (config.defaultLlmProvider as ModelType) || FALLBACK_MODEL
}

// Note: Individual task files (moment-detection.ts, conviction-assessment.ts, etc.)
// are NOT re-exported here to avoid Nuxt auto-import duplicate warnings.
// Nuxt auto-imports all exports from server/utils/ - import directly from source files if needed.
