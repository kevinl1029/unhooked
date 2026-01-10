/**
 * User Status Composable
 * Provides comprehensive user status for dashboard rendering
 */

export interface UserStatus {
  phase: 'not_started' | 'in_progress' | 'ceremony_ready' | 'post_ceremony'
  progress: {
    program_status: string
    current_myth: number
    myths_completed: number[]
    myth_order: number[]
    total_sessions: number
    started_at: string | null
  } | null
  ceremony: {
    completed_at: string | null
    already_quit: boolean
  } | null
  artifacts: {
    reflective_journey: { id: string; audio_duration_ms?: number } | null
    final_recording: { id: string; audio_path?: string; audio_duration_ms?: number } | null
    myths_cheat_sheet: { id: string } | null
  } | null
  pending_follow_ups: Array<{
    id: string
    milestone_type: string
    scheduled_for: string
    status: string
  }> | null
  next_session: {
    mythNumber: number
  } | null
}

export const useUserStatus = () => {
  const status = ref<UserStatus | null>(null)
  const isLoading = ref(true) // Start true so loading shows until fetch completes
  const error = ref<string | null>(null)

  const fetchStatus = async () => {
    isLoading.value = true
    error.value = null

    try {
      const data = await $fetch<UserStatus>('/api/user/status')
      status.value = data
    } catch (err: any) {
      console.error('Error fetching user status:', err)
      error.value = err.data?.message || 'Failed to load status'
    } finally {
      isLoading.value = false
    }
  }

  // Computed helpers
  const isPostCeremony = computed(() => status.value?.phase === 'post_ceremony')
  const isCeremonyReady = computed(() => status.value?.phase === 'ceremony_ready')
  const isInProgress = computed(() => status.value?.phase === 'in_progress')
  const hasNotStarted = computed(() => status.value?.phase === 'not_started')

  const hasJourneyArtifact = computed(() => !!status.value?.artifacts?.reflective_journey)
  const hasFinalRecording = computed(() => !!status.value?.artifacts?.final_recording)
  const hasCheatSheet = computed(() => !!status.value?.artifacts?.myths_cheat_sheet)

  const nextFollowUp = computed(() => {
    if (!status.value?.pending_follow_ups?.length) return null
    return status.value.pending_follow_ups[0]
  })

  const mythsCompletedCount = computed(() => {
    return status.value?.progress?.myths_completed?.length || 0
  })

  const ceremonyDate = computed(() => {
    if (!status.value?.ceremony?.completed_at) return null
    return new Date(status.value.ceremony.completed_at)
  })

  return {
    status,
    isLoading,
    error,
    fetchStatus,
    // Computed
    isPostCeremony,
    isCeremonyReady,
    isInProgress,
    hasNotStarted,
    hasJourneyArtifact,
    hasFinalRecording,
    hasCheatSheet,
    nextFollowUp,
    mythsCompletedCount,
    ceremonyDate,
  }
}
