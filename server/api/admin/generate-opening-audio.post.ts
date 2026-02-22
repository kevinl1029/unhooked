import { serverSupabaseServiceRole } from '#supabase/server'
import { ILLUSION_OPENING_MESSAGES } from '~/server/utils/prompts'
import { getTTSProviderFromConfig } from '~/server/utils/tts'
import type { IllusionKey } from '~/server/utils/llm/task-types'

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
  timings: Array<{ word: string; startMs: number; endMs: number }>
  timingSource: 'actual' | 'estimated'
}

type Manifest = Partial<Record<IllusionKey, ManifestEntry>>

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Validate admin secret
  const adminSecret = getHeader(event, 'x-admin-secret')
  if (!adminSecret || adminSecret !== config.adminApiSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const ttsProvider = getTTSProviderFromConfig()

  // Determine target keys
  const body = await readBody(event).catch(() => ({}))
  const illusionKey: IllusionKey | undefined = body?.illusionKey

  let targetKeys: IllusionKey[]

  if (illusionKey !== undefined) {
    if (!(illusionKey in ILLUSION_OPENING_MESSAGES)) {
      throw createError({
        statusCode: 400,
        message: `Invalid illusionKey: "${illusionKey}". Must be one of: ${Object.keys(ILLUSION_OPENING_MESSAGES).join(', ')}`,
      })
    }
    targetKeys = [illusionKey]
  } else {
    targetKeys = Object.keys(ILLUSION_OPENING_MESSAGES) as IllusionKey[]
  }

  console.log(`[admin-audio] Generating L1 audio`, { keys: targetKeys, provider: config.ttsProvider })

  const results: GenerateResult[] = []
  const newManifestEntries: Partial<Record<IllusionKey, ManifestEntry>> = {}

  for (const key of targetKeys) {
    const text = ILLUSION_OPENING_MESSAGES[key]

    try {
      const ttsResult = await ttsProvider.synthesize({ text })

      const ext = ttsResult.contentType === 'audio/mpeg' ? '.mp3' : '.wav'
      const audioPath = `l1/${key}${ext}`

      const { error: uploadError } = await supabase.storage
        .from('opening-audio')
        .upload(audioPath, ttsResult.audioBuffer, {
          contentType: ttsResult.contentType,
          upsert: true,
        })

      if (uploadError) {
        throw uploadError
      }

      newManifestEntries[key] = {
        audioPath,
        contentType: ttsResult.contentType,
        timings: ttsResult.wordTimings,
        timingSource: ttsResult.timingSource,
      }

      console.log(`[admin-audio] Generated`, {
        illusionKey: key,
        audioPath,
        contentType: ttsResult.contentType,
        durationMs: ttsResult.estimatedDurationMs,
      })

      results.push({
        illusionKey: key,
        success: true,
        audioPath,
        contentType: ttsResult.contentType,
        durationMs: ttsResult.estimatedDurationMs,
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error(`[admin-audio] Failed`, { illusionKey: key, error: errorMessage })
      results.push({ illusionKey: key, success: false, error: errorMessage })
    }
  }

  // Load existing manifest and merge with new results
  let existingManifest: Manifest = {}
  const { data: manifestData, error: manifestDownloadError } = await supabase.storage
    .from('opening-audio')
    .download('l1/manifest.json')

  if (!manifestDownloadError && manifestData) {
    try {
      const manifestText = await manifestData.text()
      existingManifest = JSON.parse(manifestText) as Manifest
    } catch {
      // If manifest is corrupt, start fresh
    }
  }

  // Merge: existing entries preserved, new successful entries overwrite
  const mergedManifest: Manifest = { ...existingManifest, ...newManifestEntries }

  const manifestJson = JSON.stringify(mergedManifest, null, 2)
  const manifestBuffer = new TextEncoder().encode(manifestJson)

  const { error: manifestUploadError } = await supabase.storage
    .from('opening-audio')
    .upload('l1/manifest.json', manifestBuffer, {
      contentType: 'application/json',
      upsert: true,
    })

  const manifestUpdated = !manifestUploadError
  console.log(`[admin-audio] Manifest updated`, { keyCount: Object.keys(mergedManifest).length })

  return { results, manifestUpdated }
})
