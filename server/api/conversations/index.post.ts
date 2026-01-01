import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { DEFAULT_MODEL } from '../../utils/llm'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { title, model = DEFAULT_MODEL } = body

  const supabase = serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: user.id,
      title: title || 'New conversation',
      model
    })
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
