import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data, error } = await supabase
    .from('user_intake')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error) {
    // PGRST116 = no rows returned (user hasn't completed intake yet)
    if (error.code === 'PGRST116') {
      return null
    }
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
