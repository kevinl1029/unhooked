/**
 * Get Follow-up by ID
 * Returns a specific follow-up check-in
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const followUpId = getRouterParam(event, 'id')
  if (!followUpId) {
    throw createError({ statusCode: 400, message: 'Follow-up ID required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: followUp, error } = await supabase
    .from('follow_up_schedule')
    .select('id, milestone_type, scheduled_for, status')
    .eq('id', followUpId)
    .eq('user_id', user.sub)
    .single()

  if (error || !followUp) {
    throw createError({ statusCode: 404, message: 'Follow-up not found' })
  }

  return followUp
})
