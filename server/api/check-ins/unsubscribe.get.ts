/**
 * GET /api/check-ins/unsubscribe
 * Unsubscribe a user from check-in emails.
 * Accepts either:
 *   - HMAC path: ?uid=X&sig=Y
 *   - Magic link token path: ?token=X
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import { validateUnsubscribeToken, generateUnsubscribeToken } from '~/server/utils/auth/hmac-tokens'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)
  const query = getQuery(event)
  const appUrl = useRuntimeConfig().public.appUrl || 'https://getunhooked.app'

  // HMAC path: uid + sig
  if (query.uid && query.sig) {
    const uid = String(query.uid)
    const sig = String(query.sig)

    if (!validateUnsubscribeToken(uid, sig)) {
      return sendRedirect(event, `${appUrl}/unsubscribe?status=error`, 302)
    }

    await supabase
      .from('user_progress')
      .update({ email_unsubscribed_at: new Date().toISOString() })
      .eq('user_id', uid)

    return sendRedirect(event, `${appUrl}/unsubscribe?status=success&uid=${uid}&sig=${sig}`, 302)
  }

  // Magic link token path: token
  if (query.token) {
    const token = String(query.token)

    const { data: checkIn } = await supabase
      .from('check_in_schedule')
      .select('user_id')
      .eq('magic_link_token', token)
      .single()

    if (!checkIn) {
      return sendRedirect(event, `${appUrl}/unsubscribe?status=error`, 302)
    }

    const userId = checkIn.user_id

    await supabase
      .from('user_progress')
      .update({ email_unsubscribed_at: new Date().toISOString() })
      .eq('user_id', userId)

    const hmacSig = generateUnsubscribeToken(userId)
    return sendRedirect(event, `${appUrl}/unsubscribe?status=success&uid=${userId}&sig=${hmacSig}`, 302)
  }

  return sendRedirect(event, `${appUrl}/unsubscribe?status=error`, 302)
})
