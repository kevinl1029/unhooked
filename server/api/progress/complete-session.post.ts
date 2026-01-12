import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { scheduleCheckIns } from '~/server/utils/scheduling/check-in-scheduler'

// Map illusion numbers to illusion keys
const ILLUSION_KEYS: Record<number, string> = {
  1: 'stress_relief',
  2: 'pleasure',
  3: 'willpower',
  4: 'focus',
  5: 'identity',
}

interface CompleteSessionBody {
  conversationId: string
  illusionNumber?: number
  mythNumber?: number // Backward compatibility alias
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<CompleteSessionBody>(event)

  // Support both illusionNumber and mythNumber (backward compatibility)
  const illusionNumber = body.illusionNumber ?? body.mythNumber

  // Validate required fields
  if (!body.conversationId) {
    throw createError({ statusCode: 400, message: 'conversationId is required' })
  }
  if (!illusionNumber || illusionNumber < 1 || illusionNumber > 5) {
    throw createError({ statusCode: 400, message: 'illusionNumber must be between 1 and 5' })
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

  // Add illusionNumber to illusions_completed (deduplicated)
  const illusionsCompleted = currentProgress.myths_completed || []
  const updatedIllusionsCompleted = Array.from(new Set([...illusionsCompleted, illusionNumber]))

  // Calculate next illusion
  const illusionOrder = currentProgress.myth_order || [1, 2, 3, 4, 5]
  const nextIllusion = illusionOrder.find(m => !updatedIllusionsCompleted.includes(m)) || null

  // Check if program is complete
  const isComplete = updatedIllusionsCompleted.length >= 5

  // Update progress
  const { data: updatedProgress, error: updateError } = await supabase
    .from('user_progress')
    .update({
      current_myth: nextIllusion || currentProgress.current_myth,
      myths_completed: updatedIllusionsCompleted,
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
    const illusionKey = ILLUSION_KEYS[illusionNumber]

    scheduleCheckIns({
      userId: user.sub,
      timezone,
      trigger: 'session_complete',
      sessionId: body.conversationId,
      mythKey: illusionKey, // Keep mythKey param name for scheduler compatibility
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
    nextMyth: nextIllusion, // Backward compatibility alias
    isComplete
  }
})
