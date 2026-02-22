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
import { buildOpeningPayloadHash } from './opening-payload-hash'

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
        crossLayerContext,
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

      // Read current audio path for post-publish cleanup.
      const { data: progress } = await supabase
        .from('user_progress')
        .select('precomputed_opening_audio_path')
        .eq('user_id', userId)
        .single()

      const previousAudioPath: string | null = progress?.precomputed_opening_audio_path ?? null

      let audioPath: string | null = null
      let uploadedAudioPath: string | null = null
      let payloadHash: string | null = null
      let wordTimingsPayload: Record<string, unknown> | null = null

      try {
        const ttsProvider = getTTSProviderFromConfig()
        const ttsResult = await ttsProvider.synthesize({ text: openingText })
        const providerVersion = `${ttsResult.provider}:${ttsResult.timingSource}`
        payloadHash = buildOpeningPayloadHash({
          text: openingText,
          illusionKey,
          illusionLayer: nextLayer,
          provider: ttsResult.provider,
          voice: ttsResult.voice,
          providerVersion,
        })

        const ext = ttsResult.contentType === 'audio/mpeg' ? 'mp3' : 'wav'
        audioPath = `l2l3/${userId}/${payloadHash}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('opening-audio')
          .upload(audioPath, ttsResult.audioBuffer, {
            contentType: ttsResult.contentType,
            upsert: true,
          })

        if (uploadError) throw uploadError

        uploadedAudioPath = audioPath
        wordTimingsPayload = {
          timings: ttsResult.wordTimings,
          timingSource: ttsResult.timingSource,
          contentType: ttsResult.contentType,
          payloadHash,
          provider: ttsResult.provider,
          voice: ttsResult.voice,
          providerVersion,
        }
      } catch (audioError) {
        // Text will still be published, but Tier 1 metadata is cleared.
        console.error('[precompute-opening] Audio generation/upload failed; publishing text-only opening', {
          userId,
          illusionKey,
          nextLayer,
          error: audioError instanceof Error ? audioError.message : String(audioError),
        })
      }

      const publishPayload = {
        precomputed_opening_text: openingText,
        precomputed_opening_at: new Date().toISOString(),
        precomputed_opening_audio_path: audioPath,
        precomputed_opening_word_timings: wordTimingsPayload,
        precomputed_opening_payload_hash: payloadHash,
      }

      const { error: publishError } = await supabase
        .from('user_progress')
        .update(publishPayload)
        .eq('user_id', userId)

      if (publishError) {
        if (uploadedAudioPath) {
          await Promise.resolve(
            supabase.storage
              .from('opening-audio')
              .remove([uploadedAudioPath])
          ).catch(() => {})
        }
        throw publishError
      }

      console.log('[precompute-opening] Opening published', {
        userId,
        illusionKey,
        nextLayer,
        hasAudio: !!audioPath,
        payloadHash,
        audioPath,
        attempt: attempt + 1,
      })

      if (audioPath && previousAudioPath && previousAudioPath !== audioPath) {
        await Promise.resolve(
          supabase.storage
            .from('opening-audio')
            .remove([previousAudioPath])
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
