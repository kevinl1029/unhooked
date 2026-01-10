/**
 * User Status Endpoint
 * Returns comprehensive user status for dashboard rendering
 * Includes progress, ceremony status, artifacts, and pending follow-ups
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Fetch user progress
  const { data: progress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.sub)
    .single()

  // Fetch user story for ceremony status
  const { data: userStory } = await supabase
    .from('user_story')
    .select('ceremony_completed_at, already_quit, origin_summary')
    .eq('user_id', user.sub)
    .single()

  // Determine user phase
  let phase: 'not_started' | 'in_progress' | 'ceremony_ready' | 'post_ceremony'

  if (!progress) {
    phase = 'not_started'
  } else if (userStory?.ceremony_completed_at) {
    phase = 'post_ceremony'
  } else if (progress.program_status === 'completed') {
    phase = 'ceremony_ready'
  } else {
    phase = 'in_progress'
  }

  // For post-ceremony users, fetch artifacts and follow-ups
  let artifacts = null
  let pendingFollowUps = null

  if (phase === 'post_ceremony') {
    // Fetch artifacts
    const { data: artifactsData } = await supabase
      .from('ceremony_artifacts')
      .select('id, artifact_type, audio_path, audio_duration_ms, created_at')
      .eq('user_id', user.sub)

    if (artifactsData) {
      artifacts = {
        reflective_journey: artifactsData.find(a => a.artifact_type === 'reflective_journey'),
        final_recording: artifactsData.find(a => a.artifact_type === 'final_recording'),
        myths_cheat_sheet: artifactsData.find(a => a.artifact_type === 'myths_cheat_sheet'),
      }
    }

    // Fetch pending follow-ups
    const { data: followUps } = await supabase
      .from('follow_up_schedule')
      .select('id, milestone_type, scheduled_for, status')
      .eq('user_id', user.sub)
      .in('status', ['scheduled', 'sent'])
      .order('scheduled_for', { ascending: true })
      .limit(1)

    pendingFollowUps = followUps
  }

  // For in-progress users, get next session info
  let nextSession = null
  if (phase === 'in_progress' && progress) {
    const mythOrder = progress.myth_order || [1, 2, 3, 4, 5]
    const mythsCompleted = progress.myths_completed || []
    const nextMyth = mythOrder.find((m: number) => !mythsCompleted.includes(m))

    if (nextMyth) {
      nextSession = {
        mythNumber: nextMyth,
        // In production, we'd track layer progress too
        // For MVP, we just show the myth
      }
    }
  }

  return {
    phase,
    progress: progress ? {
      program_status: progress.program_status,
      current_myth: progress.current_myth,
      myths_completed: progress.myths_completed,
      total_sessions: progress.total_sessions,
      started_at: progress.started_at,
    } : null,
    ceremony: userStory ? {
      completed_at: userStory.ceremony_completed_at,
      already_quit: userStory.already_quit,
    } : null,
    artifacts,
    pending_follow_ups: pendingFollowUps,
    next_session: nextSession,
  }
})
