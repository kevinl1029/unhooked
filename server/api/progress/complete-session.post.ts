import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { scheduleCheckIns } from '~/server/utils/scheduling/check-in-scheduler'
import { ILLUSION_KEYS, illusionKeyToNumber, type IllusionKey } from '~/server/utils/llm/task-types'

interface CompleteSessionBody {
  conversationId: string
  illusionKey?: string
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<CompleteSessionBody>(event)
  if (Object.prototype.hasOwnProperty.call(body, 'illusionNumber')) {
    throw createError({ statusCode: 400, message: 'illusionNumber is no longer supported. Send illusionKey instead.' })
  }
  const { illusionKey } = body

  // Validate required fields
  if (!body.conversationId) {
    throw createError({ statusCode: 400, message: 'conversationId is required' })
  }
  if (illusionKey && !ILLUSION_KEYS.includes(illusionKey as IllusionKey)) {
    throw createError({ statusCode: 400, message: 'Invalid illusionKey' })
  }

  const effectiveIllusionKey = (illusionKey || null) as IllusionKey | null
  if (!effectiveIllusionKey) {
    throw createError({ statusCode: 400, message: 'illusionKey is required' })
  }

  const effectiveIllusionNumber = illusionKeyToNumber(effectiveIllusionKey)
  if (!effectiveIllusionNumber) {
    throw createError({ statusCode: 400, message: 'Unable to resolve illusion number for provided illusionKey' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Mark conversation as completed
  const { error: convError } = await supabase
    .from('conversations')
    .update({
      session_completed: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', body.conversationId)
    .eq('user_id', user.sub)

  if (convError) {
    throw createError({ statusCode: 500, message: convError.message })
  }

  // Fetch current progress
  const { data: currentProgress, error: fetchError } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.sub)
    .single()

  if (fetchError) {
    throw createError({ statusCode: 500, message: fetchError.message })
  }

  // Add resolved illusion number to illusions_completed (deduplicated)
  const illusionsCompleted = currentProgress.illusions_completed || []
  const updatedIllusionsCompleted = Array.from(new Set([...illusionsCompleted, effectiveIllusionNumber]))

  // Calculate next illusion
  const illusionOrder = currentProgress.illusion_order || [1, 2, 3, 4, 5]
  const nextIllusion = illusionOrder.find(m => !updatedIllusionsCompleted.includes(m)) || null

  // Check if program is complete
  const isComplete = updatedIllusionsCompleted.length >= 5

  // Update progress
  const { data: updatedProgress, error: updateError } = await supabase
    .from('user_progress')
    .update({
      current_illusion: nextIllusion || currentProgress.current_illusion,
      illusions_completed: updatedIllusionsCompleted,
      program_status: isComplete ? 'completed' : 'in_progress',
      completed_at: isComplete ? new Date().toISOString() : null,
      last_session_at: new Date().toISOString(),
      total_sessions: (currentProgress.total_sessions || 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user.sub)
    .select()
    .single()

  if (updateError) {
    throw createError({ statusCode: 500, message: updateError.message })
  }

  // Schedule post-session check-in (non-blocking)
  // Only schedule if program is not complete (user still has sessions to do)
  if (!isComplete) {
    const timezone = currentProgress.timezone || 'America/New_York'

    scheduleCheckIns({
      userId: user.sub,
      timezone,
      trigger: 'session_complete',
      sessionId: body.conversationId,
      illusionKey: effectiveIllusionKey,
      sessionEndTime: new Date(),
      supabase,
    }).then((scheduled) => {
      if (scheduled.length > 0) {
        console.log(`[complete-session] Scheduled ${scheduled.length} check-in(s) for user ${user.sub}`)
      }
    }).catch((err) => {
      // Log but don't fail the request - check-in scheduling is not critical
      console.error('[complete-session] Failed to schedule check-ins:', err)
    })
  }

  return {
    progress: updatedProgress,
    nextIllusion,
    isComplete
  }
})
