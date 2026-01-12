/**
 * Illusions Cheat Sheet Generator
 * Creates a structured artifact with illusion summaries and user's key insights
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// Static illusion content - the truth behind each illusion
// Keys must match ILLUSION_KEYS: stress_relief, pleasure, willpower, focus, identity
export const ILLUSION_CONTENT: Record<string, { name: string; illusion: string; truth: string }> = {
  stress_relief: {
    name: 'Stress Relief',
    illusion: 'Nicotine helps me manage stress',
    truth: 'Nicotine creates the stress it appears to relieve. The "relief" you feel is just satisfying the withdrawal it caused.',
  },
  pleasure: {
    name: 'Pleasure',
    illusion: 'Nicotine gives me genuine pleasure',
    truth: 'The "pleasure" is actually relief from withdrawal disguised as enjoyment. Non-smokers don\'t need nicotine to feel good.',
  },
  willpower: {
    name: 'Willpower',
    illusion: 'Quitting requires incredible willpower',
    truth: 'Quitting is about changing your perception, not white-knuckling through cravings. When you see the truth, there\'s nothing to resist.',
  },
  focus: {
    name: 'Focus',
    illusion: 'Nicotine helps me concentrate and focus',
    truth: 'Nicotine actually disrupts your natural concentration. The "focus" you feel is just relief from withdrawal-induced distraction.',
  },
  identity: {
    name: 'Identity',
    illusion: 'I have an addictive personality',
    truth: 'Addiction is a trap anyone can fall into and escape from. Your identity is not defined by a chemical dependency.',
  },
}

export interface IllusionCheatSheetEntry {
  illusionKey: string
  name: string
  illusion: string
  truth: string
  userInsight?: string
  insightMomentId?: string
}

export interface CheatSheetData {
  entries: IllusionCheatSheetEntry[]
  generatedAt: string
}

/**
 * Generate the illusions cheat sheet for a user
 */
export async function generateIllusionsCheatSheet(
  supabase: SupabaseClient,
  userId: string
): Promise<CheatSheetData> {
  // 1. Get user's key insights for each illusion
  const { data: userStory } = await supabase
    .from('user_story')
    .select(`
      stress_relief_key_insight_id,
      pleasure_illusion_key_insight_id,
      willpower_myth_key_insight_id,
      focus_enhancement_key_insight_id,
      identity_belief_key_insight_id
    `)
    .eq('user_id', userId)
    .single()

  // 2. Collect all key insight IDs
  const insightIds: string[] = []
  const illusionKeyInsightMap: Record<string, string> = {}

  if (userStory) {
    for (const [key, value] of Object.entries(userStory)) {
      if (key.endsWith('_key_insight_id') && value) {
        const illusionKey = key.replace('_key_insight_id', '')
        insightIds.push(value as string)
        illusionKeyInsightMap[illusionKey] = value as string
      }
    }
  }

  // 3. Fetch insight transcripts
  const insightTranscripts: Record<string, string> = {}
  if (insightIds.length > 0) {
    const { data: insights } = await supabase
      .from('captured_moments')
      .select('id, transcript')
      .in('id', insightIds)

    if (insights) {
      for (const insight of insights) {
        insightTranscripts[insight.id] = insight.transcript
      }
    }
  }

  // 4. Build cheat sheet entries
  const entries: IllusionCheatSheetEntry[] = []

  for (const [illusionKey, content] of Object.entries(ILLUSION_CONTENT)) {
    const insightId = illusionKeyInsightMap[illusionKey]
    const entry: IllusionCheatSheetEntry = {
      illusionKey,
      name: content.name,
      illusion: content.illusion,
      truth: content.truth,
    }

    if (insightId && insightTranscripts[insightId]) {
      entry.userInsight = insightTranscripts[insightId]
      entry.insightMomentId = insightId
    }

    entries.push(entry)
  }

  return {
    entries,
    generatedAt: new Date().toISOString(),
  }
}

/**
 * Save cheat sheet as an artifact
 */
export async function saveCheatSheetArtifact(
  supabase: SupabaseClient,
  userId: string,
  cheatSheet: CheatSheetData
): Promise<string> {
  const { data, error } = await supabase
    .from('ceremony_artifacts')
    .upsert({
      user_id: userId,
      artifact_type: 'myths_cheat_sheet',
      content_json: cheatSheet,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,artifact_type',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[cheat-sheet] Failed to save artifact:', error)
    throw new Error('Failed to save cheat sheet')
  }

  return data.id
}
