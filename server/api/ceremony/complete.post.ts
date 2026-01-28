/**
 * Ceremony Complete Endpoint
 * Marks ceremony as complete and generates all artifacts
 * Schedules post-ceremony follow-ups
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Follow-up milestone days from ceremony completion
const FOLLOW_UP_MILESTONES = [
  { type: 'day_3', days: 3 },
  { type: 'day_7', days: 7 },
  { type: 'day_14', days: 14 },
  { type: 'day_30', days: 30 },
  { type: 'day_90', days: 90 },
  { type: 'day_180', days: 180 },
  { type: 'day_365', days: 365 },
]

interface FollowUp {
  milestone_type: string
  scheduled_for: string
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { already_quit } = body as {
    already_quit?: boolean
  }

  const supabase = serverSupabaseServiceRole(event)

  // 1. Check if ceremony already completed (use user_progress per ADR-004)
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('ceremony_completed_at, timezone')
    .eq('user_id', user.sub)
    .single()

  if (userProgress?.ceremony_completed_at) {
    throw createError({ statusCode: 400, message: 'Ceremony already completed' })
  }

  // 2. Verify required artifacts exist
  const { data: artifacts } = await supabase
    .from('ceremony_artifacts')
    .select('artifact_type')
    .eq('user_id', user.sub)

  const artifactTypes = new Set((artifacts || []).map(a => a.artifact_type))

  if (!artifactTypes.has('reflective_journey')) {
    throw createError({ statusCode: 400, message: 'Journey not generated' })
  }

  if (!artifactTypes.has('final_recording')) {
    throw createError({ statusCode: 400, message: 'Final recording not saved' })
  }

  const completedAt = new Date()
  const timezone = userProgress?.timezone || 'America/New_York'

  // 3. Mark ceremony as complete in user_progress (per ADR-004)
  // Note: already_quit is a request parameter only, not stored in database
  const { error: progressError } = await supabase
    .from('user_progress')
    .update({
      ceremony_completed_at: completedAt.toISOString(),
      ceremony_skipped_final_dose: already_quit || false,
      updated_at: completedAt.toISOString(),
    })
    .eq('user_id', user.sub)

  if (progressError) {
    console.error('[ceremony-complete] Failed to update user_progress:', progressError)
    throw createError({ statusCode: 500, message: 'Failed to complete ceremony' })
  }

  // 4. Update artifacts with completion timestamp
  await supabase
    .from('ceremony_artifacts')
    .update({
      ceremony_completed_at: completedAt.toISOString(),
      updated_at: completedAt.toISOString(),
    })
    .eq('user_id', user.sub)

  // 5. Schedule follow-up check-ins
  const followUps: FollowUp[] = []
  const followUpInserts = FOLLOW_UP_MILESTONES.map(milestone => {
    const scheduledDate = new Date(completedAt)
    scheduledDate.setDate(scheduledDate.getDate() + milestone.days)

    followUps.push({
      milestone_type: milestone.type,
      scheduled_for: scheduledDate.toISOString(),
    })

    return {
      user_id: user.sub,
      milestone_type: milestone.type,
      scheduled_for: scheduledDate.toISOString(),
      timezone,
      status: 'scheduled',
    }
  })

  const { error: followUpError } = await supabase
    .from('follow_up_schedule')
    .insert(followUpInserts)

  if (followUpError) {
    // Log but don't fail - follow-ups are important but not critical
    console.error('[ceremony-complete] Failed to schedule follow-ups:', followUpError)
  }

  // 6. Fetch final artifacts for response
  const { data: finalArtifacts } = await supabase
    .from('ceremony_artifacts')
    .select('*')
    .eq('user_id', user.sub)

  const artifactsMap: Record<string, typeof finalArtifacts[0]> = {}
  for (const artifact of finalArtifacts || []) {
    artifactsMap[artifact.artifact_type] = artifact
  }

  return {
    ceremony_completed_at: completedAt.toISOString(),
    already_quit: already_quit || false,
    artifacts: {
      reflective_journey: artifactsMap['reflective_journey'] || null,
      illusions_cheat_sheet: artifactsMap['illusions_cheat_sheet'] || null,
      final_recording: artifactsMap['final_recording'] || null,
    },
    follow_ups_scheduled: followUps,
  }
})
