/**
 * Utility: Delete per-user opening audio files from Storage
 * Called during account purge/deletion to remove orphaned audio data (REQ-27)
 * L1 static audio is NOT deleted — it is not user-specific
 */

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Delete all pre-generated opening audio files for a user from the 'opening-audio' Storage bucket.
 * Fails silently (logs + continues) so account deletion is never blocked by Storage errors.
 */
export async function deleteUserOpeningAudio(supabase: SupabaseClient, userId: string): Promise<void> {
  try {
    const prefix = `l2l3/${userId}`

    const { data: audioFiles, error: listError } = await supabase.storage
      .from('opening-audio')
      .list(prefix)

    if (listError) {
      console.error(`[account-purge] Failed to list opening audio files for user ${userId}:`, listError)
      return
    }

    if (!audioFiles || audioFiles.length === 0) {
      return
    }

    const pathsToDelete = audioFiles.map(f => `${prefix}/${f.name}`)
    const { error: removeError } = await supabase.storage
      .from('opening-audio')
      .remove(pathsToDelete)

    if (removeError) {
      console.error(`[account-purge] Failed to delete opening audio files for user ${userId}:`, removeError)
      return
    }

    console.log(`[account-purge] Deleted ${pathsToDelete.length} opening audio file(s) for user ${userId}`)
  } catch (err) {
    console.error(`[account-purge] Unexpected error deleting opening audio for user ${userId}:`, err)
  }
}
