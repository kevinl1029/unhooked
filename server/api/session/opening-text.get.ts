import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'
import { ILLUSION_OPENING_MESSAGES } from '~/server/utils/prompts'
import type { IllusionKey, IllusionLayer, SessionType } from '~/server/utils/llm/task-types'

export default defineEventHandler(async (event) => {
  // Authentication check
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  // Get query parameters
  const query = getQuery(event)
  const illusionKey = query.illusionKey as IllusionKey | undefined
  const illusionLayer = query.illusionLayer as IllusionLayer | undefined
  const sessionType = query.sessionType as SessionType | undefined

  // Validate required params
  if (!illusionKey || !illusionLayer || !sessionType) {
    throw createError({
      statusCode: 400,
      message: 'Missing required query params: illusionKey, illusionLayer, sessionType'
    })
  }

  // Non-core sessions don't use fast-start
  if (sessionType !== 'core') {
    console.log('[instant-start] Opening text not available - non-core session', {
      illusionKey,
      illusionLayer,
      sessionType
    })
    return { text: null, source: null }
  }

  // L1 (intellectual layer) - use static messages
  if (illusionLayer === 'intellectual') {
    const staticText = ILLUSION_OPENING_MESSAGES[illusionKey]
    if (staticText) {
      console.log('[instant-start] Opening text resolved - static L1 message', {
        illusionKey,
        illusionLayer,
        source: 'static'
      })
      return { text: staticText, source: 'static' }
    } else {
      console.log('[instant-start] Opening text not available - illusionKey not found in ILLUSION_OPENING_MESSAGES', {
        illusionKey,
        illusionLayer
      })
      return { text: null, source: null }
    }
  }

  // L2/L3 (emotional/identity layers) - use precomputed text
  if (illusionLayer === 'emotional' || illusionLayer === 'identity') {
    const supabase = await serverSupabaseServiceRole(event)

    const { data, error } = await supabase
      .from('user_progress')
      .select('precomputed_opening_text')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.log('[instant-start] Opening text not available - DB error', {
        illusionKey,
        illusionLayer,
        error: error.message
      })
      return { text: null, source: null }
    }

    if (data?.precomputed_opening_text) {
      console.log('[instant-start] Opening text resolved - precomputed L2/L3 message', {
        illusionKey,
        illusionLayer,
        source: 'precomputed',
        textLength: data.precomputed_opening_text.length
      })
      return { text: data.precomputed_opening_text, source: 'precomputed' }
    } else {
      console.log('[instant-start] Opening text not available - precomputed_opening_text is NULL', {
        illusionKey,
        illusionLayer
      })
      return { text: null, source: null }
    }
  }

  // Fallback for any unexpected cases
  console.log('[instant-start] Opening text not available - unexpected illusionLayer', {
    illusionKey,
    illusionLayer
  })
  return { text: null, source: null }
})
