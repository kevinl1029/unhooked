/**
 * Unit tests for precomputeOpeningText consistency hardening.
 *
 * Verifies atomic publish semantics for Tier 1 metadata and hash linkage.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { precomputeOpeningText } from '~/server/utils/session/precompute-opening'
import { buildOpeningPayloadHash } from '~/server/utils/session/opening-payload-hash'

const { mockChat, mockSynthesize } = vi.hoisted(() => ({
  mockChat: vi.fn(),
  mockSynthesize: vi.fn(),
}))

vi.mock('~/server/utils/personalization/context-builder', () => ({
  buildSessionContext: vi.fn().mockResolvedValue('session context'),
  formatContextForPrompt: vi.fn().mockReturnValue('formatted context'),
}))

vi.mock('~/server/utils/personalization/cross-layer-context', () => ({
  buildCrossLayerContext: vi.fn().mockResolvedValue({}),
  formatCrossLayerContext: vi.fn().mockReturnValue('cross layer context'),
}))

vi.mock('~/server/utils/session/bridge', () => ({
  buildBridgeContext: vi.fn().mockReturnValue('bridge context'),
}))

vi.mock('~/server/utils/prompts', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('system prompt'),
}))

vi.mock('~/server/utils/llm', () => ({
  getModelRouter: vi.fn().mockReturnValue({ chat: mockChat }),
  getDefaultModel: vi.fn().mockReturnValue('test-model'),
}))

vi.mock('~/server/utils/tts', () => ({
  getTTSProviderFromConfig: vi.fn().mockReturnValue({ synthesize: mockSynthesize }),
}))

const DEFAULT_TTS_RESULT = {
  audioBuffer: new ArrayBuffer(8),
  contentType: 'audio/wav',
  wordTimings: [{ word: 'Hey', startMs: 0, endMs: 150 }],
  timingSource: 'estimated' as const,
  estimatedDurationMs: 5000,
  provider: 'groq' as const,
  voice: 'luna',
}

const LLM_RESPONSE = { content: 'Welcome back! How are you feeling today?' }

const TEST_USER_ID = 'user-test-123'
const TEST_ILLUSION_KEY = 'stress_relief' as const
const TEST_NEXT_LAYER = 'emotional' as const

interface MockSupabaseOpts {
  existingAudioPath?: string | null
  uploadError?: { message: string } | null
  publishError?: { message: string } | null
}

function createMockSupabase(opts: MockSupabaseOpts = {}) {
  const callOrder: string[] = []
  const updateCalls: Record<string, unknown>[] = []
  const storageCalls: Array<{ type: string; args: unknown[] }> = []

  const supabase = {
    from: (table: string) => {
      if (table === 'user_intake') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: null }),
            }),
          }),
        }
      }

      if (table === 'user_progress') {
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    precomputed_opening_audio_path: opts.existingAudioPath ?? null,
                  },
                  error: null,
                }),
            }),
          }),
          update: (data: Record<string, unknown>) => {
            callOrder.push('publish-update')
            updateCalls.push(data)
            return { eq: () => Promise.resolve({ error: opts.publishError ?? null }) }
          },
        }
      }

      return {
        select: () => ({
          eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
        }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }
    },

    storage: {
      from: (_bucket: string) => ({
        remove: (...args: unknown[]) => {
          callOrder.push('storage-remove')
          storageCalls.push({ type: 'remove', args })
          return Promise.resolve({ data: null, error: null })
        },
        upload: (...args: unknown[]) => {
          callOrder.push('storage-upload')
          storageCalls.push({ type: 'upload', args })
          return Promise.resolve({ data: null, error: opts.uploadError ?? null })
        },
      }),
    },

    _callOrder: callOrder,
    _updateCalls: updateCalls,
    _storageCalls: storageCalls,
  }

  return supabase
}

describe('precomputeOpeningText — consistency hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChat.mockResolvedValue(LLM_RESPONSE)
    mockSynthesize.mockResolvedValue(DEFAULT_TTS_RESULT)
  })

  it('publishes matched text/audio/hash tuple in a single DB update', async () => {
    const supabase = createMockSupabase()

    await precomputeOpeningText({
      supabase: supabase as any,
      userId: TEST_USER_ID,
      illusionKey: TEST_ILLUSION_KEY,
      nextLayer: TEST_NEXT_LAYER,
    })

    expect(supabase._updateCalls).toHaveLength(1)

    const publish = supabase._updateCalls[0]
    const hash = buildOpeningPayloadHash({
      text: LLM_RESPONSE.content,
      illusionKey: TEST_ILLUSION_KEY,
      illusionLayer: TEST_NEXT_LAYER,
      provider: DEFAULT_TTS_RESULT.provider,
      voice: DEFAULT_TTS_RESULT.voice,
      providerVersion: `${DEFAULT_TTS_RESULT.provider}:${DEFAULT_TTS_RESULT.timingSource}`,
    })

    expect(publish.precomputed_opening_text).toBe(LLM_RESPONSE.content)
    expect(publish.precomputed_opening_payload_hash).toBe(hash)
    expect(publish.precomputed_opening_audio_path).toContain(hash)
    expect(publish.precomputed_opening_word_timings).toEqual({
      timings: DEFAULT_TTS_RESULT.wordTimings,
      timingSource: DEFAULT_TTS_RESULT.timingSource,
      contentType: DEFAULT_TTS_RESULT.contentType,
      payloadHash: hash,
      provider: DEFAULT_TTS_RESULT.provider,
      voice: DEFAULT_TTS_RESULT.voice,
      providerVersion: `${DEFAULT_TTS_RESULT.provider}:${DEFAULT_TTS_RESULT.timingSource}`,
    })
  })

  it('uploads audio before publish update (atomic publish semantics)', async () => {
    const supabase = createMockSupabase()

    await precomputeOpeningText({
      supabase: supabase as any,
      userId: TEST_USER_ID,
      illusionKey: TEST_ILLUSION_KEY,
      nextLayer: TEST_NEXT_LAYER,
    })

    const uploadIdx = supabase._callOrder.indexOf('storage-upload')
    const publishIdx = supabase._callOrder.indexOf('publish-update')

    expect(uploadIdx).toBeGreaterThanOrEqual(0)
    expect(publishIdx).toBeGreaterThanOrEqual(0)
    expect(uploadIdx).toBeLessThan(publishIdx)
  })

  it('publishes text-only payload with null Tier 1 fields when TTS fails', async () => {
    mockSynthesize.mockRejectedValue(new Error('TTS unavailable'))
    const supabase = createMockSupabase()

    await precomputeOpeningText({
      supabase: supabase as any,
      userId: TEST_USER_ID,
      illusionKey: TEST_ILLUSION_KEY,
      nextLayer: TEST_NEXT_LAYER,
    })

    expect(supabase._updateCalls).toHaveLength(1)
    expect(supabase._updateCalls[0]).toMatchObject({
      precomputed_opening_text: LLM_RESPONSE.content,
      precomputed_opening_audio_path: null,
      precomputed_opening_word_timings: null,
      precomputed_opening_payload_hash: null,
    })
  })

  it('removes newly uploaded file if publish fails', async () => {
    const supabase = createMockSupabase({ publishError: { message: 'write failed' } })

    await precomputeOpeningText({
      supabase: supabase as any,
      userId: TEST_USER_ID,
      illusionKey: TEST_ILLUSION_KEY,
      nextLayer: TEST_NEXT_LAYER,
    })

    const uploadCall = supabase._storageCalls.find((c) => c.type === 'upload')
    const removeCall = supabase._storageCalls.find((c) => c.type === 'remove')

    expect(uploadCall).toBeDefined()
    expect(removeCall).toBeDefined()
    expect(removeCall?.args[0]).toEqual([uploadCall?.args[0]])
  })

  it('cleans up previous audio path after successful publish', async () => {
    const previousPath = `l2l3/${TEST_USER_ID}/old-hash.wav`
    const supabase = createMockSupabase({ existingAudioPath: previousPath })

    await precomputeOpeningText({
      supabase: supabase as any,
      userId: TEST_USER_ID,
      illusionKey: TEST_ILLUSION_KEY,
      nextLayer: TEST_NEXT_LAYER,
    })

    const removeCalls = supabase._storageCalls.filter((c) => c.type === 'remove')
    expect(removeCalls.length).toBeGreaterThan(0)

    const removedPaths = removeCalls.map((c) => c.args[0])
    expect(removedPaths).toContainEqual([previousPath])
  })
})
