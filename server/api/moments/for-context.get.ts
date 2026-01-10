/**
 * GET /api/moments/for-context
 * Get moments optimized for prompt injection
 * Returns simple selection: 5-8 moments, 1 per type from current myth
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { CapturedMoment } from '~/server/utils/llm/task-types'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const mythKey = query.myth_key as string | undefined
  const sessionType = query.session_type as string | undefined

  if (!mythKey) {
    throw createError({ statusCode: 400, message: 'myth_key is required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Fetch moments for the current myth, ordered by recency
  const { data: moments, error } = await supabase
    .from('captured_moments')
    .select('*')
    .eq('user_id', user.sub)
    .eq('myth_key', mythKey)
    .order('created_at', { ascending: false })
    .limit(50) // Fetch enough to select 1 per type

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  // Group by moment type and take the most recent of each type
  const momentsByType: Record<string, CapturedMoment | null> = {
    origin_story: null,
    rationalization: null,
    insight: null,
    emotional_breakthrough: null,
    real_world_observation: null,
    identity_statement: null,
    commitment: null,
    fear_resistance: null,
  }

  for (const moment of moments || []) {
    const type = moment.moment_type
    if (momentsByType[type] === null) {
      momentsByType[type] = {
        id: moment.id,
        userId: moment.user_id,
        conversationId: moment.conversation_id,
        messageId: moment.message_id,
        momentType: moment.moment_type,
        transcript: moment.transcript,
        audioClipPath: moment.audio_clip_path,
        audioDurationMs: moment.audio_duration_ms,
        mythKey: moment.myth_key,
        sessionType: moment.session_type,
        mythLayer: moment.myth_layer,
        confidenceScore: moment.confidence_score,
        emotionalValence: moment.emotional_valence,
        isUserHighlighted: moment.is_user_highlighted,
        timesPlayedBack: moment.times_played_back,
        lastUsedAt: moment.last_used_at,
        createdAt: moment.created_at,
        updatedAt: moment.updated_at,
      }
    }
  }

  // Build the response structure
  const originFragments = momentsByType.origin_story
    ? [momentsByType.origin_story.transcript]
    : []

  const relevantInsights = [
    momentsByType.insight,
    momentsByType.emotional_breakthrough,
  ].filter((m): m is CapturedMoment => m !== null)

  const recentObservations = [
    momentsByType.real_world_observation,
  ].filter((m): m is CapturedMoment => m !== null)

  const activeFears = [
    momentsByType.fear_resistance,
  ].filter((m): m is CapturedMoment => m !== null)

  return {
    origin_fragments: originFragments,
    relevant_insights: relevantInsights,
    recent_observations: recentObservations,
    active_fears: activeFears,
  }
})
