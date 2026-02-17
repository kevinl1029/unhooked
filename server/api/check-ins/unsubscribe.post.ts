/**
 * POST /api/check-ins/unsubscribe
 * RFC 8058 one-click unsubscribe endpoint.
 * Accepts magic_link_token as query param or in body (per RFC 8058 List-Unsubscribe=One-Click).
 */
import { serverSupabaseServiceRole } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole(event)
  const query = getQuery(event)
  const token = String(query.token || '')

  if (!token) {
    throw createError({ statusCode: 400, message: 'token is required' })
  }

  const { data: checkIn } = await supabase
    .from('check_in_schedule')
    .select('user_id')
    .eq('magic_link_token', token)
    .single()

  if (!checkIn) {
    throw createError({ statusCode: 400, message: 'Invalid token' })
  }

  await supabase
    .from('user_progress')
    .update({ email_unsubscribed_at: new Date().toISOString() })
    .eq('user_id', checkIn.user_id)

  return { ok: true }
})
