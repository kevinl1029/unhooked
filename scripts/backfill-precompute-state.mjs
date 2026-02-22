#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'

const ILLUSION_BY_NUMBER = {
  1: 'stress_relief',
  2: 'pleasure',
  3: 'willpower',
  4: 'focus',
  5: 'identity',
}

const LAYER_ORDER = ['intellectual', 'emotional', 'identity']

function parseArgs(argv) {
  const args = {
    execute: false,
    limit: null,
    userId: null,
    includeReadyMissingTargets: true,
  }

  for (const raw of argv) {
    if (raw === '--execute') args.execute = true
    else if (raw.startsWith('--limit=')) args.limit = Number(raw.split('=')[1])
    else if (raw.startsWith('--user-id=')) args.userId = raw.split('=').slice(1).join('=')
    else if (raw === '--no-ready-target-repair') args.includeReadyMissingTargets = false
    else if (raw === '--help') {
      printUsage()
      process.exit(0)
    }
  }

  if (args.limit !== null && (!Number.isFinite(args.limit) || args.limit < 1)) args.limit = null
  return args
}

function printUsage() {
  console.log(`Usage:
  node scripts/backfill-precompute-state.mjs [options]

Options:
  --execute                       Run writes (default is dry run)
  --limit=<n>                     Only process first n candidate rows
  --user-id=<uuid>                Process one user only
  --no-ready-target-repair        Skip rows where status='ready' but target fields are missing
  --help                          Show this help

What this script repairs:
  1) status is NULL + precomputed text exists
     -> sets status='ready' and target illusion/layer (when derivable)
  2) status='ready' + target fields missing
     -> sets target illusion/layer (when derivable)

Required env vars:
  SUPABASE_URL
  SUPABASE_SECRET_KEY
`)
}

function deriveNextLayer(layerProgress, illusionKey) {
  const completedLayers = Array.isArray(layerProgress?.[illusionKey])
    ? layerProgress[illusionKey]
    : []

  for (const layer of LAYER_ORDER) {
    if (!completedLayers.includes(layer)) {
      return layer
    }
  }
  return null
}

function classifyRow(row, includeReadyMissingTargets) {
  const hasText = !!row.precomputed_opening_text
  if (!hasText) return { actionable: false, reason: 'no_precomputed_text' }

  const status = row.precomputed_opening_status
  const missingTarget = !row.precomputed_opening_target_illusion_key || !row.precomputed_opening_target_layer

  if (status === null) return { actionable: true, reason: 'status_null_with_text' }
  if (includeReadyMissingTargets && status === 'ready' && missingTarget) {
    return { actionable: true, reason: 'ready_missing_target' }
  }
  return { actionable: false, reason: 'status_not_eligible' }
}

function buildTarget(row) {
  const illusionKey = ILLUSION_BY_NUMBER[row.current_illusion] || null
  if (!illusionKey) return null

  const targetLayer = deriveNextLayer(row.layer_progress, illusionKey)
  if (targetLayer !== 'emotional' && targetLayer !== 'identity') {
    return null
  }

  return { illusionKey, targetLayer }
}

async function loadCandidates(supabase, args) {
  let query = supabase
    .from('user_progress')
    .select('id,user_id,current_illusion,layer_progress,precomputed_opening_status,precomputed_opening_target_illusion_key,precomputed_opening_target_layer,precomputed_opening_text,updated_at')
    .not('precomputed_opening_text', 'is', null)
    .order('updated_at', { ascending: false })

  if (args.userId) query = query.eq('user_id', args.userId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to load candidates: ${error.message}`)

  let rows = Array.isArray(data) ? data : []
  rows = rows.filter((row) => {
    const c = classifyRow(row, args.includeReadyMissingTargets)
    return c.actionable
  })
  if (args.limit) rows = rows.slice(0, args.limit)
  return rows
}

async function repairRows(supabase, rows, execute) {
  let updated = 0
  let skippedUndetermined = 0
  let updateErrors = 0

  for (const row of rows) {
    const target = buildTarget(row)
    if (!target) {
      skippedUndetermined++
      console.log(`[skip] ${row.user_id} unable to derive target from current progress`)
      continue
    }

    const payload = {
      precomputed_opening_status: row.precomputed_opening_status || 'ready',
      precomputed_opening_target_illusion_key: target.illusionKey,
      precomputed_opening_target_layer: target.targetLayer,
    }

    if (!execute) {
      console.log(`[dry-run] ${row.user_id} status=${row.precomputed_opening_status ?? 'null'} -> ${payload.precomputed_opening_status}, target=${payload.precomputed_opening_target_illusion_key}/${payload.precomputed_opening_target_layer}`)
      continue
    }

    let builder = supabase
      .from('user_progress')
      .update(payload)
      .eq('id', row.id)

    if (row.precomputed_opening_status === null) {
      builder = builder.is('precomputed_opening_status', null)
    } else {
      builder = builder.eq('precomputed_opening_status', row.precomputed_opening_status)
    }

    const { error } = await builder
    if (error) {
      updateErrors++
      console.error(`[fail] ${row.user_id} :: ${error.message}`)
      continue
    }
    updated++
    console.log(`[ok] ${row.user_id} -> ${payload.precomputed_opening_target_illusion_key}/${payload.precomputed_opening_target_layer}`)
  }

  return { updated, skippedUndetermined, updateErrors }
}

async function main() {
  loadEnv({ path: '.env' })
  loadEnv({ path: '.env.local', override: true })

  const args = parseArgs(process.argv.slice(2))
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY

  if (!supabaseUrl || !serviceKey) {
    printUsage()
    throw new Error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY')
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const candidates = await loadCandidates(supabase, args)

  console.log(`Loaded ${candidates.length} repair candidate(s)`)
  console.log(`Mode: ${args.execute ? 'EXECUTE' : 'DRY RUN'}`)

  const result = await repairRows(supabase, candidates, args.execute)
  console.log(JSON.stringify({
    candidates: candidates.length,
    updated: result.updated,
    skippedUndetermined: result.skippedUndetermined,
    updateErrors: result.updateErrors,
  }, null, 2))

  if (result.updateErrors > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
