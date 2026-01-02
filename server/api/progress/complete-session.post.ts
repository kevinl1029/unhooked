import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

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

  return {
    progress: updatedProgress,
    nextMyth,
    isComplete
  }
})
