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
    concurrency: 3,
    baseUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    userId: null,
  }

  for (const raw of argv) {
    if (raw === '--execute') args.execute = true
    else if (raw.startsWith('--limit=')) args.limit = Number(raw.split('=')[1])
    else if (raw.startsWith('--concurrency=')) args.concurrency = Number(raw.split('=')[1])
    else if (raw.startsWith('--base-url=')) args.baseUrl = raw.split('=').slice(1).join('=')
    else if (raw.startsWith('--user-id=')) args.userId = raw.split('=').slice(1).join('=')
    else if (raw === '--help') {
      printUsage()
      process.exit(0)
    }
  }

  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) args.concurrency = 3
  if (args.limit !== null && (!Number.isFinite(args.limit) || args.limit < 1)) args.limit = null

  return args
}

function printUsage() {
  console.log(`Usage:
  node scripts/backfill-precompute-opening.mjs [options]

Options:
  --execute                 Run writes (default is dry run)
  --limit=<n>              Only process first n eligible users
  --concurrency=<n>        Parallel requests (default: 3)
  --base-url=<url>         App base URL (default: NUXT_PUBLIC_APP_URL or http://localhost:3000)
  --user-id=<uuid>         Process only one user
  --help                   Show this help

Required env vars:
  SUPABASE_URL
  SUPABASE_SECRET_KEY
  ADMIN_API_SECRET
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

function buildTarget(row) {
  const illusionNumber = row.current_illusion
  const illusionKey = ILLUSION_BY_NUMBER[illusionNumber]

  if (!illusionKey) return null

  const nextLayer = deriveNextLayer(row.layer_progress, illusionKey)

  if (nextLayer !== 'emotional' && nextLayer !== 'identity') {
    return null
  }

  return {
    userId: row.user_id,
    illusionKey,
    nextLayer,
  }
}

async function loadTargets(supabase, userIdFilter = null) {
  let query = supabase
    .from('user_progress')
    .select('user_id,current_illusion,layer_progress,program_status')

  if (userIdFilter) {
    query = query.eq('user_id', userIdFilter)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`Failed to load user_progress: ${error.message}`)
  }

  const rows = Array.isArray(data) ? data : []

  return rows
    .filter((row) => row.program_status !== 'ceremony_ready')
    .filter((row) => row.program_status !== 'completed')
    .map(buildTarget)
    .filter(Boolean)
}

async function callPrecompute(baseUrl, adminSecret, target) {
  const res = await fetch(`${baseUrl}/api/admin/precompute-opening`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-admin-secret': adminSecret,
    },
    body: JSON.stringify(target),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`)
  }
}

async function runWithConcurrency(items, concurrency, fn) {
  let index = 0
  let success = 0
  let failed = 0

  const workers = Array.from({ length: concurrency }, async () => {
    while (index < items.length) {
      const i = index++
      const item = items[i]
      try {
        await fn(item)
        success++
        console.log(`[ok] ${item.userId} ${item.illusionKey} -> ${item.nextLayer}`)
      } catch (error) {
        failed++
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[fail] ${item.userId} ${item.illusionKey} -> ${item.nextLayer} :: ${message}`)
      }
    }
  })

  await Promise.all(workers)
  return { success, failed }
}

async function main() {
  loadEnv({ path: '.env' })
  loadEnv({ path: '.env.local', override: true })

  const args = parseArgs(process.argv.slice(2))

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SECRET_KEY
  const adminSecret = process.env.ADMIN_API_SECRET

  if (!supabaseUrl || !serviceKey || !adminSecret) {
    printUsage()
    throw new Error('Missing one or more required env vars (SUPABASE_URL, SUPABASE_SECRET_KEY, ADMIN_API_SECRET)')
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  let targets = await loadTargets(supabase, args.userId)

  if (args.limit) {
    targets = targets.slice(0, args.limit)
  }

  console.log(`Loaded ${targets.length} eligible user(s)`) 
  console.log(`Mode: ${args.execute ? 'EXECUTE' : 'DRY RUN'}`)
  console.log(`Base URL: ${args.baseUrl}`)
  console.log(`Concurrency: ${args.concurrency}`)

  if (!targets.length) {
    return
  }

  if (!args.execute) {
    for (const target of targets.slice(0, 25)) {
      console.log(`[dry-run] ${target.userId} ${target.illusionKey} -> ${target.nextLayer}`)
    }
    if (targets.length > 25) {
      console.log(`...and ${targets.length - 25} more`)
    }
    return
  }

  const startedAt = Date.now()
  const result = await runWithConcurrency(
    targets,
    args.concurrency,
    (target) => callPrecompute(args.baseUrl, adminSecret, target)
  )

  const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`Done in ${elapsedSec}s. success=${result.success}, failed=${result.failed}`)

  if (result.failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
