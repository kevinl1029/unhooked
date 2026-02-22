import { createHash } from 'node:crypto'
import type { IllusionKey, IllusionLayer } from '~/server/utils/llm/task-types'

export const OPENING_PAYLOAD_HASH_VERSION = 'v1'

interface OpeningPayloadHashInput {
  text: string
  illusionKey: IllusionKey
  illusionLayer: IllusionLayer
  provider: string
  voice: string
  providerVersion?: string | null
}

function canonicalizeText(text: string): string {
  return text.trim().replace(/\s+/g, ' ')
}

export function buildOpeningPayloadHash(input: OpeningPayloadHashInput): string {
  const canonical = {
    version: OPENING_PAYLOAD_HASH_VERSION,
    text: canonicalizeText(input.text),
    illusionKey: input.illusionKey,
    illusionLayer: input.illusionLayer,
    provider: input.provider,
    voice: input.voice,
    providerVersion: input.providerVersion ?? null,
  }

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex')
}
