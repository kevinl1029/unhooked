/**
 * Composable for managing Screen Wake Lock API
 * Prevents the device screen from dimming or locking during active sessions
 *
 * Browser support: Chrome 84+, Edge 84+, Safari 16.4+, Opera 70+
 * Not supported in Firefox as of 2024
 */
export const useWakeLock = () => {
  const isSupported = ref(false)
  const isActive = ref(false)
  const error = ref<string | null>(null)

  let wakeLock: WakeLockSentinel | null = null

  // Check if Wake Lock API is supported
  onMounted(() => {
    isSupported.value = 'wakeLock' in navigator
  })

  /**
   * Request a wake lock to keep the screen on
   * Returns true if successful, false otherwise
   */
  const request = async (): Promise<boolean> => {
    if (!isSupported.value) {
      console.log('[useWakeLock] Wake Lock API not supported')
      return false
    }

    // Already active
    if (wakeLock && !wakeLock.released) {
      return true
    }

    try {
      wakeLock = await navigator.wakeLock.request('screen')
      isActive.value = true
      error.value = null

      console.log('[useWakeLock] Wake lock acquired')

      // Handle when wake lock is released (e.g., tab becomes inactive)
      wakeLock.addEventListener('release', () => {
        console.log('[useWakeLock] Wake lock released')
        isActive.value = false
        wakeLock = null
      })

      return true
    } catch (e: any) {
      console.error('[useWakeLock] Failed to acquire wake lock:', e)
      error.value = e.message || 'Failed to acquire wake lock'
      isActive.value = false
      return false
    }
  }

  /**
   * Release the wake lock to allow screen dimming/locking
   */
  const release = async (): Promise<void> => {
    if (wakeLock && !wakeLock.released) {
      try {
        await wakeLock.release()
        console.log('[useWakeLock] Wake lock explicitly released')
      } catch (e) {
        console.error('[useWakeLock] Error releasing wake lock:', e)
      }
    }
    wakeLock = null
    isActive.value = false
  }

  /**
   * Re-acquire wake lock when page becomes visible again
   * This is needed because wake locks are automatically released when tab is hidden
   */
  const handleVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && isActive.value && (!wakeLock || wakeLock.released)) {
      console.log('[useWakeLock] Page visible again, re-acquiring wake lock')
      await request()
    }
  }

  // Set up visibility change listener for automatic re-acquisition
  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onUnmounted(() => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    // Release wake lock on cleanup
    if (wakeLock && !wakeLock.released) {
      wakeLock.release().catch(() => {})
    }
  })

  return {
    isSupported: readonly(isSupported),
    isActive: readonly(isActive),
    error: readonly(error),
    request,
    release
  }
}
