import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getDefaultModel } from '../../utils/llm'
import { ILLUSION_NAMES } from '../../utils/prompts'
import type { IllusionKey, IllusionLayer, SessionType } from '../../utils/llm/task-types'

export default defineEventHandler(async (event) => {
  // Auth check
  const user = await serverSupabaseUser(event)
  if (!user?.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // Parse request body
  const body = await readBody(event)
  const { illusionKey, illusionLayer, sessionType, openingText } = body as {
    illusionKey?: IllusionKey
    illusionLayer?: IllusionLayer
    sessionType?: SessionType
    openingText?: string
  }

  // Validate required fields
  if (!illusionKey || !illusionLayer || !sessionType || !openingText) {
    throw createError({
      statusCode: 400,
      message: 'Missing required fields: illusionKey, illusionLayer, sessionType, openingText',
    })
  }

  const supabase = serverSupabaseServiceRole(event)
  const model = getDefaultModel()

  try {
    // Create conversation record
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.sub,
        model,
        title: ILLUSION_NAMES[illusionKey],
        session_type: sessionType,
        illusion_key: illusionKey,
        illusion_layer: illusionLayer,
      })
      .select('id')
      .single()

    if (convError) {
      console.error('[instant-start] Bootstrap failed - conversation creation error:', convError)
      throw createError({ statusCode: 500, message: convError.message })
    }

    const conversationId = newConv.id

    // Save opening text as first message
    const { error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: openingText,
        input_modality: 'text',
      })

    if (msgError) {
      console.error('[instant-start] Bootstrap failed - message creation error:', msgError)
      throw createError({ statusCode: 500, message: msgError.message })
    }

    // Cancel pending evidence bridge check-ins (non-blocking)
    Promise.resolve(
      supabase
        .from('check_in_schedule')
        .update({
          status: 'cancelled',
          cancellation_reason: 'user_continued_immediately',
        })
        .eq('user_id', user.sub)
        .eq('trigger_illusion_key', illusionKey)
        .eq('check_in_type', 'evidence_bridge')
        .in('status', ['scheduled', 'sent'])
    ).catch((err) => {
      console.error('[instant-start] Failed to cancel evidence bridge check-ins:', err)
    })

    console.log('[instant-start] Bootstrap success:', {
      conversationId,
      illusionKey,
      illusionLayer,
      sessionType,
    })

    return { conversationId }
  } catch (error) {
    console.error('[instant-start] Bootstrap failed:', error)
    throw error
  }
})
