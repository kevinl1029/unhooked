/**
 * GET /api/check-ins/interstitial
 * Check if user has pending check-in to show as modal overlay
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getPendingCheckIns } from '~/server/utils/scheduling/check-in-scheduler'
import { isCheckInExpired } from '~/server/utils/scheduling/check-in-expiration'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { checkIns } = await getPendingCheckIns(supabase, user.sub)

  console.log(`[interstitial] Found ${checkIns.length} pending check-ins for user ${user.sub}`)

  // Find the first non-expired check-in that's ready (scheduled time has passed)
  const now = new Date()
  const readyCheckIn = checkIns.find(checkIn => {
    const scheduledTime = new Date(checkIn.scheduled_for)
    const isReady = scheduledTime <= now
    const isExpired = isCheckInExpired(checkIn.scheduled_for, checkIn.timezone)
    return isReady && !isExpired
  })

  if (!readyCheckIn) {
    return {
      has_pending: false,
    }
  }

  return {
    has_pending: true,
    check_in: {
      id: readyCheckIn.id,
      prompt: readyCheckIn.prompt_template,
      type: readyCheckIn.check_in_type,
    },
  }
})
