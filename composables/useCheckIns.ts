/**
 * Check-In Composable
 * Manages check-in state, interstitials, and timezone detection
 */

interface PendingCheckIn {
  id: string
  prompt: string
  type: string
  illusion_key?: string | null
}

interface InterstitialCheckIn {
  has_pending: boolean
  check_in?: PendingCheckIn
}

export function useCheckIns() {
  const showInterstitial = ref(false)
  const pendingCheckIn = ref<PendingCheckIn | null>(null)
  const isLoading = ref(false)
  const isAudioPlaying = ref(false)

  /**
   * Check for pending interstitial check-in
   */
  async function checkForInterstitial(): Promise<boolean> {
    isLoading.value = true
    try {
      const data = await $fetch<InterstitialCheckIn>('/api/check-ins/interstitial')

      if (data.has_pending && data.check_in) {
        pendingCheckIn.value = data.check_in
        showInterstitial.value = true
        return true
      }

      return false
    } catch (error) {
      console.error('[useCheckIns] Failed to check for interstitial:', error)
      return false
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Dismiss the interstitial (without skipping)
   * Blocked while AI audio is playing
   */
  function dismissInterstitial() {
    if (isAudioPlaying.value) return
    showInterstitial.value = false
  }

  function setAudioPlaying(playing: boolean) {
    isAudioPlaying.value = playing
  }

  /**
   * Skip the current check-in
   */
  async function skipCheckIn(id: string) {
    try {
      await $fetch(`/api/check-ins/${id}/skip`, { method: 'POST' })
      showInterstitial.value = false
      pendingCheckIn.value = null
    } catch (error) {
      console.error('[useCheckIns] Failed to skip check-in:', error)
    }
  }

  /**
   * Navigate to respond to check-in
   * Passes prompt via query param to avoid redundant API fetch
   */
  function respondToCheckIn(id: string) {
    showInterstitial.value = false
    const prompt = pendingCheckIn.value?.prompt
    const illusionKey = pendingCheckIn.value?.illusion_key
    navigateTo(buildCheckInResponsePath(id, prompt, illusionKey))
  }

  /**
   * Complete check-in inline (from interstitial modal)
   * Called after voice recording is complete
   */
  function completeCheckInInline(_id: string, _conversationId: string | null) {
    showInterstitial.value = false
    pendingCheckIn.value = null
  }

  return {
    showInterstitial: readonly(showInterstitial),
    pendingCheckIn: readonly(pendingCheckIn),
    isLoading: readonly(isLoading),
    isAudioPlaying: readonly(isAudioPlaying),
    checkForInterstitial,
    dismissInterstitial,
    skipCheckIn,
    respondToCheckIn,
    completeCheckInInline,
    setAudioPlaying,
  }
}

export function buildCheckInResponsePath(
  id: string,
  prompt?: string | null,
  illusionKey?: string | null
): string {
  const params = new URLSearchParams()
  if (prompt) {
    params.set('prompt', prompt)
  }
  if (illusionKey) {
    params.set('illusionKey', illusionKey)
  }
  const query = params.toString()
  return query ? `/check-in/${id}?${query}` : `/check-in/${id}`
}

/**
 * Timezone Detection Composable
 * Detects and stores user's timezone on first visit
 */
export function useTimezoneDetection() {
  const hasDetected = ref(false)

  /**
   * Detect and store timezone
   * Call this on app mount or first authenticated visit
   */
  async function detectAndStoreTimezone(): Promise<string | null> {
    if (hasDetected.value) return null

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      if (timezone) {
        await $fetch('/api/user/timezone', {
          method: 'POST',
          body: { timezone },
        })
        hasDetected.value = true
        return timezone
      }

      return null
    } catch (error) {
      console.error('[useTimezoneDetection] Failed to detect/store timezone:', error)
      return null
    }
  }

  return {
    hasDetected: readonly(hasDetected),
    detectAndStoreTimezone,
  }
}
