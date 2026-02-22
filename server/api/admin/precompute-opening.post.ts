import { serverSupabaseServiceRole } from '#supabase/server'
import { ILLUSION_KEYS, type IllusionKey, type IllusionLayer } from '~/server/utils/llm/task-types'
import { precomputeOpeningText } from '~/server/utils/session/precompute-opening'

interface Body {
  userId?: string
  illusionKey?: IllusionKey
  nextLayer?: IllusionLayer
}

const ALLOWED_NEXT_LAYERS: IllusionLayer[] = ['emotional', 'identity']

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const adminSecret = getHeader(event, 'x-admin-secret')
  if (!adminSecret || adminSecret !== config.adminApiSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<Body>(event)

  if (!body?.userId || !body?.illusionKey || !body?.nextLayer) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: userId, illusionKey, nextLayer',
    })
  }

  if (!ILLUSION_KEYS.includes(body.illusionKey)) {
    throw createError({
      statusCode: 400,
      message: `Invalid illusionKey: \"${body.illusionKey}\"`,
    })
  }

  if (!ALLOWED_NEXT_LAYERS.includes(body.nextLayer)) {
    throw createError({
      statusCode: 400,
      message: `Invalid nextLayer: \"${body.nextLayer}\". Must be one of: emotional, identity`,
    })
  }

  const supabase = serverSupabaseServiceRole(event)

  await precomputeOpeningText({
    supabase,
    userId: body.userId,
    illusionKey: body.illusionKey,
    nextLayer: body.nextLayer,
  })

  return {
    success: true,
    userId: body.userId,
    illusionKey: body.illusionKey,
    nextLayer: body.nextLayer,
  }
})
