import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const illusionNumber = query.illusionNumber ? parseInt(query.illusionNumber as string) : undefined

  const supabase = serverSupabaseServiceRole(event)

  let queryBuilder = supabase
    .from('conversations')
    .select('id, title, model, illusion_number, session_completed, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (illusionNumber) {
    queryBuilder = queryBuilder.eq('illusion_number', illusionNumber)
  }

  const { data, error } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
