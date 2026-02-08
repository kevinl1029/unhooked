import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { ILLUSION_KEYS, type IllusionKey } from '../../utils/llm/task-types'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const query = getQuery(event)
  if (Object.prototype.hasOwnProperty.call(query, 'illusionNumber')) {
    throw createError({ statusCode: 400, message: 'illusionNumber is no longer supported. Use illusionKey query param.' })
  }
  const illusionKey = typeof query.illusionKey === 'string' ? query.illusionKey : undefined
  const hasIllusionKey = !!illusionKey
  if (hasIllusionKey && !ILLUSION_KEYS.includes(illusionKey as IllusionKey)) {
    throw createError({ statusCode: 400, message: 'Invalid illusionKey' })
  }
  const effectiveIllusionKey = (hasIllusionKey ? illusionKey : null) as IllusionKey | null

  const supabase = serverSupabaseServiceRole(event)

  let queryBuilder = supabase
    .from('conversations')
    .select('id, title, model, illusion_key, session_completed, created_at, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (effectiveIllusionKey) {
    queryBuilder = queryBuilder.eq('illusion_key', effectiveIllusionKey)
  }

  const { data, error } = await queryBuilder

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return data
})
