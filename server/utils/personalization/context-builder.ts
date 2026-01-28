/**
 * Context Builder
 * Builds personalization context for chat sessions
 * Context is built fresh for each request and injected transiently (not stored)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IllusionKey, IllusionLayer, SessionType, MomentType } from '../llm/task-types'

// Types for personalization context
// Note: Named IntakeUserContext to distinguish from UserContext in prompts/base-system.ts
export interface IntakeUserContext {
  productsUsed: string[]
  usageFrequency: string
  yearsUsing: number | null
  triggers: string[]
  previousAttempts: number
}

export interface StoryContext {
  originSummary: string | null
  personalStakes: string[]
}

export interface BeliefContext {
  currentConviction: number
  previousInsights: string[]
  resistancePoints: string | null
}

export interface MomentContext {
  recentObservations: string[]
  keyRationalizations: string[]
  breakthroughQuotes: string[]
  identityStatements: string[]
  commitments: string[]
}

export interface PersonalizationContext {
  userContext: IntakeUserContext
  storyContext: StoryContext
  beliefContext: BeliefContext
  momentContext: MomentContext
}

/**
 * Get user intake data
 */
async function getUserIntake(
  supabase: SupabaseClient,
  userId: string
): Promise<{
  product_types: string[]
  usage_frequency: string
  years_using: number | null
  triggers: string[] | null
  previous_attempts: number
} | null> {
  const { data } = await supabase
    .from('user_intake')
    .select('product_types, usage_frequency, years_using, triggers, previous_attempts')
    .eq('user_id', userId)
    .single()

  return data
}

/**
 * Get user story
 */
async function getUserStory(
  supabase: SupabaseClient,
  userId: string
): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from('user_story')
    .select('*')
    .eq('user_id', userId)
    .single()

  return data
}

/**
 * Get moments by illusion with 1 per type limit
 */
async function getMomentsByIllusion(
  supabase: SupabaseClient,
  userId: string,
  illusionKey: string,
  limit: number = 8
): Promise<Array<{
  id: string
  moment_type: MomentType
  transcript: string
  illusion_layer: IllusionLayer | null
  confidence_score: number
  created_at: string
}>> {
  const { data } = await supabase
    .from('captured_moments')
    .select('id, moment_type, transcript, illusion_layer, confidence_score, created_at')
    .eq('user_id', userId)
    .eq('illusion_key', illusionKey)
    .order('confidence_score', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit * 2) // Fetch more to select 1 per type

  if (!data) return []

  // Group by moment_type and take the best one per type
  const byType = new Map<string, typeof data[0]>()
  for (const moment of data) {
    if (!byType.has(moment.moment_type)) {
      byType.set(moment.moment_type, moment)
    }
  }

  return Array.from(byType.values()).slice(0, limit)
}

/**
 * Build session context for personalization
 * MVP uses simple selection: 5-8 moments total, 1 per type from current illusion only
 * Reinforcement sessions return overlay prompts instead of PersonalizationContext
 */
export async function buildSessionContext(
  supabase: SupabaseClient,
  userId: string,
  illusionKey: string,
  sessionType: SessionType,
  sessionData?: {
    anchorMoment?: { id: string; transcript: string }
    allConvictionScores?: Record<string, number>
    recentMomentsAllIllusions?: Array<{ illusion_key: string; transcript: string }>
  }
): Promise<PersonalizationContext | string> {
  // Handle reinforcement sessions
  if (sessionType === 'reinforcement') {
    // Import here to avoid circular dependencies
    const { buildReinforcementPrompt, buildBoostPrompt } = await import('../prompts/reinforcement-prompts')

    const story = await getUserStory(supabase, userId)

    // Generic reinforcement (no specific illusion) - use boost prompt
    if (!illusionKey) {
      // Generic reinforcement session - fetch all conviction scores and moments if not provided
      let allConvictionScores = sessionData?.allConvictionScores
      let recentMomentsAllIllusions = sessionData?.recentMomentsAllIllusions

      if (!allConvictionScores || Object.keys(allConvictionScores).length === 0) {
        // Fetch conviction scores from user_story
        allConvictionScores = {
          stress_relief: (story?.stress_relief_conviction as number) || 0,
          pleasure: (story?.pleasure_conviction as number) || 0,
          willpower: (story?.willpower_conviction as number) || 0,
          focus: (story?.focus_conviction as number) || 0,
          identity: (story?.identity_conviction as number) || 0,
        }
      }

      if (!recentMomentsAllIllusions || recentMomentsAllIllusions.length === 0) {
        // Fetch top 3 moments per illusion
        const illusionKeys = ['stress_relief', 'pleasure', 'willpower', 'focus', 'identity']
        const allMoments: Array<{ illusion_key: string; transcript: string }> = []

        for (const key of illusionKeys) {
          const moments = await getMomentsByIllusion(supabase, userId, key, 3)
          for (const m of moments) {
            allMoments.push({ illusion_key: key, transcript: m.transcript })
          }
        }
        recentMomentsAllIllusions = allMoments
      }

      return buildBoostPrompt({
        allConvictionScores,
        recentMomentsAllIllusions,
      })
    } else {
      // Illusion-specific reinforcement session
      const previousConviction = (story?.[`${illusionKey}_conviction`] as number) || 0

      // Get captured moments for this illusion
      const illusionMoments = await getMomentsByIllusion(supabase, userId, illusionKey, 3)
      const capturedMoments = illusionMoments.map(m => ({ transcript: m.transcript }))

      // Map illusion key to display name
      const illusionNames: Record<string, string> = {
        stress_relief: 'Stress Relief',
        pleasure: 'Pleasure',
        willpower: 'Willpower',
        focus: 'Focus',
        identity: 'Identity',
      }

      return buildReinforcementPrompt({
        illusionName: illusionNames[illusionKey] || illusionKey,
        previousConviction,
        capturedMoments,
        anchorMoment: sessionData?.anchorMoment,
      })
    }
  }

  // Core session handling (existing logic)
  const [intake, story, illusionMoments] = await Promise.all([
    getUserIntake(supabase, userId),
    getUserStory(supabase, userId),
    getMomentsByIllusion(supabase, userId, illusionKey, 8),
  ])

  // Helper to get moments by type
  const getMomentsByType = (type: MomentType): string[] =>
    illusionMoments
      .filter(m => m.moment_type === type)
      .slice(0, 1)
      .map(m => m.transcript)

  return {
    userContext: {
      productsUsed: intake?.product_types || [],
      usageFrequency: intake?.usage_frequency || 'unknown',
      yearsUsing: intake?.years_using || null,
      triggers: (story?.primary_triggers as string[]) || intake?.triggers || [],
      previousAttempts: intake?.previous_attempts || 0,
    },

    storyContext: {
      originSummary: (story?.origin_summary as string) || null,
      personalStakes: (story?.personal_stakes as string[]) || [],
    },

    beliefContext: {
      currentConviction: (story?.[`${illusionKey}_conviction`] as number) || 0,
      previousInsights: getMomentsByType('insight'),
      resistancePoints: (story?.[`${illusionKey}_resistance_notes`] as string) || null,
    },

    momentContext: {
      recentObservations: getMomentsByType('real_world_observation'),
      keyRationalizations: getMomentsByType('rationalization'),
      breakthroughQuotes: getMomentsByType('emotional_breakthrough'),
      identityStatements: getMomentsByType('identity_statement'),
      commitments: getMomentsByType('commitment'),
    },
  }
}

/**
 * Format context into a system prompt injection
 * This is injected transiently and not stored in message history
 */
export function formatContextForPrompt(context: PersonalizationContext): string {
  const sections: string[] = []

  // User background
  if (context.userContext.productsUsed.length > 0) {
    sections.push(`USER BACKGROUND:
- Uses: ${context.userContext.productsUsed.join(', ')}
- Frequency: ${context.userContext.usageFrequency}
- Years using: ${context.userContext.yearsUsing || 'unknown'}
- Previous quit attempts: ${context.userContext.previousAttempts}`)
  }

  // Triggers and stakes
  if (context.userContext.triggers.length > 0 || context.storyContext.personalStakes.length > 0) {
    const parts: string[] = []
    if (context.userContext.triggers.length > 0) {
      parts.push(`Triggers: ${context.userContext.triggers.join(', ')}`)
    }
    if (context.storyContext.personalStakes.length > 0) {
      parts.push(`Personal stakes: ${context.storyContext.personalStakes.join(', ')}`)
    }
    sections.push(`MOTIVATIONS:\n${parts.map(p => `- ${p}`).join('\n')}`)
  }

  // Origin story summary
  if (context.storyContext.originSummary) {
    sections.push(`THEIR STORY:\n${context.storyContext.originSummary}`)
  }

  // Belief state
  if (context.beliefContext.currentConviction > 0 || context.beliefContext.previousInsights.length > 0) {
    const parts: string[] = []
    if (context.beliefContext.currentConviction > 0) {
      parts.push(`Current conviction level: ${context.beliefContext.currentConviction}/10`)
    }
    if (context.beliefContext.previousInsights.length > 0) {
      parts.push(`Previous insight they expressed: "${context.beliefContext.previousInsights[0]}"`)
    }
    if (context.beliefContext.resistancePoints) {
      parts.push(`Remaining resistance: ${context.beliefContext.resistancePoints}`)
    }
    sections.push(`BELIEF STATE:\n${parts.map(p => `- ${p}`).join('\n')}`)
  }

  // Key moments (use their own words when possible)
  const momentParts: string[] = []
  if (context.momentContext.keyRationalizations.length > 0) {
    momentParts.push(`They've rationalized: "${context.momentContext.keyRationalizations[0]}"`)
  }
  if (context.momentContext.breakthroughQuotes.length > 0) {
    momentParts.push(`They had a breakthrough: "${context.momentContext.breakthroughQuotes[0]}"`)
  }
  if (context.momentContext.recentObservations.length > 0) {
    momentParts.push(`They observed: "${context.momentContext.recentObservations[0]}"`)
  }
  if (context.momentContext.identityStatements.length > 0) {
    momentParts.push(`They said about themselves: "${context.momentContext.identityStatements[0]}"`)
  }
  if (context.momentContext.commitments.length > 0) {
    momentParts.push(`They committed: "${context.momentContext.commitments[0]}"`)
  }

  if (momentParts.length > 0) {
    sections.push(`KEY MOMENTS FROM THEIR JOURNEY:\n${momentParts.map(p => `- ${p}`).join('\n')}`)
  }

  if (sections.length === 0) {
    return ''
  }

  return `\n\n--- USER CONTEXT (use naturally, don't repeat verbatim) ---\n${sections.join('\n\n')}\n--- END USER CONTEXT ---\n`
}
