/**
 * Pre-computation of opening text and audio for L2/L3 sessions
 * Runs in background after L1/L2 session completion to eliminate LLM+TTS calls at next session start
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IllusionKey, IllusionLayer } from '../llm/task-types'
import type { UserContext } from '../prompts/base-system'
import { buildSessionContext, formatContextForPrompt } from '../personalization/context-builder'
import { buildCrossLayerContext, formatCrossLayerContext } from '../personalization/cross-layer-context'
import { buildBridgeContext } from './bridge'
import { buildSystemPrompt } from '../prompts'
import { getModelRouter, getDefaultModel } from '../llm'
import { getTTSProviderFromConfig } from '../tts'

interface PrecomputeParams {
  supabase: SupabaseClient
  userId: string
  illusionKey: IllusionKey
  nextLayer: IllusionLayer
}

/**
 * Pre-compute opening text and audio for next layer of an illusion
 * Stores text in user_progress.precomputed_opening_text (v1)
 * Stores audio in Storage and metadata in user_progress (v2)
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
      const model = getDefaultModel()
      const response = await router.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: generationPrompt }
        ],
        model
      })

      const openingText = response.content.trim()

      // Treat empty response as failure
      if (!openingText) {
        throw new Error('Empty response from LLM')
      }

      // Store text FIRST (REQ-20: text saved even if audio fails)
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

      console.log(`[precompute-opening] Text stored: userId=${userId}, illusionKey=${illusionKey}, nextLayer=${nextLayer}, textLength=${openingText.length}, attempt=${attempt + 1}`)

      // === NEW: Audio generation (v2) ===
      try {
        // 1. Generate audio via TTS
        const provider = getTTSProviderFromConfig()
        const ttsResult = await provider.synthesize({ text: openingText })

        // 2. Delete previous audio from Storage (REQ-18)
        const { data: progress } = await supabase
          .from('user_progress')
          .select('precomputed_opening_audio_path')
          .eq('user_id', userId)
          .single()

        if (progress?.precomputed_opening_audio_path) {
          await supabase.storage
            .from('opening-audio')
            .remove([progress.precomputed_opening_audio_path])
        }

        // 3. Upload new audio to Storage
        const ext = ttsResult.contentType === 'audio/mpeg' ? 'mp3' : 'wav'
        const audioPath = `l2l3/${userId}/opening.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('opening-audio')
          .upload(audioPath, ttsResult.audioBuffer, {
            contentType: ttsResult.contentType,
            upsert: true
          })

        if (uploadError) throw uploadError

        // 4. Update user_progress with audio metadata
        await supabase
          .from('user_progress')
          .update({
            precomputed_opening_audio_path: audioPath,
            precomputed_opening_word_timings: {
              timings: ttsResult.wordTimings,
              timingSource: ttsResult.timingSource,
              contentType: ttsResult.contentType
            }
          })
          .eq('user_id', userId)

        console.log('[precompute-opening] Audio generated and stored', {
          userId, illusionKey, nextLayer, audioPath,
          contentType: ttsResult.contentType,
          durationMs: ttsResult.estimatedDurationMs
        })

      } catch (audioError) {
        // Audio generation/upload failed — text is already saved (REQ-20)
        console.error('[precompute-opening] Audio generation failed (text still saved)', {
          userId, illusionKey, nextLayer,
          error: audioError instanceof Error ? audioError.message : String(audioError)
        })

        // Clear any stale audio references (best-effort — don't throw if this fails)
        await Promise.resolve(
          supabase
            .from('user_progress')
            .update({
              precomputed_opening_audio_path: null,
              precomputed_opening_word_timings: null
            })
            .eq('user_id', userId)
        ).catch(() => {})
      }

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
