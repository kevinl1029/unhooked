/**
 * GET /api/check-ins/pending
 * Get pending check-ins for the current user (filters out expired at display time)
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getPendingCheckIns } from '~/server/utils/scheduling/check-in-scheduler'
import { isCheckInExpired, getCheckInExpiration } from '~/server/utils/scheduling/check-in-expiration'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { checkIns, nextCheckIn } = await getPendingCheckIns(supabase, user.sub)

  // Filter out expired check-ins at display time
  const activeCheckIns = checkIns.filter(checkIn =>
    !isCheckInExpired(checkIn.scheduled_for, checkIn.timezone)
  )

  // Enrich with expiration info
  const enrichedCheckIns = activeCheckIns.map(checkIn => ({
    ...checkIn,
    expires_at: getCheckInExpiration(checkIn.scheduled_for, checkIn.timezone).toISOString(),
  }))

  // Find the next non-expired check-in
  const nextActive = enrichedCheckIns[0] || null

  return {
    check_ins: enrichedCheckIns,
    next_check_in: nextActive,
  }
})
