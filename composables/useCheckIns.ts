/**
 * Check-In Composable
 * Manages check-in state, interstitials, and timezone detection
 */

interface PendingCheckIn {
  id: string
  prompt: string
  type: string
}

interface InterstitialCheckIn {
  has_pending: boolean
  check_in?: PendingCheckIn
}

export function useCheckIns() {
  const showInterstitial = ref(false)
  const pendingCheckIn = ref<PendingCheckIn | null>(null)
  const isLoading = ref(false)

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
   */
  function dismissInterstitial() {
    showInterstitial.value = false
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
   */
  function respondToCheckIn(id: string) {
    showInterstitial.value = false
    navigateTo(`/check-in/${id}`)
  }

  return {
    showInterstitial: readonly(showInterstitial),
    pendingCheckIn: readonly(pendingCheckIn),
    isLoading: readonly(isLoading),
    checkForInterstitial,
    dismissInterstitial,
    skipCheckIn,
    respondToCheckIn,
  }
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
