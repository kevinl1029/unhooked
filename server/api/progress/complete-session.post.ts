import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { scheduleCheckIns } from '~/server/utils/scheduling/check-in-scheduler'

// Map myth numbers to myth keys
const MYTH_KEYS: Record<number, string> = {
  1: 'stress_relief',
  2: 'pleasure',
  3: 'willpower',
  4: 'focus',
  5: 'identity',
}

interface CompleteSessionBody {
  conversationId: string
  mythNumber: number
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<CompleteSessionBody>(event)

  // Validate required fields
  if (!body.conversationId) {
    throw createError({ statusCode: 400, message: 'conversationId is required' })
  }
  if (!body.mythNumber || body.mythNumber < 1 || body.mythNumber > 5) {
    throw createError({ statusCode: 400, message: 'mythNumber must be between 1 and 5' })
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

  // Add mythNumber to myths_completed (deduplicated)
  const mythsCompleted = currentProgress.myths_completed || []
  const updatedMythsCompleted = Array.from(new Set([...mythsCompleted, body.mythNumber]))

  // Calculate next myth
  const mythOrder = currentProgress.myth_order || [1, 2, 3, 4, 5]
  const nextMyth = mythOrder.find(m => !updatedMythsCompleted.includes(m)) || null

  // Check if program is complete
  const isComplete = updatedMythsCompleted.length >= 5

  // Update progress
  const { data: updatedProgress, error: updateError } = await supabase
    .from('user_progress')
    .update({
      current_myth: nextMyth || currentProgress.current_myth,
      myths_completed: updatedMythsCompleted,
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
    const mythKey = MYTH_KEYS[body.mythNumber]

    scheduleCheckIns({
      userId: user.sub,
      timezone,
      trigger: 'session_complete',
      sessionId: body.conversationId,
      mythKey,
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
    nextMyth,
    isComplete
  }
})
