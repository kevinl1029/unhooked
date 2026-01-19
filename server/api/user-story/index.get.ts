/**
 * GET /api/user-story
 * Get the user's narrative and belief state
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { ILLUSION_KEYS, type IllusionKey } from '~/server/utils/llm/task-types'

interface IllusionState {
  conviction: number
  key_insight: {
    id: string
    transcript: string
    moment_type: string
  } | null
  resistance_notes: string | null
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Fetch user story
  const { data: story, error } = await supabase
    .from('user_story')
    .select('*')
    .eq('user_id', user.sub)
    .single()

  if (error) {
    // PGRST116 = no rows returned (user story not created yet)
    if (error.code === 'PGRST116') {
      return null
    }
    throw createError({ statusCode: 500, message: error.message })
  }

  // Fetch key insights for each illusion if they exist
  const insightIds = [
    story.stress_relief_key_insight_id,
    story.pleasure_key_insight_id,
    story.willpower_key_insight_id,
    story.focus_key_insight_id,
    story.identity_key_insight_id,
  ].filter(Boolean)

  let insightsMap: Record<string, { id: string; transcript: string; moment_type: string }> = {}

  if (insightIds.length > 0) {
    const { data: insights } = await supabase
      .from('captured_moments')
      .select('id, transcript, moment_type')
      .in('id', insightIds)

    if (insights) {
      insightsMap = insights.reduce((acc, insight) => {
        acc[insight.id] = insight
        return acc
      }, {} as typeof insightsMap)
    }
  }

  // Build illusion states
  const illusionStates: Record<IllusionKey, IllusionState> = {} as Record<IllusionKey, IllusionState>

  for (const illusionKey of ILLUSION_KEYS) {
    const convictionKey = `${illusionKey}_conviction` as keyof typeof story
    const insightKey = `${illusionKey}_key_insight_id` as keyof typeof story
    const resistanceKey = `${illusionKey}_resistance_notes` as keyof typeof story

    const insightId = story[insightKey] as string | null

    illusionStates[illusionKey] = {
      conviction: (story[convictionKey] as number) || 0,
      key_insight: insightId ? insightsMap[insightId] || null : null,
      resistance_notes: (story[resistanceKey] as string) || null,
    }
  }

  return {
    origin_summary: story.origin_summary,
    primary_triggers: story.primary_triggers || [],
    personal_stakes: story.personal_stakes || [],
    illusion_states: illusionStates,
    overall_readiness: story.overall_readiness || 0,
  }
})
