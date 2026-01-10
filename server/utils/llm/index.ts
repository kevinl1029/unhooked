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

export * from './types'
export * from './task-types'
export * from './task-executor'

// Task implementations
export { detectMoment, shouldAttemptDetection, getSessionDetectionTracker, TRANSCRIPT_CAPTURE_THRESHOLD, AUDIO_CAPTURE_THRESHOLD } from './tasks/moment-detection'
export { assessConviction } from './tasks/conviction-assessment'
export { selectKeyInsight } from './tasks/key-insight-selection'
export { personalizeCheckIn } from './tasks/checkin-personalization'
export { summarizeOriginStory, shouldGenerateSummary } from './tasks/story-summarization'
export { selectCeremonyMoments } from './tasks/ceremony-select'
export { generateCeremonyNarrative } from './tasks/ceremony-narrative'
