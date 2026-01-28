/**
 * Ceremony Preparation Endpoint
 * Gathers all data needed to generate the ceremony
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { selectCeremonyMoments } from '../../utils/llm/tasks/ceremony-select'
import type { CapturedMoment } from '../../utils/llm/task-types'

interface MomentsByType {
  origin_story: CapturedMoment[]
  rationalization: CapturedMoment[]
  insight: CapturedMoment[]
  emotional_breakthrough: CapturedMoment[]
  real_world_observation: CapturedMoment[]
  identity_statement: CapturedMoment[]
  commitment: CapturedMoment[]
  fear_resistance: CapturedMoment[]
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // 1. Check if user has completed all illusions (all 5 illusions at visceral layer)
  const { data: userStory } = await supabase
    .from('user_story')
    .select('*')
    .eq('user_id', user.sub)
    .single()

  if (!userStory) {
    throw createError({ statusCode: 404, message: 'User story not found' })
  }

  // Get ceremony completion status from user_progress (per ADR-004)
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('ceremony_completed_at')
    .eq('user_id', user.sub)
    .single()

  // Check illusion completion status
  const illusionKeys = ['stress_relief', 'pleasure', 'willpower', 'focus', 'identity']
  const completedIllusions: string[] = []

  for (const illusionKey of illusionKeys) {
    // An illusion is "complete" when all 3 layers are done
    // For now, we check if conviction exists (indicating at least one session)
    // In production, you'd track layer completion more precisely
    const conviction = userStory[`${illusionKey}_conviction`]
    if (conviction !== null && conviction !== undefined) {
      completedIllusions.push(illusionKey)
    }
  }

  // Check if ceremony already completed (from user_progress)
  const ceremonyCompleted = !!userProgress?.ceremony_completed_at

  // 2. Fetch all captured moments for this user
  const { data: allMomentsRaw } = await supabase
    .from('captured_moments')
    .select('*')
    .eq('user_id', user.sub)
    .order('created_at', { ascending: true })

  // Convert to CapturedMoment type
  const allMoments: CapturedMoment[] = (allMomentsRaw || []).map(m => ({
    id: m.id,
    userId: m.user_id,
    conversationId: m.conversation_id,
    messageId: m.message_id,
    momentType: m.moment_type,
    transcript: m.transcript,
    audioClipPath: m.audio_clip_path,
    audioDurationMs: m.audio_duration_ms,
    illusionKey: m.illusion_key,
    sessionType: m.session_type,
    illusionLayer: m.illusion_layer,
    confidenceScore: m.confidence_score,
    emotionalValence: m.emotional_valence,
    isUserHighlighted: m.is_user_highlighted,
    timesPlayedBack: m.times_played_back,
    lastUsedAt: m.last_used_at,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }))

  // 3. Group moments by type
  const momentsByType: MomentsByType = {
    origin_story: [],
    rationalization: [],
    insight: [],
    emotional_breakthrough: [],
    real_world_observation: [],
    identity_statement: [],
    commitment: [],
    fear_resistance: [],
  }

  for (const moment of allMoments) {
    const type = moment.momentType as keyof MomentsByType
    if (momentsByType[type]) {
      momentsByType[type].push(moment)
    }
  }

  // 4. Get AI-suggested moments for the journey
  let suggestedMoments: CapturedMoment[] = []
  if (allMoments.length >= 3) {
    const selection = await selectCeremonyMoments({
      allMoments,
      maxMoments: 12,
    })

    // Map selected IDs back to full moments
    const selectedIdSet = new Set(selection.selectedIds)
    suggestedMoments = allMoments.filter(m => selectedIdSet.has(m.id))
  }

  // 5. Determine readiness
  const ready = completedIllusions.length >= 5 && !ceremonyCompleted && allMoments.length >= 3

  return {
    ready,
    ceremony_completed: ceremonyCompleted,
    user_story: {
      id: userStory.id,
      origin_summary: userStory.origin_summary,
      primary_triggers: userStory.primary_triggers,
      personal_stakes: userStory.personal_stakes,
      // ceremony_completed_at comes from user_progress per ADR-004
      ceremony_completed_at: userProgress?.ceremony_completed_at || null,
    },
    moments_by_type: momentsByType,
    illusions_completed: completedIllusions,
    total_moments: allMoments.length,
    suggested_journey_moments: suggestedMoments,
  }
})
