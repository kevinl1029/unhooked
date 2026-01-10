/**
 * POST /api/check-ins/:id/complete
 * Mark check-in complete and capture response
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { completeCheckIn } from '~/server/utils/scheduling/check-in-scheduler'

interface CompleteCheckInBody {
  response_conversation_id: string
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const checkInId = getRouterParam(event, 'id')
  if (!checkInId) {
    throw createError({ statusCode: 400, message: 'Check-in ID is required' })
  }

  const body = await readBody<CompleteCheckInBody>(event)
  if (!body.response_conversation_id) {
    throw createError({ statusCode: 400, message: 'response_conversation_id is required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const success = await completeCheckIn(
    supabase,
    checkInId,
    user.sub,
    body.response_conversation_id
  )

  if (!success) {
    throw createError({ statusCode: 500, message: 'Failed to complete check-in' })
  }

  return { success: true }
})
