/**
 * Pre-computation of opening text for L2/L3 sessions
 * Runs in background after L1/L2 session completion to eliminate LLM call at next session start
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IllusionKey, IllusionLayer } from '../llm/task-types'
import type { UserContext } from '../prompts/base-system'
import { buildSessionContext, formatContextForPrompt } from '../personalization/context-builder'
import { buildCrossLayerContext, formatCrossLayerContext } from '../personalization/cross-layer-context'
import { buildBridgeContext } from './bridge'
import { buildSystemPrompt } from '../prompts'
import { getModelRouter } from '../llm'

interface PrecomputeParams {
  supabase: SupabaseClient
  userId: string
  illusionKey: IllusionKey
  nextLayer: IllusionLayer
}

/**
 * Pre-compute opening text for next layer of an illusion
 * Stores result in user_progress.precomputed_opening_text
 */
export async function precomputeOpeningText(params: PrecomputeParams): Promise<void> {
  const { supabase, userId, illusionKey, nextLayer } = params

  let attempt = 0
  const maxAttempts = 2

  while (attempt < maxAttempts) {
    try {
      console.log(`[precompute-opening] Starting attempt ${attempt + 1}/${maxAttempts} for user ${userId}, ${illusionKey} → ${nextLayer}`)

      // Fetch user intake for userContext
      const { data: intake } = await supabase
        .from('user_intake')
        .select('product_types, usage_frequency, years_using, previous_attempts, triggers')
        .eq('user_id', userId)
        .single()

      const userContext: UserContext | undefined = intake ? {
        productTypes: intake.product_types,
        usageFrequency: intake.usage_frequency,
        yearsUsing: intake.years_using,
        previousAttempts: intake.previous_attempts,
        triggers: intake.triggers
      } : undefined

      // Build session context for personalization
      const sessionContext = await buildSessionContext(supabase, userId, illusionKey, 'core')
      const personalizationContext = typeof sessionContext === 'string'
        ? sessionContext
        : formatContextForPrompt(sessionContext)

      // Build cross-layer context (insights from previous layers)
      const crossLayerCtx = await buildCrossLayerContext(supabase, userId, illusionKey, nextLayer)
      const crossLayerContext = formatCrossLayerContext(crossLayerCtx)

      // Build bridge context (acknowledges previous session)
      const bridgeContext = buildBridgeContext(crossLayerCtx)

      // Build system prompt with all context
      const systemPrompt = buildSystemPrompt({
        illusionKey,
        userContext,
        isNewConversation: true,
        personalizationContext,
        bridgeContext,
        illusionLayer: nextLayer
      })

      // Build generation prompt asking for opening message only
      const generationPrompt = `Generate ONLY the opening message for this session. The message should be:
- 2-4 sentences long
- Warm and welcoming
- Acknowledge the user's progress from the previous layer
- End with an open question that invites them to share their thoughts

Output ONLY the opening message text with no preamble, labels, or extra formatting.`

      // Call LLM to generate opening text
      const router = getModelRouter()
      const response = await router.chat([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: generationPrompt }
      ])

      const openingText = response.content.trim()

      // Treat empty response as failure
      if (!openingText) {
        throw new Error('Empty response from LLM')
      }

      // Store in user_progress
      const { error: updateError } = await supabase
        .from('user_progress')
        .update({
          precomputed_opening_text: openingText,
          precomputed_opening_at: new Date().toISOString()
        })
        .eq('user_id', userId)

      if (updateError) {
        throw updateError
      }

      console.log(`[precompute-opening] Success: userId=${userId}, illusionKey=${illusionKey}, nextLayer=${nextLayer}, textLength=${openingText.length}, attempt=${attempt + 1}`)
      return // Success - exit

    } catch (error) {
      console.error(`[precompute-opening] Attempt ${attempt + 1}/${maxAttempts} failed:`, error)
      attempt++

      // If this wasn't the last attempt, wait 500ms before retry
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }

  // All retries failed
  console.error(`[precompute-opening] All ${maxAttempts} attempts failed for userId=${userId}, illusionKey=${illusionKey}, nextLayer=${nextLayer}. Fallback will be used at session start.`)
}
