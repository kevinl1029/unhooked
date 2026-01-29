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

  // Fetch user story for origin summary (ceremony status comes from user_progress per ADR-004)
  const { data: userStory } = await supabase
    .from('user_story')
    .select('origin_summary')
    .eq('user_id', user.sub)
    .single()

  // Determine user phase (ceremony_completed_at is in user_progress per ADR-004)
  let phase: 'not_started' | 'in_progress' | 'ceremony_ready' | 'post_ceremony'

  if (!progress) {
    phase = 'not_started'
  } else if (progress.ceremony_completed_at) {
    phase = 'post_ceremony'
  } else if (progress.program_status === 'completed') {
    phase = 'ceremony_ready'
  } else {
    phase = 'in_progress'
  }

  // For post-ceremony users, fetch artifacts and follow-ups
  let artifacts = null
  let pendingFollowUps = null
  let illusionLastSessions: Record<string, string> | null = null

  // For post-ceremony or ceremony-ready users, fetch last session dates per illusion
  if (phase === 'post_ceremony' || phase === 'ceremony_ready') {
    const { data: lastSessions } = await supabase
      .from('conversations')
      .select('illusion_key, completed_at')
      .eq('user_id', user.sub)
      .in('session_type', ['core', 'reinforcement'])
      .not('illusion_key', 'is', null)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })

    if (lastSessions && lastSessions.length > 0) {
      illusionLastSessions = {}
      for (const session of lastSessions) {
        if (session.illusion_key && !illusionLastSessions[session.illusion_key]) {
          illusionLastSessions[session.illusion_key] = session.completed_at
        }
      }
    }
  }

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
        illusions_cheat_sheet: artifactsData.find(a => a.artifact_type === 'illusions_cheat_sheet'),
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
    const illusionOrder = progress.illusion_order || [1, 2, 3, 4, 5]
    const illusionsCompleted = progress.illusions_completed || []
    const nextIllusion = illusionOrder.find((m: number) => !illusionsCompleted.includes(m))

    if (nextIllusion) {
      nextSession = {
        illusionNumber: nextIllusion,
        // In production, we'd track layer progress too
        // For MVP, we just show the illusion
      }
    }
  }

  return {
    phase,
    progress: progress ? {
      program_status: progress.program_status,
      current_illusion: progress.current_illusion,
      illusions_completed: progress.illusions_completed || [],
      illusion_order: progress.illusion_order || [1, 2, 3, 4, 5],
      total_sessions: progress.total_sessions,
      started_at: progress.started_at,
    } : null,
    // ceremony_completed_at comes from user_progress per ADR-004
    // already_quit is not stored - it's a request parameter only
    ceremony: progress?.ceremony_completed_at ? {
      completed_at: progress.ceremony_completed_at,
    } : null,
    artifacts,
    pending_follow_ups: pendingFollowUps,
    next_session: nextSession,
    illusion_last_sessions: illusionLastSessions,
  }
})
