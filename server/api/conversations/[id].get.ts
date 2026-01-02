import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const id = getRouterParam(event, 'id')

  const supabase = serverSupabaseServiceRole(event)

  // Get conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.sub)
    .single()

  if (convError) {
    throw createError({ statusCode: 404, message: 'Conversation not found' })
  }

  // Get messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (msgError) {
    throw createError({ statusCode: 500, message: msgError.message })
  }

  return {
    ...conversation,
    messages
  }
})
