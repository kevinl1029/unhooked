import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ILLUSION_OPENING_MESSAGES } from '~/server/utils/prompts'
import type { IllusionKey, IllusionLayer, SessionType } from '~/server/utils/llm/task-types'
import type { WordTiming } from '~/server/utils/tts/types'
import { buildOpeningPayloadHash } from '~/server/utils/session/opening-payload-hash'

interface ManifestEntry {
  audioPath: string
  contentType: string
  timings: WordTiming[]
  timingSource: 'actual' | 'estimated'
}

type L1Manifest = Partial<Record<IllusionKey, ManifestEntry>>

interface OpeningWordTimingsJson {
  timings: WordTiming[]
  timingSource: 'actual' | 'estimated'
  contentType: string
  payloadHash?: string
  provider?: string
  voice?: string
  providerVersion?: string | null
}

// Module-level manifest cache with 5-min TTL
let l1ManifestCache: L1Manifest | null = null
let l1ManifestLoadedAt = 0
const MANIFEST_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function getL1Manifest(supabase: SupabaseClient): Promise<L1Manifest | null> {
  if (l1ManifestCache && Date.now() - l1ManifestLoadedAt < MANIFEST_TTL_MS) {
    return l1ManifestCache
  }

  const { data, error } = await supabase.storage
    .from('opening-audio')
    .download('l1/manifest.json')

  if (error || !data) return null

  try {
    l1ManifestCache = JSON.parse(await data.text()) as L1Manifest
    l1ManifestLoadedAt = Date.now()
    return l1ManifestCache
  } catch {
    return null
  }
}

export default defineEventHandler(async (event) => {
  // Authentication check
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized',
    })
  }

  // Get query parameters
  const query = getQuery(event)
  const illusionKey = query.illusionKey as IllusionKey | undefined
  const illusionLayer = query.illusionLayer as IllusionLayer | undefined
  const sessionType = query.sessionType as SessionType | undefined
  const authUserId = (user as any)?.sub || user.id

  // Validate required params
  if (!illusionKey || !illusionLayer || !sessionType) {
    throw createError({
      statusCode: 400,
      message: 'Missing required query params: illusionKey, illusionLayer, sessionType',
    })
  }

  // Non-core sessions don't use fast-start
  if (sessionType !== 'core') {
    console.log('[instant-start] Opening not available', {
      illusionKey,
      illusionLayer,
      reason: 'non-core session',
    })
    return { text: null, source: null, audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
  }

  const supabase = serverSupabaseServiceRole(event)

  // L1 (intellectual layer) - use static messages
  if (illusionLayer === 'intellectual') {
    const staticText = ILLUSION_OPENING_MESSAGES[illusionKey]

    if (!staticText) {
      console.log('[instant-start] Opening not available', {
        illusionKey,
        illusionLayer,
        reason: 'illusionKey not found in ILLUSION_OPENING_MESSAGES',
      })
      return { text: null, source: null, audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
    }

    // Load L1 manifest from Storage (cached with 5-min TTL)
    const manifest = await getL1Manifest(supabase)
    const manifestEntry = manifest?.[illusionKey]

    if (manifestEntry) {
      // Generate signed URL for pre-stored audio
      const { data: signedData, error: signedError } = await supabase.storage
        .from('opening-audio')
        .createSignedUrl(manifestEntry.audioPath, 300)

      if (!signedError && signedData?.signedUrl) {
        console.log('[instant-start] Opening resolved', {
          illusionKey,
          illusionLayer,
          source: 'static',
          hasText: true,
          hasAudio: true,
        })
        return {
          text: staticText,
          source: 'static',
          audioUrl: signedData.signedUrl,
          wordTimings: manifestEntry.timings,
          contentType: manifestEntry.contentType,
          timingSource: manifestEntry.timingSource,
        }
      }
    }

    // No manifest or no entry or signed URL failed — Tier 2 fallback
    console.log('[instant-start] Opening resolved', {
      illusionKey,
      illusionLayer,
      source: 'static',
      hasText: true,
      hasAudio: false,
    })
    return { text: staticText, source: 'static', audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
  }

  // L2/L3 (emotional/identity layers) - use precomputed text and audio
  if (illusionLayer === 'emotional' || illusionLayer === 'identity') {
    const { data, error } = await supabase
      .from('user_progress')
      .select('precomputed_opening_text, precomputed_opening_audio_path, precomputed_opening_word_timings, precomputed_opening_payload_hash')
      .eq('user_id', authUserId)
      .single()

    if (error) {
      console.log('[instant-start] Opening not available', {
        illusionKey,
        illusionLayer,
        reason: 'DB error',
        lookupUserId: authUserId,
      })
      return { text: null, source: null, audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
    }

    const text: string | null = data?.precomputed_opening_text ?? null
    const audioPath: string | null = data?.precomputed_opening_audio_path ?? null
    const wordTimingsJson: OpeningWordTimingsJson | null = data?.precomputed_opening_word_timings ?? null
    const payloadHash: string | null = data?.precomputed_opening_payload_hash ?? null

    if (!text) {
      console.log('[instant-start] Opening not available', {
        illusionKey,
        illusionLayer,
        reason: 'no precomputed text',
      })
      return { text: null, source: null, audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
    }

    if (audioPath || wordTimingsJson || payloadHash) {
      let guardFailureReason: string | null = null
      if (!audioPath) {
        guardFailureReason = 'missing_audio_path'
      } else if (!wordTimingsJson) {
        guardFailureReason = 'missing_word_timings'
      } else if (!payloadHash) {
        guardFailureReason = 'missing_payload_hash'
      } else if (!wordTimingsJson.payloadHash) {
        guardFailureReason = 'missing_word_timings_payload_hash'
      } else if (wordTimingsJson.payloadHash !== payloadHash) {
        guardFailureReason = 'payload_hash_mismatch'
      } else if (!wordTimingsJson.provider || !wordTimingsJson.voice) {
        guardFailureReason = 'missing_tts_metadata'
      } else {
        const expectedHash = buildOpeningPayloadHash({
          text,
          illusionKey,
          illusionLayer,
          provider: wordTimingsJson.provider,
          voice: wordTimingsJson.voice,
          providerVersion: wordTimingsJson.providerVersion,
        })
        if (expectedHash !== payloadHash) {
          guardFailureReason = 'payload_hash_recompute_mismatch'
        } else if (!audioPath.includes(payloadHash)) {
          guardFailureReason = 'audio_path_payload_hash_mismatch'
        }
      }

      if (guardFailureReason) {
        console.warn('[instant-start] consistency_guard_failed', {
          illusionKey,
          illusionLayer,
          reason: guardFailureReason,
          lookupUserId: authUserId,
        })
        return { text, source: 'precomputed', audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
      }

      // Generate signed URL for pre-stored audio
      const { data: signedData, error: signedError } = await supabase.storage
        .from('opening-audio')
        .createSignedUrl(audioPath, 300)

      if (!signedError && signedData?.signedUrl) {
        console.log('[instant-start] Opening resolved', {
          illusionKey,
          illusionLayer,
          source: 'precomputed',
          hasText: true,
          hasAudio: true,
        })
        return {
          text,
          source: 'precomputed',
          audioUrl: signedData.signedUrl,
          wordTimings: wordTimingsJson!.timings,
          contentType: wordTimingsJson!.contentType,
          timingSource: wordTimingsJson!.timingSource,
        }
      }
    }

    // No audio path or signed URL failed — Tier 2 fallback
    console.log('[instant-start] Opening resolved', {
      illusionKey,
      illusionLayer,
      source: 'precomputed',
      hasText: true,
      hasAudio: false,
    })
    return { text, source: 'precomputed', audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
  }

  // Fallback for unexpected illusionLayer
  console.log('[instant-start] Opening not available', {
    illusionKey,
    illusionLayer,
    reason: 'unexpected illusionLayer',
  })
  return { text: null, source: null, audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
})
