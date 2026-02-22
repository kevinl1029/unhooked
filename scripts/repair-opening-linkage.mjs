#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

function argValue(flag) {
  const idx = process.argv.indexOf(flag)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

function hasFlag(flag) {
  return process.argv.includes(flag)
}

function canonicalizeText(text) {
  return String(text ?? '').trim().replace(/\s+/g, ' ')
}

function buildPayloadHash({ text, illusionKey, illusionLayer, provider, voice, providerVersion }) {
  const canonical = {
    version: 'v1',
    text: canonicalizeText(text),
    illusionKey,
    illusionLayer,
    provider,
    voice,
    providerVersion: providerVersion ?? null,
  }
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}

function getNextLayerFromCurrent(currentLayer) {
  if (currentLayer === 'intellectual') return 'emotional'
  if (currentLayer === 'emotional') return 'identity'
  return null
}

function getIllusionKeyFromCurrentIndex(idx) {
  const map = {
    1: 'stress_relief',
    2: 'pleasure',
    3: 'identity',
    4: 'willpower',
    5: 'focus',
  }
  return map[idx] ?? null
}

function getInvalidReason(row) {
  const text = row.precomputed_opening_text
  const audioPath = row.precomputed_opening_audio_path
  const wordMeta = row.precomputed_opening_word_timings
  const rowHash = row.precomputed_opening_payload_hash

  if (!text) return null
  if (!audioPath && !wordMeta && !rowHash) return null
  if (!audioPath) return 'missing_audio_path'
  if (!wordMeta) return 'missing_word_timings'
  if (!rowHash) return 'missing_payload_hash'
  if (!wordMeta.payloadHash) return 'missing_word_timings_payload_hash'
  if (wordMeta.payloadHash !== rowHash) return 'payload_hash_mismatch'
  if (!wordMeta.provider || !wordMeta.voice) return 'missing_tts_metadata'

  const illusionKey = getIllusionKeyFromCurrentIndex(row.current_illusion)
  const illusionLayer = getNextLayerFromCurrent(row.current_layer)
  if (!illusionKey || !illusionLayer) return 'missing_context_for_recompute'

  const expectedHash = buildPayloadHash({
    text,
    illusionKey,
    illusionLayer,
    provider: wordMeta.provider,
    voice: wordMeta.voice,
    providerVersion: wordMeta.providerVersion,
  })
  if (expectedHash !== rowHash) return 'payload_hash_recompute_mismatch'
  if (!String(audioPath).includes(rowHash)) return 'audio_path_payload_hash_mismatch'
  return null
}

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !serviceKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY')
    process.exit(1)
  }

  const apply = hasFlag('--apply')
  const limit = Number(argValue('--limit') ?? 500)
  const userId = argValue('--user-id')
  const supabase = createClient(supabaseUrl, serviceKey)

  let query = supabase
    .from('user_progress')
    .select('id,user_id,current_illusion,current_layer,precomputed_opening_text,precomputed_opening_audio_path,precomputed_opening_word_timings,precomputed_opening_payload_hash')
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query
  if (error) {
    console.error('Query failed:', error.message)
    process.exit(1)
  }

  const invalid = []
  for (const row of data ?? []) {
    const reason = getInvalidReason(row)
    if (reason) invalid.push({ row, reason })
  }

  if (!invalid.length) {
    console.log('No invalid opening linkage rows found.')
    return
  }

  console.log(`Found ${invalid.length} invalid row(s).`)
  for (const item of invalid.slice(0, 50)) {
    console.log(JSON.stringify({
      userId: item.row.user_id,
      progressId: item.row.id,
      reason: item.reason,
      audioPath: item.row.precomputed_opening_audio_path,
    }))
  }

  if (!apply) {
    console.log('Dry run complete. Re-run with --apply to clear invalid Tier 1 metadata.')
    return
  }

  let repaired = 0
  for (const item of invalid) {
    const { error: updateError } = await supabase
      .from('user_progress')
      .update({
        precomputed_opening_audio_path: null,
        precomputed_opening_word_timings: null,
        precomputed_opening_payload_hash: null,
      })
      .eq('id', item.row.id)

    if (updateError) {
      console.error('Failed to repair row', item.row.id, updateError.message)
      continue
    }
    repaired += 1
  }

  console.log(`Repair complete. Cleared Tier 1 metadata for ${repaired}/${invalid.length} row(s).`)
}

main().catch((err) => {
  console.error('Unexpected error:', err instanceof Error ? err.message : String(err))
  process.exit(1)
})
