import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getDefaultModel } from '../../utils/llm'
import { ILLUSION_NAMES } from '../../utils/prompts'
import type { Message } from '../../utils/llm/types'
import { ILLUSION_KEYS, type IllusionKey } from '../../utils/llm/task-types'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  if (Object.prototype.hasOwnProperty.call(body, 'illusionNumber')) {
    throw createError({ statusCode: 400, message: 'illusionNumber is no longer supported. Send illusionKey instead.' })
  }
  const defaultModel = getDefaultModel()
  const { title, model = defaultModel, illusionKey, initialMessages } = body as {
    title?: string
    model?: string
    illusionKey?: string
    initialMessages?: Message[]
  }
  const hasIllusionKey = !!illusionKey
  if (hasIllusionKey && !ILLUSION_KEYS.includes(illusionKey as IllusionKey)) {
    throw createError({ statusCode: 400, message: 'Invalid illusionKey' })
  }

  const effectiveIllusionKey = (hasIllusionKey ? illusionKey : null) as IllusionKey | null

  const supabase = serverSupabaseServiceRole(event)

  // Create the conversation
  const conversationTitle = effectiveIllusionKey
    ? ILLUSION_NAMES[effectiveIllusionKey]
    : (title || 'New conversation')

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      user_id: user.sub,
      title: conversationTitle,
      model,
      illusion_key: effectiveIllusionKey
    })
    .select()
    .single()

  if (convError) {
    throw createError({ statusCode: 500, message: convError.message })
  }

  // If initial messages provided, save them to the database
  if (initialMessages && initialMessages.length > 0) {
    const messageInserts = initialMessages.map((msg: Message) => ({
      conversation_id: conversation.id,
      role: msg.role,
      content: msg.content,
      message_length: msg.content.length,
      time_since_last_message: null
    }))

    const { error: messagesError } = await supabase
      .from('messages')
      .insert(messageInserts)

    if (messagesError) {
      console.error('Error saving initial messages:', messagesError)
      // Don't throw - conversation is created, messages can be re-saved
    }
  }

  return {
    conversationId: conversation.id,
    conversation
  }
})
