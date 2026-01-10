/**
 * POST /api/moments
 * Create a new captured moment
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import type { MomentType, EmotionalValence, SessionType, MythLayer } from '~/server/utils/llm/task-types'

interface CreateMomentBody {
  conversation_id: string
  message_id?: string
  moment_type: MomentType
  transcript: string
  myth_key?: string
  session_type: SessionType
  myth_layer?: MythLayer
  confidence_score?: number
  emotional_valence?: EmotionalValence
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<CreateMomentBody>(event)

  // Validate required fields
  if (!body.conversation_id) {
    throw createError({ statusCode: 400, message: 'conversation_id is required' })
  }
  if (!body.moment_type) {
    throw createError({ statusCode: 400, message: 'moment_type is required' })
  }
  if (!body.transcript) {
    throw createError({ statusCode: 400, message: 'transcript is required' })
  }
  if (!body.session_type) {
    throw createError({ statusCode: 400, message: 'session_type is required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Verify the conversation belongs to the user
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', body.conversation_id)
    .eq('user_id', user.sub)
    .single()

  if (convError || !conversation) {
    throw createError({ statusCode: 404, message: 'Conversation not found' })
  }

  // Create the moment
  const { data, error } = await supabase
    .from('captured_moments')
    .insert({
      user_id: user.sub,
      conversation_id: body.conversation_id,
      message_id: body.message_id || null,
      moment_type: body.moment_type,
      transcript: body.transcript, // Stored verbatim, no cleanup
      myth_key: body.myth_key || null,
      session_type: body.session_type,
      myth_layer: body.myth_layer || null,
      confidence_score: body.confidence_score ?? 0.8,
      emotional_valence: body.emotional_valence || null,
      // Audio capture deferred for MVP
      audio_clip_path: null,
      audio_duration_ms: null,
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    id: data.id,
    moment_type: data.moment_type,
    transcript: data.transcript,
    created_at: data.created_at,
  }
})
