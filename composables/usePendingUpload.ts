/**
 * usePendingUpload
 * Handles retry of failed ceremony recording uploads from localStorage
 */

interface PendingUpload {
  userId: string
  blobDataUrl: string
  timestamp: string
  retryCount: number
}

const STORAGE_KEY = 'unhooked:pending-ceremony-upload'
const MAX_RETRIES = 10

export function usePendingUpload() {
  /**
   * Attempts to retry pending upload from localStorage
   * Returns true if retry was attempted (success or failure), false if no pending upload
   */
  async function retryPendingUpload(): Promise<boolean> {
    // Only run in browser
    if (typeof window === 'undefined') return false

    try {
      // Check for pending upload
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return false

      const pending: PendingUpload = JSON.parse(stored)

      // Give up after max retries (silent graceful degradation)
      if (pending.retryCount >= MAX_RETRIES) {
        console.log(`[usePendingUpload] Max retries (${MAX_RETRIES}) reached, removing pending upload`)
        localStorage.removeItem(STORAGE_KEY)
        return false
      }

      console.log(`[usePendingUpload] Retrying upload (attempt ${pending.retryCount + 1}/${MAX_RETRIES})`)

      // Convert base64 data URL back to Blob
      const response = await fetch(pending.blobDataUrl)
      const blob = await response.blob()

      // Create FormData for upload
      const formData = new FormData()
      formData.append('audio', blob, 'final-recording.webm')

      // Attempt upload
      try {
        await $fetch('/api/ceremony/save-final-recording', {
          method: 'POST',
          body: formData,
        })

        // Success - remove from localStorage
        console.log('[usePendingUpload] Upload successful, removing from localStorage')
        localStorage.removeItem(STORAGE_KEY)
        return true
      } catch (uploadError) {
        // Upload failed - increment retry count and save back
        console.log('[usePendingUpload] Upload failed, incrementing retry count')
        const updated: PendingUpload = {
          ...pending,
          retryCount: pending.retryCount + 1,
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        return true
      }
    } catch (err) {
      console.error('[usePendingUpload] Error processing pending upload:', err)
      return false
    }
  }

  return {
    retryPendingUpload,
  }
}
