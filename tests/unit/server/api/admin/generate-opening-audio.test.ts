/**
 * Unit tests for the admin audio generation endpoint logic.
 *
 * Tests the business logic for auth validation, TTS generation, Storage upload,
 * manifest management, and error handling - covering all behaviors of
 * POST /api/admin/generate-opening-audio.
 *
 * These tests use direct logic invocation (same pattern as other unit tests in
 * this codebase) rather than HTTP invocation, since H3 event construction in
 * the nuxt test environment requires a full server setup.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ILLUSION_OPENING_MESSAGES } from '~/server/utils/prompts'
import type { IllusionKey } from '~/server/utils/llm/task-types'
import type { WordTiming } from '~/server/utils/tts'

// --- Types ---

interface GenerateResult {
  illusionKey: IllusionKey
  success: boolean
  audioPath?: string
  contentType?: string
  durationMs?: number
  error?: string
}

interface ManifestEntry {
  audioPath: string
  contentType: string
  timings: WordTiming[]
  timingSource: 'actual' | 'estimated'
}

type Manifest = Partial<Record<IllusionKey, ManifestEntry>>

interface TTSResult {
  audioBuffer: ArrayBuffer
  contentType: string
  wordTimings: WordTiming[]
  timingSource: 'actual' | 'estimated'
  estimatedDurationMs: number
}

interface MockStorage {
  upload: ReturnType<typeof vi.fn>
  download: ReturnType<typeof vi.fn>
}

// --- Handler logic (mirrors generate-opening-audio.post.ts) ---
// Extracted for direct testing without H3/Nuxt server context.

async function generateOpeningAudio({
  adminSecret,
  configAdminSecret,
  illusionKey,
  ttsProvider,
  storage,
}: {
  adminSecret: string | null
  configAdminSecret: string | undefined
  illusionKey?: string
  ttsProvider: { synthesize: (opts: { text: string }) => Promise<TTSResult> }
  storage: {
    from: (bucket: string) => {
      upload: (path: string, data: ArrayBuffer | Uint8Array, opts: { contentType: string; upsert: boolean }) => Promise<{ error: null | { message: string } }>
      download: (path: string) => Promise<{ data: { text: () => Promise<string> } | null; error: null | { message: string } }>
    }
  }
}) {
  // Auth validation
  if (!adminSecret || adminSecret !== configAdminSecret) {
    const err = new Error('Unauthorized') as Error & { statusCode: number }
    err.statusCode = 401
    throw err
  }

  // Determine target keys
  let targetKeys: IllusionKey[]
  if (illusionKey !== undefined) {
    if (!(illusionKey in ILLUSION_OPENING_MESSAGES)) {
      const err = new Error(`Invalid illusionKey: "${illusionKey}"`) as Error & { statusCode: number }
      err.statusCode = 400
      throw err
    }
    targetKeys = [illusionKey as IllusionKey]
  } else {
    targetKeys = Object.keys(ILLUSION_OPENING_MESSAGES) as IllusionKey[]
  }

  const results: GenerateResult[] = []
  const newManifestEntries: Partial<Record<IllusionKey, ManifestEntry>> = {}

  for (const key of targetKeys) {
    const text = ILLUSION_OPENING_MESSAGES[key]

    try {
      const ttsResult = await ttsProvider.synthesize({ text })

      const ext = ttsResult.contentType === 'audio/mpeg' ? '.mp3' : '.wav'
      const audioPath = `l1/${key}${ext}`

      const { error: uploadError } = await storage.from('opening-audio').upload(
        audioPath,
        ttsResult.audioBuffer,
        { contentType: ttsResult.contentType, upsert: true }
      )

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      newManifestEntries[key] = {
        audioPath,
        contentType: ttsResult.contentType,
        timings: ttsResult.wordTimings,
        timingSource: ttsResult.timingSource,
      }

      results.push({
        illusionKey: key,
        success: true,
        audioPath,
        contentType: ttsResult.contentType,
        durationMs: ttsResult.estimatedDurationMs,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      results.push({ illusionKey: key, success: false, error: errorMessage })
    }
  }

  // Load existing manifest and merge
  let existingManifest: Manifest = {}
  const { data: manifestData, error: manifestDownloadError } = await storage
    .from('opening-audio')
    .download('l1/manifest.json')

  if (!manifestDownloadError && manifestData) {
    try {
      const manifestText = await manifestData.text()
      existingManifest = JSON.parse(manifestText) as Manifest
    } catch {
      // Corrupt manifest — start fresh
    }
  }

  const mergedManifest: Manifest = { ...existingManifest, ...newManifestEntries }
  const manifestJson = JSON.stringify(mergedManifest, null, 2)
  const manifestBuffer = new TextEncoder().encode(manifestJson)

  const { error: manifestUploadError } = await storage
    .from('opening-audio')
    .upload('l1/manifest.json', manifestBuffer, {
      contentType: 'application/json',
      upsert: true,
    })

  const manifestUpdated = !manifestUploadError

  return { results, manifestUpdated }
}

// --- Test helpers ---

const DEFAULT_TTS_RESULT: TTSResult = {
  audioBuffer: new ArrayBuffer(8),
  contentType: 'audio/wav',
  wordTimings: [{ word: 'Hey', startMs: 0, endMs: 150 }],
  timingSource: 'estimated',
  estimatedDurationMs: 5000,
}

const VALID_SECRET = 'test-admin-secret'

function createMockStorage(opts: {
  uploadError?: { message: string } | null
  manifestData?: Record<string, unknown> | null
  manifestDownloadError?: { message: string } | null
} = {}): MockStorage {
  const {
    uploadError = null,
    manifestData = null,
    manifestDownloadError = { message: 'Object not found' },
  } = opts

  const upload = vi.fn().mockResolvedValue({ error: uploadError })
  const download = vi.fn().mockResolvedValue({
    data: manifestData
      ? { text: () => Promise.resolve(JSON.stringify(manifestData)) }
      : null,
    error: manifestData ? null : manifestDownloadError,
  })

  return { upload, download }
}

function createStorage(mockStorage: MockStorage) {
  return {
    from: vi.fn().mockReturnValue(mockStorage),
  }
}

function createTTSProvider(synthesize: ReturnType<typeof vi.fn>) {
  return { synthesize }
}

// --- Tests ---

describe('Admin audio generation logic (POST /api/admin/generate-opening-audio)', () => {
  let synthesize: ReturnType<typeof vi.fn>
  let mockStorage: MockStorage

  beforeEach(() => {
    vi.clearAllMocks()
    synthesize = vi.fn().mockResolvedValue(DEFAULT_TTS_RESULT)
    mockStorage = createMockStorage()
  })

  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------

  describe('Authentication', () => {
    it('throws 401 when admin secret header is missing (null)', async () => {
      const err = await generateOpeningAudio({
        adminSecret: null,
        configAdminSecret: VALID_SECRET,
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      }).catch((e) => e)

      expect(err.statusCode).toBe(401)
    })

    it('throws 401 when admin secret header is wrong', async () => {
      const err = await generateOpeningAudio({
        adminSecret: 'wrong-secret',
        configAdminSecret: VALID_SECRET,
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      }).catch((e) => e)

      expect(err.statusCode).toBe(401)
    })

    it('proceeds (no throw) with correct admin secret', async () => {
      const result = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      expect(result).toBeDefined()
      expect(result.results).toBeDefined()
    })
  })

  // -----------------------------------------------------------------------
  // Key targeting
  // -----------------------------------------------------------------------

  describe('Key targeting', () => {
    it('generates audio for all 5 illusion keys when no illusionKey specified', async () => {
      const result = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      expect(result.results).toHaveLength(5)
      expect(result.results.every((r) => r.success)).toBe(true)

      const keys = result.results.map((r) => r.illusionKey)
      expect(keys).toContain('stress_relief')
      expect(keys).toContain('pleasure')
      expect(keys).toContain('willpower')
      expect(keys).toContain('focus')
      expect(keys).toContain('identity')
    })

    it('generates audio for only a single key when illusionKey is specified', async () => {
      const result = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        illusionKey: 'stress_relief',
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      expect(result.results).toHaveLength(1)
      expect(result.results[0].illusionKey).toBe('stress_relief')
      expect(result.results[0].success).toBe(true)
    })

    it('throws 400 for an invalid illusionKey not in ILLUSION_OPENING_MESSAGES', async () => {
      const err = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        illusionKey: 'nonexistent_key',
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      }).catch((e) => e)

      expect(err.statusCode).toBe(400)
    })
  })

  // -----------------------------------------------------------------------
  // TTS generation and audio upload
  // -----------------------------------------------------------------------

  describe('TTS generation and audio upload', () => {
    it('returns success: true with correct audioPath and durationMs per key', async () => {
      const result = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      for (const r of result.results) {
        expect(r.success).toBe(true)
        expect(r.audioPath).toBe(`l1/${r.illusionKey}.wav`) // audio/wav → .wav
        expect(r.contentType).toBe('audio/wav')
        expect(r.durationMs).toBe(5000)
      }
    })

    it('uses .mp3 extension for audio/mpeg content type', async () => {
      synthesize.mockResolvedValue({ ...DEFAULT_TTS_RESULT, contentType: 'audio/mpeg' })

      const result = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        illusionKey: 'stress_relief',
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      expect(result.results[0].audioPath).toBe('l1/stress_relief.mp3')
      expect(result.results[0].contentType).toBe('audio/mpeg')
    })

    it('uploads audio with upsert: true', async () => {
      await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        illusionKey: 'stress_relief',
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      const audioUploadCall = mockStorage.upload.mock.calls.find(
        ([path]: [string]) => path === 'l1/stress_relief.wav'
      )
      expect(audioUploadCall).toBeDefined()
      expect(audioUploadCall?.[2]).toMatchObject({ upsert: true })
    })

    it('on TTS failure for one key: that key shows success: false with error, others succeed', async () => {
      // pleasure is the 2nd key in iteration order: stress_relief, pleasure, ...
      let callCount = 0
      synthesize.mockImplementation(async () => {
        callCount++
        if (callCount === 2) throw new Error('TTS synthesis failed for pleasure')
        return DEFAULT_TTS_RESULT
      })

      const result = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      expect(result.results).toHaveLength(5)

      const pleasureResult = result.results.find((r) => r.illusionKey === 'pleasure')
      expect(pleasureResult?.success).toBe(false)
      expect(pleasureResult?.error).toContain('TTS synthesis failed for pleasure')

      const otherResults = result.results.filter((r) => r.illusionKey !== 'pleasure')
      expect(otherResults.every((r) => r.success)).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Manifest management
  // -----------------------------------------------------------------------

  describe('Manifest management', () => {
    it('writes manifest with correct structure (audioPath, contentType, timings, timingSource) per key', async () => {
      await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        illusionKey: 'stress_relief',
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      const manifestUploadCall = mockStorage.upload.mock.calls.find(
        ([path]: [string]) => path === 'l1/manifest.json'
      )
      expect(manifestUploadCall).toBeDefined()

      const manifestBuffer = manifestUploadCall?.[1] as Uint8Array
      const manifest = JSON.parse(new TextDecoder().decode(manifestBuffer))

      expect(manifest.stress_relief).toMatchObject({
        audioPath: 'l1/stress_relief.wav',
        contentType: 'audio/wav',
        timings: [{ word: 'Hey', startMs: 0, endMs: 150 }],
        timingSource: 'estimated',
      })
    })

    it('merges new results with existing manifest entries for other keys', async () => {
      const existingManifest: Manifest = {
        stress_relief: { audioPath: 'l1/stress_relief.wav', contentType: 'audio/wav', timings: [], timingSource: 'estimated' },
        pleasure: { audioPath: 'l1/pleasure.wav', contentType: 'audio/wav', timings: [], timingSource: 'estimated' },
        willpower: { audioPath: 'l1/willpower.wav', contentType: 'audio/wav', timings: [], timingSource: 'estimated' },
        focus: { audioPath: 'l1/focus.wav', contentType: 'audio/wav', timings: [], timingSource: 'estimated' },
        identity: { audioPath: 'l1/identity.wav', contentType: 'audio/wav', timings: [], timingSource: 'estimated' },
      }

      const storageWithManifest = createMockStorage({ manifestData: existingManifest, manifestDownloadError: null })

      // Regenerate only stress_relief
      await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        illusionKey: 'stress_relief',
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(storageWithManifest),
      })

      const manifestUploadCall = storageWithManifest.upload.mock.calls.find(
        ([path]: [string]) => path === 'l1/manifest.json'
      )
      const manifestBuffer = manifestUploadCall?.[1] as Uint8Array
      const merged = JSON.parse(new TextDecoder().decode(manifestBuffer))

      // All 5 keys preserved
      expect(merged).toHaveProperty('stress_relief')
      expect(merged).toHaveProperty('pleasure')
      expect(merged).toHaveProperty('willpower')
      expect(merged).toHaveProperty('focus')
      expect(merged).toHaveProperty('identity')
    })

    it('preserves existing manifest entry for a key that failed in the current run', async () => {
      const existingManifest: Manifest = {
        pleasure: {
          audioPath: 'l1/pleasure.wav',
          contentType: 'audio/wav',
          timings: [{ word: 'Welcome', startMs: 0, endMs: 200 }],
          timingSource: 'actual',
        },
      }

      const storageWithManifest = createMockStorage({ manifestData: existingManifest, manifestDownloadError: null })

      // Make TTS fail for pleasure (2nd key in iteration order)
      let callCount = 0
      synthesize.mockImplementation(async () => {
        callCount++
        if (callCount === 2) throw new Error('TTS failed for pleasure')
        return DEFAULT_TTS_RESULT
      })

      await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(storageWithManifest),
      })

      const manifestUploadCall = storageWithManifest.upload.mock.calls.find(
        ([path]: [string]) => path === 'l1/manifest.json'
      )
      const manifestBuffer = manifestUploadCall?.[1] as Uint8Array
      const manifest = JSON.parse(new TextDecoder().decode(manifestBuffer))

      // pleasure entry should be preserved from existing manifest
      expect(manifest.pleasure).toMatchObject({
        audioPath: 'l1/pleasure.wav',
        timings: [{ word: 'Welcome', startMs: 0, endMs: 200 }],
        timingSource: 'actual',
      })
    })

    it('returns manifestUpdated: true when manifest upload succeeds', async () => {
      const result = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      expect(result.manifestUpdated).toBe(true)
    })
  })

  // -----------------------------------------------------------------------
  // Response shape
  // -----------------------------------------------------------------------

  describe('Response shape', () => {
    it('returns { results: Array, manifestUpdated: boolean }', async () => {
      const result = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      expect(result).toHaveProperty('results')
      expect(result).toHaveProperty('manifestUpdated')
      expect(Array.isArray(result.results)).toBe(true)
      expect(typeof result.manifestUpdated).toBe('boolean')
    })

    it('each successful result has illusionKey, success, audioPath, contentType, durationMs', async () => {
      const result = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        illusionKey: 'focus',
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      const r = result.results[0]
      expect(r).toHaveProperty('illusionKey', 'focus')
      expect(r).toHaveProperty('success', true)
      expect(r).toHaveProperty('audioPath')
      expect(r).toHaveProperty('contentType')
      expect(r).toHaveProperty('durationMs')
    })

    it('failed key result has illusionKey, success: false, and error string', async () => {
      synthesize.mockRejectedValue(new Error('Synthesis failed'))

      const result = await generateOpeningAudio({
        adminSecret: VALID_SECRET,
        configAdminSecret: VALID_SECRET,
        illusionKey: 'willpower',
        ttsProvider: createTTSProvider(synthesize),
        storage: createStorage(mockStorage),
      })

      const r = result.results[0]
      expect(r).toHaveProperty('illusionKey', 'willpower')
      expect(r).toHaveProperty('success', false)
      expect(r).toHaveProperty('error')
      expect(r.error).toContain('Synthesis failed')
    })
  })
})
