/**
 * Pre-computation of opening text and audio for L2/L3 sessions
 * Runs in background after L1/L2 session completion to eliminate LLM+TTS calls at next session start
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IllusionKey, IllusionLayer } from '../llm/task-types'
import type { ModelType } from '../llm/types'
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

export interface PrecomputeOpeningResult {
  success: boolean
  route: 'primary' | 'secondary' | null
  attempts: number
  error?: string
}

const PRECOMPUTE_PRIMARY_RETRIES = 2

function isTransientLlmError(error: unknown): boolean {
  const candidate = error as { status?: number; statusCode?: number; response?: { status?: number }; message?: string } | null
  const status = candidate?.status ?? candidate?.statusCode ?? candidate?.response?.status
  if (status) {
    if (status === 400 || status === 401 || status === 403) return false
    if (status === 408 || status === 429 || status === 503 || status >= 500) return true
  }

  const message = String(candidate?.message ?? '').toLowerCase()
  if (!message) return true
  if (message.includes('503') || message.includes('429') || message.includes('rate limit') || message.includes('temporar')) return true
  if (message.includes('timeout') || message.includes('timed out')) return true
  if (message.includes('400') || message.includes('401') || message.includes('403')) return false
  return true
}

function getPrecomputeModelPlan(): Array<{ route: 'primary' | 'secondary'; model: ModelType }> {
  const config = useRuntimeConfig()
  const defaultModel = getDefaultModel()
  const primaryModel = (config.chatPrimaryProvider as ModelType | undefined) || defaultModel
  const secondaryModel = (config.chatSecondaryProvider as ModelType | undefined) || (primaryModel === 'groq' ? 'gemini' : 'groq')

  const plan: Array<{ route: 'primary' | 'secondary'; model: ModelType }> = []
  for (let i = 0; i < PRECOMPUTE_PRIMARY_RETRIES; i++) {
    plan.push({ route: 'primary', model: primaryModel })
  }
  if (secondaryModel !== primaryModel) {
    plan.push({ route: 'secondary', model: secondaryModel })
  }
  return plan
}

/**
 * Pre-compute opening text and audio for next layer of an illusion
 * Stores text in user_progress.precomputed_opening_text (v1)
 * Stores audio in Storage and metadata in user_progress (v2)
 */
export async function precomputeOpeningText(params: PrecomputeParams): Promise<PrecomputeOpeningResult> {
  const { supabase, userId, illusionKey, nextLayer } = params
  let totalAttempts = 0

  try {
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

    // Call LLM to generate opening text with primary retry + secondary failover.
    const router = getModelRouter()
    const modelPlan = getPrecomputeModelPlan()
    let openingText = ''
    let winningRoute: 'primary' | 'secondary' | null = null
    let lastLlmError: unknown = null

    for (const planStep of modelPlan) {
      totalAttempts++
      console.log('[precompute-opening] Provider route selected', {
        userId,
        illusionKey,
        nextLayer,
        route: planStep.route,
        model: planStep.model,
        attempt: totalAttempts,
      })
      try {
        const response = await router.chat({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: generationPrompt }
          ],
          model: planStep.model
        })
        openingText = response.content.trim()
        winningRoute = planStep.route
        if (!openingText) {
          throw new Error('Empty response from LLM')
        }
        break
      } catch (error) {
        lastLlmError = error
        console.error(`[precompute-opening] Attempt ${totalAttempts}/${modelPlan.length} failed`, {
          userId,
          illusionKey,
          nextLayer,
          route: planStep.route,
          model: planStep.model,
          error: error instanceof Error ? error.message : String(error),
        })
        if (!isTransientLlmError(error)) {
          break
        }
        if (totalAttempts < modelPlan.length && planStep.route === 'primary') {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }
    }

    if (!openingText || !winningRoute) {
      throw (lastLlmError || new Error('Failed to generate opening text'))
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
      precomputed_opening_status: 'ready',
      precomputed_opening_target_illusion_key: illusionKey,
      precomputed_opening_target_layer: nextLayer,
      precomputed_opening_text: openingText,
      precomputed_opening_at: new Date().toISOString(),
      precomputed_opening_audio_path: audioPath,
      precomputed_opening_word_timings: wordTimingsPayload,
      precomputed_opening_payload_hash: payloadHash,
    }

    const { data: publishRows, error: publishError } = await supabase
      .from('user_progress')
      .update(publishPayload)
      .eq('user_id', userId)
      .eq('precomputed_opening_status', 'pending')
      .eq('precomputed_opening_target_illusion_key', illusionKey)
      .eq('precomputed_opening_target_layer', nextLayer)
      .select('user_id')

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

    if (!publishRows || publishRows.length === 0) {
      if (uploadedAudioPath) {
        await Promise.resolve(
          supabase.storage
            .from('opening-audio')
            .remove([uploadedAudioPath])
        ).catch(() => {})
      }
      const slotError = new Error('precompute slot not pending or target mismatch')
      throw slotError
    }

    console.log('[precompute-opening] Opening published', {
      userId,
      illusionKey,
      nextLayer,
      hasAudio: !!audioPath,
      payloadHash,
      audioPath,
      route: winningRoute,
      attempts: totalAttempts,
    })

    if (audioPath && previousAudioPath && previousAudioPath !== audioPath) {
      await Promise.resolve(
        supabase.storage
          .from('opening-audio')
          .remove([previousAudioPath])
      ).catch(() => {})
    }

    return { success: true, route: winningRoute, attempts: totalAttempts }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Mark pending slot as failed for this target. If the slot already moved on,
    // this update is a no-op by design.
    const { error: failMarkError } = await supabase
      .from('user_progress')
      .update({
        precomputed_opening_status: 'failed',
        precomputed_opening_target_illusion_key: illusionKey,
        precomputed_opening_target_layer: nextLayer,
        precomputed_opening_text: null,
        precomputed_opening_at: null,
        precomputed_opening_audio_path: null,
        precomputed_opening_word_timings: null,
        precomputed_opening_payload_hash: null,
      })
      .eq('user_id', userId)
      .eq('precomputed_opening_status', 'pending')
      .eq('precomputed_opening_target_illusion_key', illusionKey)
      .eq('precomputed_opening_target_layer', nextLayer)

    if (failMarkError) {
      console.error('[precompute-opening] Failed to mark slot as failed', {
        userId,
        illusionKey,
        nextLayer,
        error: failMarkError.message,
      })
    } else {
      console.error('[precompute-opening] Slot marked failed', {
        userId,
        illusionKey,
        nextLayer,
        status: 'failed',
        error: errorMessage,
      })
    }

    return { success: false, route: null, attempts: totalAttempts, error: errorMessage }
  }
}
