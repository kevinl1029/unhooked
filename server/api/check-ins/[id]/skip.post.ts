/**
 * POST /api/check-ins/:id/skip
 * Skip a check-in (just logged, no reschedule)
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { skipCheckIn } from '~/server/utils/scheduling/check-in-scheduler'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const checkInId = getRouterParam(event, 'id')
  if (!checkInId) {
    throw createError({ statusCode: 400, message: 'Check-in ID is required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const success = await skipCheckIn(supabase, checkInId, user.sub)

  if (!success) {
    throw createError({ statusCode: 500, message: 'Failed to skip check-in' })
  }

  return { success: true }
})
