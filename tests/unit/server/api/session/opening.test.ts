/**
 * Unit tests for the opening endpoint logic.
 *
 * Tests GET /api/session/opening: auth validation, L1 static text + manifest
 * audio, L2/L3 precomputed text + audio, manifest caching (5-min TTL), signed
 * URL generation (300s expiry), and Tier 2 fallback when audio is unavailable.
 *
 * Uses direct logic extraction pattern (no H3/Nuxt server context needed).
 * Mirrors the pattern from tests/unit/server/api/admin/generate-opening-audio.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ILLUSION_OPENING_MESSAGES } from '~/server/utils/prompts'
import type { IllusionKey } from '~/server/utils/llm/task-types'
import type { WordTiming } from '~/server/utils/tts/types'
import { buildOpeningPayloadHash } from '~/server/utils/session/opening-payload-hash'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface ManifestCacheState {
  cache: L1Manifest | null
  loadedAt: number
}

interface MockStorageApi {
  download: ReturnType<typeof vi.fn>
  createSignedUrl: ReturnType<typeof vi.fn>
}

// ---------------------------------------------------------------------------
// Handler logic extracted for testing (mirrors opening.get.ts)
// ---------------------------------------------------------------------------

const MANIFEST_TTL_MS = 5 * 60 * 1000 // 5 minutes

async function getL1ManifestWithCache(
  storageApi: MockStorageApi,
  cacheState: ManifestCacheState,
): Promise<L1Manifest | null> {
  if (cacheState.cache && Date.now() - cacheState.loadedAt < MANIFEST_TTL_MS) {
    return cacheState.cache
  }

  const { data, error } = await storageApi.download('l1/manifest.json')
  if (error || !data) return null

  try {
    cacheState.cache = JSON.parse(await data.text()) as L1Manifest
    cacheState.loadedAt = Date.now()
    return cacheState.cache
  } catch {
    return null
  }
}

type MockSupabase = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: ReturnType<typeof vi.fn>
  storage: {
    from: ReturnType<typeof vi.fn>
  }
}

async function handleOpeningRequest({
  user,
  illusionKey,
  illusionLayer,
  sessionType,
  supabase,
  cacheState,
}: {
  user: { id: string; sub?: string } | null
  illusionKey: string | undefined
  illusionLayer: string | undefined
  sessionType: string | undefined
  supabase: MockSupabase
  cacheState: ManifestCacheState
}) {
  // Auth check
  if (!user) {
    const err = new Error('Unauthorized') as Error & { statusCode: number }
    err.statusCode = 401
    throw err
  }

  // Validate required params
  if (!illusionKey || !illusionLayer || !sessionType) {
    const err = new Error('Missing required query params: illusionKey, illusionLayer, sessionType') as Error & { statusCode: number }
    err.statusCode = 400
    throw err
  }

  // Non-core sessions don't use fast-start
  if (sessionType !== 'core') {
    return { text: null, source: null, audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
  }

  const authUserId = user.sub || user.id
  const storageApi = supabase.storage.from('opening-audio') as MockStorageApi

  // L1 (intellectual layer) — use static messages
  if (illusionLayer === 'intellectual') {
    const staticText = ILLUSION_OPENING_MESSAGES[illusionKey as IllusionKey]

    if (!staticText) {
      return { text: null, source: null, audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
    }

    const manifest = await getL1ManifestWithCache(storageApi, cacheState)
    const manifestEntry = manifest?.[illusionKey as IllusionKey]

    if (manifestEntry) {
      const { data: signedData, error: signedError } = await storageApi.createSignedUrl(manifestEntry.audioPath, 300)

      if (!signedError && signedData?.signedUrl) {
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
    return { text: staticText, source: 'static', audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
  }

  // L2/L3 (emotional/identity layers) — use precomputed text and audio
  if (illusionLayer === 'emotional' || illusionLayer === 'identity') {
    const queryResult = supabase
      .from('user_progress')
      .select('precomputed_opening_text, precomputed_opening_audio_path, precomputed_opening_word_timings, precomputed_opening_payload_hash')
      .eq('user_id', authUserId)
      .single() as Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>

    const { data, error } = await queryResult

    if (error) {
      return { text: null, source: null, audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
    }

    const text: string | null = (data?.precomputed_opening_text as string | undefined) ?? null
    const audioPath: string | null = (data?.precomputed_opening_audio_path as string | undefined) ?? null
    const wordTimingsJson: OpeningWordTimingsJson | null = (data?.precomputed_opening_word_timings as OpeningWordTimingsJson | undefined) ?? null
    const payloadHash: string | null = (data?.precomputed_opening_payload_hash as string | undefined) ?? null

    if (!text) {
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
          illusionKey: illusionKey as IllusionKey,
          illusionLayer: illusionLayer as 'emotional' | 'identity',
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
        return { text, source: 'precomputed', audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
      }

      const { data: signedData, error: signedError } = await storageApi.createSignedUrl(audioPath, 300)

      if (!signedError && signedData?.signedUrl) {
        return {
          text,
          source: 'precomputed',
          audioUrl: signedData.signedUrl,
          wordTimings: wordTimingsJson.timings,
          contentType: wordTimingsJson.contentType,
          timingSource: wordTimingsJson.timingSource,
        }
      }
    }

    // No audio path or signed URL failed — Tier 2 fallback
    return { text, source: 'precomputed', audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
  }

  // Fallback for unexpected illusionLayer
  return { text: null, source: null, audioUrl: null, wordTimings: null, contentType: null, timingSource: null }
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const SIGNED_URL = 'https://supabase.test/signed/audio?token=abc123'

const MANIFEST_ENTRY: ManifestEntry = {
  audioPath: 'l1/stress_relief.wav',
  contentType: 'audio/wav',
  timings: [{ word: 'Hey', startMs: 0, endMs: 150 }],
  timingSource: 'estimated',
}

const L2_WORD_TIMINGS_JSON: OpeningWordTimingsJson = {
  timings: [{ word: 'Welcome', startMs: 0, endMs: 200 }],
  timingSource: 'actual',
  contentType: 'audio/wav',
  provider: 'groq',
  voice: 'luna',
  providerVersion: 'groq:actual',
}

const TEST_USER = { id: 'legacy-user-id', sub: 'user-123' }

function createLinkedPrecomputedRow({
  text,
  illusionKey = 'stress_relief',
  illusionLayer = 'emotional',
  audioExt = 'wav',
}: {
  text: string
  illusionKey?: IllusionKey
  illusionLayer?: 'emotional' | 'identity'
  audioExt?: 'wav' | 'mp3'
}) {
  const payloadHash = buildOpeningPayloadHash({
    text,
    illusionKey,
    illusionLayer,
    provider: L2_WORD_TIMINGS_JSON.provider!,
    voice: L2_WORD_TIMINGS_JSON.voice!,
    providerVersion: L2_WORD_TIMINGS_JSON.providerVersion,
  })
  const audioPath = `opening-audio/l2l3/user-123/${payloadHash}.${audioExt}`

  return {
    precomputed_opening_text: text,
    precomputed_opening_audio_path: audioPath,
    precomputed_opening_word_timings: {
      ...L2_WORD_TIMINGS_JSON,
      payloadHash,
    },
    precomputed_opening_payload_hash: payloadHash,
  }
}

function createStorageApi(opts: {
  manifestData?: L1Manifest | null
  signedUrl?: string | null
  signedUrlError?: { message: string } | null
} = {}): MockStorageApi {
  const { manifestData = null, signedUrl = null, signedUrlError = null } = opts

  return {
    download: vi.fn().mockResolvedValue({
      data: manifestData
        ? { text: () => Promise.resolve(JSON.stringify(manifestData)) }
        : null,
      error: manifestData ? null : { message: 'Not found' },
    }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: signedUrl ? { signedUrl } : null,
      error: signedUrl ? null : signedUrlError,
    }),
  }
}

function createUserProgressQuery(
  row: Record<string, unknown> | null,
  error: { message: string } | null = null,
) {
  const single = vi.fn().mockResolvedValue({ data: row, error })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  return { select }
}

function createSupabase(
  storageApi: MockStorageApi,
  userProgressRow: Record<string, unknown> | null = null,
  userProgressError: { message: string } | null = null,
): MockSupabase {
  return {
    from: vi.fn().mockReturnValue(createUserProgressQuery(userProgressRow, userProgressError)),
    storage: {
      from: vi.fn().mockReturnValue(storageApi),
    },
  }
}

function freshCacheState(): ManifestCacheState {
  return { cache: null, loadedAt: 0 }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Opening endpoint logic (GET /api/session/opening)', () => {
  let cacheState: ManifestCacheState

  beforeEach(() => {
    vi.clearAllMocks()
    cacheState = freshCacheState()
  })

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  describe('Authentication', () => {
    it('throws 401 for unauthenticated request', async () => {
      const storageApi = createStorageApi()
      const supabase = createSupabase(storageApi)

      const err = await handleOpeningRequest({
        user: null,
        illusionKey: 'stress_relief',
        illusionLayer: 'intellectual',
        sessionType: 'core',
        supabase,
        cacheState,
      }).catch((e) => e)

      expect(err.statusCode).toBe(401)
    })
  })

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  describe('Validation', () => {
    it('throws 400 when illusionKey is missing', async () => {
      const storageApi = createStorageApi()
      const supabase = createSupabase(storageApi)

      const err = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: undefined,
        illusionLayer: 'intellectual',
        sessionType: 'core',
        supabase,
        cacheState,
      }).catch((e) => e)

      expect(err.statusCode).toBe(400)
    })

    it('throws 400 when illusionLayer is missing', async () => {
      const storageApi = createStorageApi()
      const supabase = createSupabase(storageApi)

      const err = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: undefined,
        sessionType: 'core',
        supabase,
        cacheState,
      }).catch((e) => e)

      expect(err.statusCode).toBe(400)
    })

    it('throws 400 when sessionType is missing', async () => {
      const storageApi = createStorageApi()
      const supabase = createSupabase(storageApi)

      const err = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'intellectual',
        sessionType: undefined,
        supabase,
        cacheState,
      }).catch((e) => e)

      expect(err.statusCode).toBe(400)
    })
  })

  // -------------------------------------------------------------------------
  // Non-core sessions
  // -------------------------------------------------------------------------

  describe('Non-core sessions', () => {
    it('returns all null for non-core session (check_in)', async () => {
      const storageApi = createStorageApi()
      const supabase = createSupabase(storageApi)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'intellectual',
        sessionType: 'check_in',
        supabase,
        cacheState,
      })

      expect(result).toEqual({
        text: null,
        source: null,
        audioUrl: null,
        wordTimings: null,
        contentType: null,
        timingSource: null,
      })
    })
  })

  // -------------------------------------------------------------------------
  // L1 (intellectual layer)
  // -------------------------------------------------------------------------

  describe('L1 (intellectual layer)', () => {
    it('returns static text + audioUrl when manifest has entry for key', async () => {
      const manifest: L1Manifest = { stress_relief: MANIFEST_ENTRY }
      const storageApi = createStorageApi({ manifestData: manifest, signedUrl: SIGNED_URL })
      const supabase = createSupabase(storageApi)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'intellectual',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.text).toBe(ILLUSION_OPENING_MESSAGES.stress_relief)
      expect(result.source).toBe('static')
      expect(result.audioUrl).toBe(SIGNED_URL)
      expect(result.wordTimings).toEqual(MANIFEST_ENTRY.timings)
      expect(result.contentType).toBe(MANIFEST_ENTRY.contentType)
      expect(result.timingSource).toBe(MANIFEST_ENTRY.timingSource)
    })

    it('returns static text + null audio when manifest download fails', async () => {
      const storageApi = createStorageApi({ manifestData: null })
      const supabase = createSupabase(storageApi)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'intellectual',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.text).toBe(ILLUSION_OPENING_MESSAGES.stress_relief)
      expect(result.source).toBe('static')
      expect(result.audioUrl).toBeNull()
      expect(result.wordTimings).toBeNull()
      expect(result.contentType).toBeNull()
      expect(result.timingSource).toBeNull()
    })

    it('returns static text + null audio when createSignedUrl fails (Tier 2 fallback)', async () => {
      const manifest: L1Manifest = { stress_relief: MANIFEST_ENTRY }
      const storageApi = createStorageApi({
        manifestData: manifest,
        signedUrl: null,
        signedUrlError: { message: 'Signing failed' },
      })
      const supabase = createSupabase(storageApi)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'intellectual',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.text).toBe(ILLUSION_OPENING_MESSAGES.stress_relief)
      expect(result.source).toBe('static')
      expect(result.audioUrl).toBeNull()
    })

    it('generates signed URL with 300 second expiry for L1', async () => {
      const manifest: L1Manifest = { stress_relief: MANIFEST_ENTRY }
      const storageApi = createStorageApi({ manifestData: manifest, signedUrl: SIGNED_URL })
      const supabase = createSupabase(storageApi)

      await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'intellectual',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(storageApi.createSignedUrl).toHaveBeenCalledWith(MANIFEST_ENTRY.audioPath, 300)
    })

    it('caches manifest for 5 minutes — second call within TTL skips Storage download', async () => {
      const manifest: L1Manifest = { stress_relief: MANIFEST_ENTRY }
      const storageApi = createStorageApi({ manifestData: manifest, signedUrl: SIGNED_URL })
      const supabase = createSupabase(storageApi)

      // First call: fetches and caches manifest
      await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'intellectual',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      // Second call within 5-min TTL: should use cache
      await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'intellectual',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      // download should only be called once (for the first request)
      expect(storageApi.download).toHaveBeenCalledTimes(1)
    })
  })

  // -------------------------------------------------------------------------
  // L2/L3 (emotional / identity layers)
  // -------------------------------------------------------------------------

  describe('L2/L3 (emotional/identity layers)', () => {
    it('queries user_progress with user.sub when available', async () => {
      const storageApi = createStorageApi()
      const single = vi.fn().mockResolvedValue({
        data: {
          precomputed_opening_text: 'Welcome back.',
          precomputed_opening_audio_path: null,
          precomputed_opening_word_timings: null,
        },
        error: null,
      })
      const eq = vi.fn().mockReturnValue({ single })
      const select = vi.fn().mockReturnValue({ eq })
      const supabase = {
        from: vi.fn().mockReturnValue({ select }),
        storage: {
          from: vi.fn().mockReturnValue(storageApi),
        },
      } as unknown as MockSupabase

      await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(eq).toHaveBeenCalledWith('user_id', TEST_USER.sub)
      expect(eq).not.toHaveBeenCalledWith('user_id', TEST_USER.id)
    })

    it('returns precomputed text + audioUrl for L2 with audio_path in user_progress', async () => {
      const storageApi = createStorageApi({ signedUrl: SIGNED_URL })
      const userProgressRow = createLinkedPrecomputedRow({
        text: 'Welcome back.',
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
      })
      const supabase = createSupabase(storageApi, userProgressRow)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.text).toBe('Welcome back.')
      expect(result.source).toBe('precomputed')
      expect(result.audioUrl).toBe(SIGNED_URL)
      expect(result.wordTimings).toEqual(L2_WORD_TIMINGS_JSON.timings)
      expect(result.contentType).toBe(L2_WORD_TIMINGS_JSON.contentType)
      expect(result.timingSource).toBe(L2_WORD_TIMINGS_JSON.timingSource)
    })

    it('returns precomputed text + null audio for L2 without audio_path', async () => {
      const storageApi = createStorageApi()
      const userProgressRow = {
        precomputed_opening_text: 'Welcome back.',
        precomputed_opening_audio_path: null,
        precomputed_opening_word_timings: null,
      }
      const supabase = createSupabase(storageApi, userProgressRow)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.text).toBe('Welcome back.')
      expect(result.source).toBe('precomputed')
      expect(result.audioUrl).toBeNull()
      expect(result.wordTimings).toBeNull()
    })

    it('returns all null for L2 with no precomputed text', async () => {
      const storageApi = createStorageApi()
      const userProgressRow = {
        precomputed_opening_text: null,
        precomputed_opening_audio_path: null,
        precomputed_opening_word_timings: null,
      }
      const supabase = createSupabase(storageApi, userProgressRow)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.text).toBeNull()
      expect(result.source).toBeNull()
      expect(result.audioUrl).toBeNull()
      expect(result.wordTimings).toBeNull()
      expect(result.contentType).toBeNull()
      expect(result.timingSource).toBeNull()
    })

    it('returns text + null audio when createSignedUrl fails for L2 (Tier 2 fallback)', async () => {
      const storageApi = createStorageApi({
        signedUrl: null,
        signedUrlError: { message: 'URL signing failed' },
      })
      const userProgressRow = createLinkedPrecomputedRow({
        text: 'Welcome back.',
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
      })
      const supabase = createSupabase(storageApi, userProgressRow)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.text).toBe('Welcome back.')
      expect(result.source).toBe('precomputed')
      expect(result.audioUrl).toBeNull()
    })

    it('L3 (identity layer) also returns precomputed text + audioUrl', async () => {
      const storageApi = createStorageApi({ signedUrl: SIGNED_URL })
      const userProgressRow = createLinkedPrecomputedRow({
        text: 'Identity session text.',
        illusionKey: 'identity',
        illusionLayer: 'identity',
      })
      const supabase = createSupabase(storageApi, userProgressRow)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'identity',
        illusionLayer: 'identity',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.source).toBe('precomputed')
      expect(result.text).toBe('Identity session text.')
      expect(result.audioUrl).toBe(SIGNED_URL)
    })

    it('generates signed URL with 300 second expiry for L2', async () => {
      const storageApi = createStorageApi({ signedUrl: SIGNED_URL })
      const userProgressRow = createLinkedPrecomputedRow({
        text: 'Welcome back.',
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
      })
      const supabase = createSupabase(storageApi, userProgressRow)

      await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(storageApi.createSignedUrl).toHaveBeenCalledWith(
        userProgressRow.precomputed_opening_audio_path,
        300,
      )
    })

    it('suppresses Tier 1 when row hash is missing (consistency guard)', async () => {
      const storageApi = createStorageApi({ signedUrl: SIGNED_URL })
      const linked = createLinkedPrecomputedRow({
        text: 'Welcome back.',
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
      })
      const userProgressRow = {
        ...linked,
        precomputed_opening_payload_hash: null,
      }
      const supabase = createSupabase(storageApi, userProgressRow)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.text).toBe('Welcome back.')
      expect(result.source).toBe('precomputed')
      expect(result.audioUrl).toBeNull()
      expect(storageApi.createSignedUrl).not.toHaveBeenCalled()
    })

    it('suppresses Tier 1 when payload hash does not match text (consistency guard)', async () => {
      const storageApi = createStorageApi({ signedUrl: SIGNED_URL })
      const linked = createLinkedPrecomputedRow({
        text: 'Welcome back.',
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
      })
      const userProgressRow = {
        ...linked,
        precomputed_opening_payload_hash: 'deadbeef',
        precomputed_opening_word_timings: {
          ...linked.precomputed_opening_word_timings,
          payloadHash: 'deadbeef',
        },
      }
      const supabase = createSupabase(storageApi, userProgressRow)

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.text).toBe('Welcome back.')
      expect(result.source).toBe('precomputed')
      expect(result.audioUrl).toBeNull()
      expect(storageApi.createSignedUrl).not.toHaveBeenCalled()
    })

    it('returns all null when user_progress DB query fails', async () => {
      const storageApi = createStorageApi()
      const supabase = createSupabase(storageApi, null, { message: 'DB error' })

      const result = await handleOpeningRequest({
        user: TEST_USER,
        illusionKey: 'stress_relief',
        illusionLayer: 'emotional',
        sessionType: 'core',
        supabase,
        cacheState,
      })

      expect(result.text).toBeNull()
      expect(result.source).toBeNull()
      expect(result.audioUrl).toBeNull()
    })
  })
})
