/**
 * POST /api/check-ins/resubscribe
 * Re-subscribe a user to check-in emails.
 * Accepts HMAC token: ?uid=X&sig=Y
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { validateUnsubscribeToken } from '~/server/utils/auth/hmac-tokens'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)
  const query = getQuery(event)
  const uid = String(query.uid || '')
  const sig = String(query.sig || '')

  if (!uid || !sig) {
    throw createError({ statusCode: 400, message: 'uid and sig are required' })
  }

  if (!validateUnsubscribeToken(uid, sig)) {
    throw createError({ statusCode: 400, message: 'Invalid token' })
  }

  await supabase
    .from('user_progress')
    .update({ email_unsubscribed_at: null })
    .eq('user_id', uid)

  return { success: true }
})
