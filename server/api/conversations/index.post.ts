import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getDefaultModel } from '../../utils/llm'
import { MYTH_NAMES } from '../../utils/prompts'
import type { Message } from '../../utils/llm/types'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const defaultModel = getDefaultModel()
  const { title, model = defaultModel, mythNumber, initialMessages } = body as {
    title?: string
    model?: string
    mythNumber?: number
    initialMessages?: Message[]
  }

  const supabase = serverSupabaseServiceRole(event)

  // Create the conversation
  const conversationTitle = mythNumber
    ? MYTH_NAMES[mythNumber]
    : (title || 'New conversation')

  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      user_id: user.sub,
      title: conversationTitle,
      model,
      myth_number: mythNumber || null
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
