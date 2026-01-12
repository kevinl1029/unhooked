/**
 * POST /api/check-ins/schedule
 * Schedule check-ins for a user
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { scheduleCheckIns } from '~/server/utils/scheduling/check-in-scheduler'

interface ScheduleCheckInsBody {
  trigger: 'session_complete' | 'program_start' | 'daily_refresh'
  session_id?: string
  illusion_key?: string
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<ScheduleCheckInsBody>(event)

  if (!body.trigger) {
    throw createError({ statusCode: 400, message: 'trigger is required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Get user's timezone from user_progress
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('timezone')
    .eq('user_id', user.sub)
    .single()

  const timezone = userProgress?.timezone || 'America/New_York'

  // Schedule check-ins
  const scheduled = await scheduleCheckIns({
    userId: user.sub,
    timezone,
    trigger: body.trigger,
    sessionId: body.session_id,
    illusionKey: body.illusion_key,
    sessionEndTime: body.trigger === 'session_complete' ? new Date() : undefined,
    supabase,
  })

  return {
    scheduled: scheduled.map(c => ({
      id: c.id,
      type: c.type,
      scheduled_for: c.scheduledFor.toISOString(),
    })),
  }
})
