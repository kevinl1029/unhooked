import type { IllusionKey, IllusionLayer } from '~/server/utils/llm/task-types'
import { illusionNumberToKey } from '~/server/utils/llm/task-types'

export interface Progress {
  id: string
  user_id: string
  program_status: 'not_started' | 'in_progress' | 'completed'
  current_illusion: number
  illusion_order: number[]
  illusions_completed: number[]
  layer_progress: Record<string, IllusionLayer[]>
  total_sessions: number
  last_reminded_at: string | null
  started_at: string | null
  completed_at: string | null
  last_session_at: string | null
  created_at: string
  updated_at: string
}

export interface CompleteSessionResponse {
  progress: Progress
  nextIllusion: number | null
  isComplete: boolean
  layerCompleted?: IllusionLayer
  nextLayer?: IllusionLayer | null
  isIllusionComplete?: boolean
  observationAssignment?: string | null
}

export const LAYER_ORDER: IllusionLayer[] = ['intellectual', 'emotional', 'identity']

export const useProgress = () => {
  const progress = ref<Progress | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchProgress = async () => {
    isLoading.value = true
    error.value = null

    try {
      const data = await $fetch<Progress | null>('/api/progress', {
        method: 'GET',
      })
      progress.value = data
    } catch (err: any) {
      console.error('Error fetching progress:', err)
      error.value = err.data?.message || 'Failed to load progress data'
    } finally {
      isLoading.value = false
    }
  }

  const completeSession = async (
    conversationId: string,
    illusionKey: IllusionKey,
    illusionLayer?: IllusionLayer
  ) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<CompleteSessionResponse>('/api/progress/complete-session', {
        method: 'POST',
        body: {
          conversationId,
          illusionKey,
          illusionLayer,
        },
      })
      progress.value = response.progress
      return response
    } catch (err: any) {
      console.error('Error completing session:', err)
      error.value = err.data?.message || 'Failed to complete session'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getNextIllusion = (): number | null => {
    if (!progress.value) return null

    const { illusion_order, illusions_completed } = progress.value

    // Find first illusion in order that isn't completed
    const nextIllusion = illusion_order.find(illusion => !illusions_completed.includes(illusion))

    return nextIllusion ?? null
  }

  const isIllusionCompleted = (illusionNumber: number): boolean => {
    if (!progress.value) return false
    return progress.value.illusions_completed.includes(illusionNumber)
  }

  /**
   * Helper to get the current illusion key from illusion_order and current_illusion
   */
  const getCurrentIllusionKey = (): IllusionKey | null => {
    if (!progress.value) return null
    const currentIllusionNumber = progress.value.current_illusion
    return illusionNumberToKey(currentIllusionNumber)
  }

  /**
   * Get the layers completed for a specific illusion
   */
  const layersCompletedForIllusion = (illusionKey: string): IllusionLayer[] => {
    if (!progress.value || !progress.value.layer_progress) return []
    return progress.value.layer_progress[illusionKey] || []
  }

  /**
   * Computed: Current layer for the active illusion (next incomplete layer)
   */
  const currentLayer = computed<IllusionLayer>(() => {
    if (!progress.value) return 'intellectual'

    const currentIllusionKey = getCurrentIllusionKey()
    if (!currentIllusionKey) return 'intellectual'

    const completedLayers = layersCompletedForIllusion(currentIllusionKey)

    // Find first incomplete layer in order
    const nextLayer = LAYER_ORDER.find(layer => !completedLayers.includes(layer))
    return nextLayer || 'intellectual'
  })

  /**
   * Computed: Current layer session number (completed count + 1)
   */
  const layerSessionNumber = computed<number>(() => {
    if (!progress.value) return 1

    const currentIllusionKey = getCurrentIllusionKey()
    if (!currentIllusionKey) return 1

    const completedLayers = layersCompletedForIllusion(currentIllusionKey)
    return completedLayers.length + 1
  })

  /**
   * Computed: Full layer_progress object
   */
  const layerProgress = computed<Record<string, IllusionLayer[]>>(() => {
    if (!progress.value || !progress.value.layer_progress) return {}
    return progress.value.layer_progress
  })

  return {
    progress,
    isLoading,
    error,
    fetchProgress,
    completeSession,
    getNextIllusion,
    isIllusionCompleted,
    currentLayer,
    layerSessionNumber,
    layersCompletedForIllusion,
    layerProgress,
  }
}
