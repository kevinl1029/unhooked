import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getDefaultModel } from '../../utils/llm'
import { ILLUSION_NAMES } from '../../utils/prompts'
import type { Message } from '../../utils/llm/types'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const defaultModel = getDefaultModel()
  const { title, model = defaultModel, illusionNumber, initialMessages } = body as {
    title?: string
    model?: string
    illusionNumber?: number
    initialMessages?: Message[]
  }

  const supabase = serverSupabaseServiceRole(event)

  // Create the conversation
  const conversationTitle = illusionNumber
    ? ILLUSION_NAMES[illusionNumber]
    : (title || 'New conversation')

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      user_id: user.sub,
      title: conversationTitle,
      model,
      illusion_number: illusionNumber || null
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
