/**
 * Account Deletion Endpoint
 * Purges a user's account and associated data including pre-generated audio files
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { deleteUserOpeningAudio } from '~/server/utils/storage/delete-user-opening-audio'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const userId = user.sub

  // Clean up per-user opening audio from Storage (REQ-27)
  // Wrapped inside the utility — never blocks account deletion on failure
  await deleteUserOpeningAudio(supabase, userId)

  // Delete the user from Supabase Auth
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)

  if (deleteError) {
    console.error(`[account-purge] Failed to delete auth user ${userId}:`, deleteError)
    throw createError({ statusCode: 500, message: 'Failed to delete account' })
  }

  console.log(`[account-purge] Account deleted for user ${userId}`)

  return { deleted: true }
})
