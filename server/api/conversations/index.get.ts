import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const mythNumber = query.mythNumber ? parseInt(query.mythNumber as string) : undefined

  const supabase = serverSupabaseServiceRole(event)

  let queryBuilder = supabase
    .from('conversations')
    .select('id, title, model, myth_number, session_completed, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (mythNumber) {
    queryBuilder = queryBuilder.eq('myth_number', mythNumber)
  }

  const { data, error } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
