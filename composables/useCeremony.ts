/**
 * useCeremony() - Orchestrates the full ceremony lifecycle
 * Manages ceremony phases, API interactions, and auto-transition logic
 */

export type CeremonyPhase =
  | 'pre-ceremony'
  | 'conversation'
  | 'recording'
  | 'completing'
  | 'transitioning'
  | 'error'

export interface CeremonyPrepareResponse {
  ready: boolean
  ceremony_completed: boolean
  active_conversation_id?: string
  user_story: {
    id: string
    origin_summary: string | null
    primary_triggers: string | null
    personal_stakes: string | null
    ceremony_completed_at: string | null
  }
  moments_by_type: Record<string, any[]>
  illusions_completed: string[]
  total_moments: number
  suggested_journey_moments: any[]
}

export interface CeremonyCompleteResponse {
  status: 'completed'
  ceremony_completed_at: string
  journey_artifact_status: 'ready' | 'generating' | 'pending'
}

export const useCeremony = () => {
  // Reactive state
  const ceremonyPhase = ref<CeremonyPhase>('pre-ceremony')
  const conversationId = ref<string | null>(null)
  const isRecording = ref(false)
  const isCompleting = ref(false)
  const isTransitioning = ref(false)
  const showExitDialog = ref(false)
  const error = ref<string | null>(null)
  const ariaAnnouncement = ref('')
  const finalRecordingPath = ref<string | null>(null)

  /**
   * Start ceremony - validates readiness and transitions to conversation
   */
  const startCeremony = async () => {
    try {
      error.value = null

      const data = await $fetch<CeremonyPrepareResponse>('/api/ceremony/prepare', {
        method: 'GET',
      })

      if (!data.ready) {
        error.value = 'You are not ready for the ceremony yet. Complete all five illusions first.'
        ceremonyPhase.value = 'error'
        return
      }

      // Use active_conversation_id if provided (concurrent tab handling)
      conversationId.value = data.active_conversation_id || null
      ceremonyPhase.value = 'conversation'
    } catch (err: any) {
      console.error('[useCeremony] Failed to prepare ceremony:', err)
      error.value = err.data?.message || 'Failed to start ceremony. Please try again.'
      ceremonyPhase.value = 'error'
    }
  }

  /**
   * Handle recording prompt - pause conversation and show recording UI
   */
  const handleRecordingPrompt = () => {
    ceremonyPhase.value = 'recording'
    isRecording.value = true
  }

  /**
   * Handle recording saved (audio) - resume conversation
   */
  const handleRecordingSaved = (path?: string) => {
    if (path) {
      finalRecordingPath.value = path
    }
    ceremonyPhase.value = 'conversation'
    isRecording.value = false
  }

  /**
   * Handle text saved (typed message) - resume conversation
   */
  const handleTextSaved = (text: string) => {
    // Text is stored inline, no path needed
    ceremonyPhase.value = 'conversation'
    isRecording.value = false
  }

  /**
   * Exponential backoff retry with configurable attempts and base delay
   */
  const retryWithBackoff = async <T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    let lastError: any = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn()
      } catch (err) {
        lastError = err
        console.error(`[useCeremony] Retry attempt ${attempt + 1}/${maxRetries} failed:`, err)

        // Don't wait after the last attempt
        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt) // 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }

  /**
   * Handle session complete - finalize ceremony with retries and auto-transition
   */
  const handleSessionComplete = async () => {
    ceremonyPhase.value = 'completing'
    isCompleting.value = true

    try {
      // Complete ceremony with exponential backoff retries (1s, 2s, 4s)
      const response = await retryWithBackoff<CeremonyCompleteResponse>(
        () => $fetch('/api/ceremony/complete', {
          method: 'POST',
          body: {
            conversation_id: conversationId.value,
            final_recording_path: finalRecordingPath.value || undefined,
          },
        }),
        3, // Max 3 retries
        1000 // 1 second base delay
      )

      // Transition to transitioning phase
      ceremonyPhase.value = 'transitioning'
      isTransitioning.value = true
      ariaAnnouncement.value = 'Transitioning to your dashboard in a moment.'

      // Check if user prefers reduced motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

      if (prefersReducedMotion) {
        // Navigate immediately if reduced motion is preferred
        await navigateTo('/dashboard')
      } else {
        // Wait 5 seconds for fade animation, then navigate
        setTimeout(async () => {
          await navigateTo('/dashboard')
        }, 5000)
      }
    } catch (err: any) {
      console.error('[useCeremony] Failed to complete ceremony after retries:', err)
      error.value = err.data?.message || 'Failed to complete ceremony. Please try again from your dashboard.'
      ceremonyPhase.value = 'error'
    } finally {
      isCompleting.value = false
    }
  }

  /**
   * Handle escape key - toggle exit dialog
   */
  const handleEscapeKey = () => {
    showExitDialog.value = !showExitDialog.value
  }

  /**
   * Handle leave - navigate to dashboard
   */
  const handleLeave = () => {
    navigateTo('/dashboard')
  }

  /**
   * Handle stay - dismiss exit dialog
   */
  const handleStay = () => {
    showExitDialog.value = false
  }

  return {
    // Reactive state
    ceremonyPhase,
    conversationId,
    isRecording,
    isCompleting,
    isTransitioning,
    showExitDialog,
    error,
    ariaAnnouncement,

    // Methods
    startCeremony,
    handleRecordingPrompt,
    handleRecordingSaved,
    handleTextSaved,
    handleSessionComplete,
    handleEscapeKey,
    handleLeave,
    handleStay,
  }
}
