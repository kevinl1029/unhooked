/**
 * Unit tests for precomputeOpeningText audio extension (v2)
 *
 * Covers audio generation, text-first ordering (REQ-20), previous audio
 * cleanup, upload failure isolation, audio metadata correctness, and stale
 * ref clearing on failure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { precomputeOpeningText } from '~/server/utils/session/precompute-opening'

// ---------------------------------------------------------------------------
// Hoisted mocks — must be defined before vi.mock() factory functions run
// ---------------------------------------------------------------------------

const { mockChat, mockSynthesize } = vi.hoisted(() => ({
  mockChat: vi.fn(),
  mockSynthesize: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Module mocks — replace all external dependencies
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TTS_RESULT = {
  audioBuffer: new ArrayBuffer(8),
  contentType: 'audio/wav',
  wordTimings: [{ word: 'Hey', startMs: 0, endMs: 150 }],
  timingSource: 'estimated' as const,
  estimatedDurationMs: 5000,
}

const LLM_RESPONSE = { content: 'Welcome back! How are you feeling today?' }

const TEST_USER_ID = 'user-test-123'
const TEST_ILLUSION_KEY = 'stress_relief' as const
const TEST_NEXT_LAYER = 'emotional' as const

// ---------------------------------------------------------------------------
// Mock Supabase factory
// ---------------------------------------------------------------------------

interface MockSupabaseOpts {
  existingAudioPath?: string | null
  textUpdateError?: { message: string } | null
  removeError?: { message: string } | null
  uploadError?: { message: string } | null
}

/**
 * Creates a chainable Supabase mock that tracks all DB and Storage calls in
 * insertion order via `_callOrder`, `_updateCalls`, and `_storageCalls`.
 */
function createMockSupabase(opts: MockSupabaseOpts = {}) {
  // Shared tracking arrays — all from() calls write to the same arrays so
  // ordering tests work correctly across multiple from() invocations.
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
            const isTextUpdate = 'precomputed_opening_text' in data
            const label = isTextUpdate ? 'text-update' : 'audio-update'
            callOrder.push(label)
            updateCalls.push({ _label: label, ...data })
            const err = isTextUpdate ? (opts.textUpdateError ?? null) : null
            return { eq: () => Promise.resolve({ error: err }) }
          },
        }
      }

      // Fallback for any other table
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
          return Promise.resolve({ data: null, error: opts.removeError ?? null })
        },
        upload: (...args: unknown[]) => {
          callOrder.push('storage-upload')
          storageCalls.push({ type: 'upload', args })
          return Promise.resolve({ data: null, error: opts.uploadError ?? null })
        },
      }),
    },

    // Test inspection helpers
    _callOrder: callOrder,
    _updateCalls: updateCalls,
    _storageCalls: storageCalls,
  }

  return supabase
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('precomputeOpeningText — audio generation (v2 extension)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockChat.mockResolvedValue(LLM_RESPONSE)
    mockSynthesize.mockResolvedValue(DEFAULT_TTS_RESULT)
  })

  // -------------------------------------------------------------------------
  // Successful audio generation
  // -------------------------------------------------------------------------

  describe('Successful audio generation', () => {
    it('uploads audio to l2l3/{userId}/opening.wav for audio/wav content type', async () => {
      const supabase = createMockSupabase()

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const uploadCall = supabase._storageCalls.find((c) => c.type === 'upload')
      expect(uploadCall).toBeDefined()
      expect(uploadCall?.args[0]).toBe(`l2l3/${TEST_USER_ID}/opening.wav`)
    })

    it('uploads audio with upsert: true', async () => {
      const supabase = createMockSupabase()

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const uploadCall = supabase._storageCalls.find((c) => c.type === 'upload')
      expect((uploadCall?.args[2] as Record<string, unknown>)?.upsert).toBe(true)
    })

    it('uses .mp3 extension for audio/mpeg content type', async () => {
      mockSynthesize.mockResolvedValue({ ...DEFAULT_TTS_RESULT, contentType: 'audio/mpeg' })
      const supabase = createMockSupabase()

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const uploadCall = supabase._storageCalls.find((c) => c.type === 'upload')
      expect(uploadCall?.args[0]).toBe(`l2l3/${TEST_USER_ID}/opening.mp3`)
    })

    it('stores audio metadata in user_progress with timings, timingSource, contentType', async () => {
      const supabase = createMockSupabase()

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const audioMetadataUpdate = supabase._updateCalls.find(
        (u) =>
          u._label === 'audio-update' &&
          u.precomputed_opening_audio_path !== null,
      )
      expect(audioMetadataUpdate).toBeDefined()
      expect(audioMetadataUpdate?.precomputed_opening_audio_path).toBe(
        `l2l3/${TEST_USER_ID}/opening.wav`,
      )
      expect(audioMetadataUpdate?.precomputed_opening_word_timings).toEqual({
        timings: DEFAULT_TTS_RESULT.wordTimings,
        timingSource: DEFAULT_TTS_RESULT.timingSource,
        contentType: DEFAULT_TTS_RESULT.contentType,
      })
    })
  })

  // -------------------------------------------------------------------------
  // Text stored before audio attempt (REQ-20)
  // -------------------------------------------------------------------------

  describe('Text stored before audio attempt (REQ-20)', () => {
    it('text update occurs before storage upload in call order', async () => {
      const supabase = createMockSupabase()

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const textIdx = supabase._callOrder.indexOf('text-update')
      const uploadIdx = supabase._callOrder.indexOf('storage-upload')
      expect(textIdx).toBeGreaterThanOrEqual(0)
      expect(uploadIdx).toBeGreaterThanOrEqual(0)
      expect(textIdx).toBeLessThan(uploadIdx)
    })

    it('text is saved in user_progress when TTS fails', async () => {
      mockSynthesize.mockRejectedValue(new Error('TTS service unavailable'))
      const supabase = createMockSupabase()

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const textUpdate = supabase._updateCalls.find((u) => u._label === 'text-update')
      expect(textUpdate).toBeDefined()
      expect(textUpdate?.precomputed_opening_text).toBe(LLM_RESPONSE.content)
    })

    it('audio fields are null in user_progress when TTS fails', async () => {
      mockSynthesize.mockRejectedValue(new Error('TTS failed'))
      const supabase = createMockSupabase()

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const nullUpdate = supabase._updateCalls.find(
        (u) =>
          u._label === 'audio-update' &&
          u.precomputed_opening_audio_path === null &&
          u.precomputed_opening_word_timings === null,
      )
      expect(nullUpdate).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Previous audio cleanup before upload
  // -------------------------------------------------------------------------

  describe('Previous audio cleanup before upload', () => {
    it('calls storage.remove with the existing audio path', async () => {
      const existingPath = `l2l3/${TEST_USER_ID}/opening.wav`
      const supabase = createMockSupabase({ existingAudioPath: existingPath })

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const removeCall = supabase._storageCalls.find((c) => c.type === 'remove')
      expect(removeCall).toBeDefined()
      expect(removeCall?.args[0]).toEqual([existingPath])
    })

    it('remove is called before upload in call order', async () => {
      const supabase = createMockSupabase({
        existingAudioPath: `l2l3/${TEST_USER_ID}/opening.wav`,
      })

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const removeIdx = supabase._callOrder.indexOf('storage-remove')
      const uploadIdx = supabase._callOrder.indexOf('storage-upload')
      expect(removeIdx).toBeGreaterThanOrEqual(0)
      expect(uploadIdx).toBeGreaterThanOrEqual(0)
      expect(removeIdx).toBeLessThan(uploadIdx)
    })

    it('skips deletion when no existing audio path in user_progress', async () => {
      const supabase = createMockSupabase({ existingAudioPath: null })

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      expect(supabase._storageCalls.find((c) => c.type === 'remove')).toBeUndefined()
    })
  })

  // -------------------------------------------------------------------------
  // Audio upload failure
  // -------------------------------------------------------------------------

  describe('Audio upload failure', () => {
    it('text is still saved when audio upload fails', async () => {
      const supabase = createMockSupabase({ uploadError: { message: 'Storage quota exceeded' } })

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const textUpdate = supabase._updateCalls.find((u) => u._label === 'text-update')
      expect(textUpdate).toBeDefined()
      expect(textUpdate?.precomputed_opening_text).toBe(LLM_RESPONSE.content)
    })

    it('audio fields set to null in user_progress when upload fails', async () => {
      const supabase = createMockSupabase({ uploadError: { message: 'Upload failed' } })

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const nullUpdate = supabase._updateCalls.find(
        (u) =>
          u._label === 'audio-update' &&
          u.precomputed_opening_audio_path === null &&
          u.precomputed_opening_word_timings === null,
      )
      expect(nullUpdate).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Stale ref clearing on any audio failure
  // -------------------------------------------------------------------------

  describe('Stale audio ref clearing', () => {
    it('clears both audio fields to null when audio generation fails', async () => {
      mockSynthesize.mockRejectedValue(new Error('Synthesis error'))
      const supabase = createMockSupabase()

      await precomputeOpeningText({
        supabase: supabase as any,
        userId: TEST_USER_ID,
        illusionKey: TEST_ILLUSION_KEY,
        nextLayer: TEST_NEXT_LAYER,
      })

      const nullUpdate = supabase._updateCalls.find(
        (u) =>
          u._label === 'audio-update' &&
          u.precomputed_opening_audio_path === null &&
          u.precomputed_opening_word_timings === null,
      )
      expect(nullUpdate).toBeDefined()
    })
  })
})
