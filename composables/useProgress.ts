import type { IllusionKey } from '~/server/utils/llm/task-types'

export interface Progress {
  id: string
  user_id: string
  program_status: 'not_started' | 'in_progress' | 'completed'
  current_illusion: number
  illusion_order: number[]
  illusions_completed: number[]
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
}

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

  const completeSession = async (conversationId: string, illusionKey: IllusionKey) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<CompleteSessionResponse>('/api/progress/complete-session', {
        method: 'POST',
        body: {
          conversationId,
          illusionKey,
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

  return {
    progress,
    isLoading,
    error,
    fetchProgress,
    completeSession,
    getNextIllusion,
    isIllusionCompleted,
  }
}
