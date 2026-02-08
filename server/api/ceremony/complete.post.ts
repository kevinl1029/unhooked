/**
 * Ceremony Complete Endpoint v2
 * Marks ceremony as complete and generates illusions cheat sheet artifact
 * Schedules post-ceremony follow-ups
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { generateIllusionsCheatSheet, saveCheatSheetArtifact } from '~/server/utils/ceremony/cheat-sheet-generator'

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
  const { conversation_id, final_recording_path } = body as {
    conversation_id: string
    final_recording_path?: string
  }

  if (!conversation_id) {
    throw createError({ statusCode: 400, message: 'conversation_id is required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // 1. Check if ceremony already completed via program_status
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('program_status, ceremony_completed_at, timezone')
    .eq('user_id', user.sub)
    .single()

  if (userProgress?.program_status === 'completed') {
    throw createError({ statusCode: 400, message: 'Ceremony already completed' })
  }

  const completedAt = new Date()
  const timezone = userProgress?.timezone || 'America/New_York'

  // 2. Mark ceremony as complete in user_progress - set program_status='completed'
  const { error: progressError } = await supabase
    .from('user_progress')
    .update({
      program_status: 'completed',
      ceremony_completed_at: completedAt.toISOString(),
      updated_at: completedAt.toISOString(),
    })
    .eq('user_id', user.sub)

  if (progressError) {
    console.error('[ceremony-complete] Failed to update user_progress:', progressError)
    throw createError({ statusCode: 500, message: 'Failed to complete ceremony' })
  }

  // 3. Update artifacts with completion timestamp
  await supabase
    .from('ceremony_artifacts')
    .update({
      ceremony_completed_at: completedAt.toISOString(),
      updated_at: completedAt.toISOString(),
    })
    .eq('user_id', user.sub)

  // 4. Generate illusions cheat sheet
  try {
    const cheatSheet = await generateIllusionsCheatSheet(supabase, user.sub)
    await saveCheatSheetArtifact(supabase, user.sub, cheatSheet)
  } catch (error) {
    // Log but don't block ceremony completion
    console.error('[ceremony-complete] Failed to generate cheat sheet:', error)
  }

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

  // 6. Get journey artifact status for response
  const { data: journeyArtifact } = await supabase
    .from('ceremony_artifacts')
    .select('generation_status')
    .eq('user_id', user.sub)
    .eq('artifact_type', 'reflective_journey')
    .single()

  const journeyStatus = journeyArtifact?.generation_status || 'pending'

  return {
    status: 'completed',
    ceremony_completed_at: completedAt.toISOString(),
    journey_artifact_status: journeyStatus as 'ready' | 'generating' | 'pending',
  }
})
