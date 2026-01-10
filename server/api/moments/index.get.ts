/**
 * GET /api/moments
 * Retrieve user's captured moments with optional filtering
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  const mythKey = query.myth_key as string | undefined
  const momentType = query.moment_type as string | undefined
  const limit = parseInt(query.limit as string) || 50
  const offset = parseInt(query.offset as string) || 0

  const supabase = serverSupabaseServiceRole(event)

  let queryBuilder = supabase
    .from('captured_moments')
    .select('*', { count: 'exact' })
    .eq('user_id', user.sub)
    .order('created_at', { ascending: false })

  // Apply optional filters
  if (mythKey) {
    queryBuilder = queryBuilder.eq('myth_key', mythKey)
  }
  if (momentType) {
    queryBuilder = queryBuilder.eq('moment_type', momentType)
  }

  // Apply pagination
  queryBuilder = queryBuilder.range(offset, offset + limit - 1)

  const { data, error, count } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    moments: data || [],
    total: count || 0,
  }
})
