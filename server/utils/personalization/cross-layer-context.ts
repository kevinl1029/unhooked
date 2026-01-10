/**
 * Cross-Layer Context Builder
 * Builds context from previous layers when user returns for Layer 2 or 3 of a myth
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { MythKey, MythLayer, MomentType } from '../llm/task-types'

export interface LayerInsight {
  layer: MythLayer
  quote: string
}

export interface CrossLayerContext {
  previousLayerInsights: LayerInsight[]
  breakthroughs: string[]
  resistancePoints: string[]
  convictionAtPreviousLayers: Array<{
    layer: MythLayer
    conviction: number
    assessed_at: string
  }>
}

/**
 * Get conviction history for a myth across layers
 */
async function getConvictionHistory(
  supabase: SupabaseClient,
  userId: string,
  mythKey: string
): Promise<CrossLayerContext['convictionAtPreviousLayers']> {
  const { data } = await supabase
    .from('conviction_assessments')
    .select('myth_layer, conviction_score, created_at')
    .eq('user_id', userId)
    .eq('myth_key', mythKey)
    .order('created_at', { ascending: true })

  if (!data) return []

  return data.map(d => ({
    layer: d.myth_layer as MythLayer,
    conviction: d.conviction_score,
    assessed_at: d.created_at,
  }))
}

/**
 * Build cross-layer context for returning users
 * Used when user returns for Layer 2 or 3 of a myth
 */
export async function buildCrossLayerContext(
  supabase: SupabaseClient,
  userId: string,
  mythKey: string,
  currentLayer: MythLayer
): Promise<CrossLayerContext> {
  // Fetch all moments from this myth
  const { data: previousMoments } = await supabase
    .from('captured_moments')
    .select('id, moment_type, transcript, myth_layer, confidence_score, created_at')
    .eq('user_id', userId)
    .eq('myth_key', mythKey)
    .order('created_at', { ascending: true })

  // Get conviction history
  const convictionHistory = await getConvictionHistory(supabase, userId, mythKey)

  // Filter to get 1 per type max
  const getOnePerType = (moments: typeof previousMoments, type: MomentType): string[] => {
    if (!moments) return []
    const filtered = moments.filter(m => m.moment_type === type)
    return filtered.slice(0, 1).map(m => m.transcript)
  }

  // Get insights with their layer info
  const insightsWithLayer: LayerInsight[] = (previousMoments || [])
    .filter(m => m.moment_type === 'insight' && m.myth_layer)
    .slice(0, 2) // Max 2 insights from previous layers
    .map(m => ({
      layer: m.myth_layer as MythLayer,
      quote: m.transcript,
    }))

  return {
    previousLayerInsights: insightsWithLayer,
    breakthroughs: getOnePerType(previousMoments, 'emotional_breakthrough'),
    resistancePoints: getOnePerType(previousMoments, 'fear_resistance'),
    convictionAtPreviousLayers: convictionHistory,
  }
}

/**
 * Format cross-layer context for prompt injection
 */
export function formatCrossLayerContext(context: CrossLayerContext): string {
  const parts: string[] = []

  if (context.previousLayerInsights.length > 0) {
    const insightText = context.previousLayerInsights
      .map(i => `- At ${i.layer} layer: "${i.quote}"`)
      .join('\n')
    parts.push(`INSIGHTS FROM PREVIOUS LAYERS:\n${insightText}`)
  }

  if (context.breakthroughs.length > 0) {
    parts.push(`BREAKTHROUGH MOMENT: "${context.breakthroughs[0]}"`)
  }

  if (context.resistancePoints.length > 0) {
    parts.push(`RESISTANCE THEY SHOWED: "${context.resistancePoints[0]}"`)
  }

  if (context.convictionAtPreviousLayers.length > 0) {
    const latest = context.convictionAtPreviousLayers[context.convictionAtPreviousLayers.length - 1]
    parts.push(`CONVICTION LEVEL AFTER LAST SESSION: ${latest.conviction}/10`)
  }

  if (parts.length === 0) {
    return ''
  }

  return `\n\n--- PREVIOUS SESSION CONTEXT ---\n${parts.join('\n\n')}\n--- END PREVIOUS SESSION CONTEXT ---\n`
}
