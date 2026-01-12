/**
 * Session Resume Endpoint
 * Checks for abandoned sessions and returns context for resuming
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface PriorMoment {
  transcript: string
  moment_type: string
}

interface ResumeResponse {
  should_restart: boolean
  illusion_key?: string
  illusion_layer?: string
  prior_moments?: PriorMoment[]
  abandoned_conversation_id?: string
}

// Sessions older than this are considered stale and won't be resumed
const ABANDONMENT_THRESHOLD_HOURS = 24

export default defineEventHandler(async (event): Promise<ResumeResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Check for incomplete core conversation within threshold
  const thresholdDate = new Date()
  thresholdDate.setHours(thresholdDate.getHours() - ABANDONMENT_THRESHOLD_HOURS)

  const { data: incomplete } = await supabase
    .from('conversations')
    .select('id, illusion_key, illusion_layer, created_at')
    .eq('user_id', user.sub)
    .eq('session_type', 'core')
    .is('completed_at', null)
    .gte('created_at', thresholdDate.toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (incomplete && incomplete.illusion_key) {
    // Get any moments captured before abandonment
    const { data: capturedMoments } = await supabase
      .from('captured_moments')
      .select('transcript, moment_type')
      .eq('conversation_id', incomplete.id)

    // Mark the old conversation as abandoned (so we don't keep finding it)
    await supabase
      .from('conversations')
      .update({
        completed_at: new Date().toISOString(),
        // Could add an 'abandoned' flag if needed for analytics
      })
      .eq('id', incomplete.id)

    // Return context for new session (don't resume old conversation)
    return {
      should_restart: true,
      illusion_key: incomplete.illusion_key,
      illusion_layer: incomplete.illusion_layer || 'intellectual',
      prior_moments: capturedMoments || [],
      abandoned_conversation_id: incomplete.id,
    }
  }

  return { should_restart: false }
})
