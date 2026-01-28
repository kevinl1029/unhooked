/**
 * Support Context Endpoint
 * Returns full user context for support/reinforcement conversations
 * Used by "I'm struggling" and "Need a boost" features
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { CapturedMoment } from '../../utils/llm/task-types'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // 1. Fetch user story
  const { data: userStory } = await supabase
    .from('user_story')
    .select('*')
    .eq('user_id', user.sub)
    .single()

  // 2. Fetch user intake
  const { data: intake } = await supabase
    .from('user_intake')
    .select('product_types, usage_frequency, years_using, previous_attempts, triggers, primary_reason')
    .eq('user_id', user.sub)
    .single()

  // 3. Fetch key insights (one per illusion)
  const keyInsightIds: string[] = []
  if (userStory) {
    const illusionKeys = ['stress_relief', 'pleasure', 'willpower', 'focus', 'identity']
    for (const illusionKey of illusionKeys) {
      const insightId = userStory[`${illusionKey}_key_insight_id`]
      if (insightId) {
        keyInsightIds.push(insightId)
      }
    }
  }

  let keyInsights: Array<{ illusionKey: string; transcript: string }> = []
  if (keyInsightIds.length > 0) {
    const { data: insights } = await supabase
      .from('captured_moments')
      .select('id, illusion_key, transcript')
      .in('id', keyInsightIds)

    if (insights) {
      keyInsights = insights.map(i => ({
        illusionKey: i.illusion_key,
        transcript: i.transcript,
      }))
    }
  }

  // 4. Fetch recent moments (last 10, for variety)
  const { data: recentMoments } = await supabase
    .from('captured_moments')
    .select('moment_type, transcript, illusion_key, created_at')
    .eq('user_id', user.sub)
    .order('created_at', { ascending: false })
    .limit(10)

  // 5. Fetch ceremony status from user_progress (per ADR-004)
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('ceremony_completed_at')
    .eq('user_id', user.sub)
    .single()

  // 6. Build context object
  const context = {
    // User background
    background: intake ? {
      productTypes: intake.product_types,
      usageFrequency: intake.usage_frequency,
      yearsUsing: intake.years_using,
      previousAttempts: intake.previous_attempts,
      triggers: intake.triggers,
      primaryReason: intake.primary_reason,
    } : null,

    // Origin story
    originSummary: userStory?.origin_summary || null,

    // Conviction levels
    convictions: userStory ? {
      stress_relief: userStory.stress_relief_conviction,
      pleasure: userStory.pleasure_conviction,
      willpower: userStory.willpower_conviction,
      focus: userStory.focus_conviction,
      identity: userStory.identity_conviction,
    } : null,

    // Key insights from each illusion
    keyInsights,

    // Recent moments for context
    recentMoments: recentMoments || [],

    // Personal stakes and triggers
    personalStakes: userStory?.personal_stakes || [],
    primaryTriggers: userStory?.primary_triggers || [],

    // Ceremony status (from user_progress per ADR-004)
    // Note: already_quit is not stored - it's a request parameter only
    ceremonyCompleted: !!userProgress?.ceremony_completed_at,
  }

  return context
})
