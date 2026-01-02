export interface Progress {
  id: string
  user_id: string
  program_status: 'not_started' | 'in_progress' | 'completed'
  current_myth: number
  myth_order: number[]
  myths_completed: number[]
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
  nextMyth: number | null
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

  const completeSession = async (conversationId: string, mythNumber: number) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<CompleteSessionResponse>('/api/progress/complete-session', {
        method: 'POST',
        body: {
          conversationId,
          mythNumber,
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

  const getNextMyth = (): number | null => {
    if (!progress.value) return null

    const { myth_order, myths_completed } = progress.value

    // Find first myth in order that isn't completed
    const nextMyth = myth_order.find(myth => !myths_completed.includes(myth))

    return nextMyth ?? null
  }

  const isMythCompleted = (mythNumber: number): boolean => {
    if (!progress.value) return false
    return progress.value.myths_completed.includes(mythNumber)
  }

  return {
    progress,
    isLoading,
    error,
    fetchProgress,
    completeSession,
    getNextMyth,
    isMythCompleted,
  }
}
