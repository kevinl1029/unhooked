import { ModelRouter } from './router'

let router: ModelRouter | null = null

export function getModelRouter(): ModelRouter {
  if (!router) {
    const config = useRuntimeConfig()
    router = new ModelRouter({
      geminiApiKey: config.geminiApiKey,
      geminiModel: config.geminiModel,
      anthropicApiKey: config.anthropicApiKey,
      openaiApiKey: config.openaiApiKey
    })
  }
  return router
}

export * from './types'
export * from './task-types'
export * from './task-executor'
