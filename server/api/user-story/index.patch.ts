/**
 * PATCH /api/user-story
 * Update belief state after session
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { MYTH_KEYS, type MythKey } from '~/server/utils/llm/task-types'

interface UpdateUserStoryBody {
  myth_key: MythKey
  conviction?: number
  key_insight_id?: string
  resistance_notes?: string
  new_triggers?: string[]
  new_stakes?: string[]
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<UpdateUserStoryBody>(event)

  // Validate required fields
  if (!body.myth_key) {
    throw createError({ statusCode: 400, message: 'myth_key is required' })
  }

  if (!MYTH_KEYS.includes(body.myth_key)) {
    throw createError({ statusCode: 400, message: `Invalid myth_key: ${body.myth_key}` })
  }

  const supabase = serverSupabaseServiceRole(event)

  // First, fetch the current story to merge triggers/stakes
  const { data: currentStory, error: fetchError } = await supabase
    .from('user_story')
    .select('primary_triggers, personal_stakes')
    .eq('user_id', user.sub)
    .single()

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw createError({ statusCode: 500, message: fetchError.message })
  }

  // Build the update object
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  // Update conviction for the specific myth
  if (body.conviction !== undefined) {
    // Coerce to valid range
    const conviction = Math.max(0, Math.min(10, Math.round(body.conviction)))
    updateData[`${body.myth_key}_conviction`] = conviction
  }

  // Update key insight for the specific myth
  if (body.key_insight_id !== undefined) {
    updateData[`${body.myth_key}_key_insight_id`] = body.key_insight_id
  }

  // Update resistance notes for the specific myth
  if (body.resistance_notes !== undefined) {
    updateData[`${body.myth_key}_resistance_notes`] = body.resistance_notes
  }

  // Merge new triggers with existing (deduplicate)
  if (body.new_triggers && body.new_triggers.length > 0) {
    const existingTriggers = currentStory?.primary_triggers || []
    const mergedTriggers = [...new Set([...existingTriggers, ...body.new_triggers])]
    updateData.primary_triggers = mergedTriggers
  }

  // Merge new stakes with existing (deduplicate)
  if (body.new_stakes && body.new_stakes.length > 0) {
    const existingStakes = currentStory?.personal_stakes || []
    const mergedStakes = [...new Set([...existingStakes, ...body.new_stakes])]
    updateData.personal_stakes = mergedStakes
  }

  // Perform the update
  const { data, error } = await supabase
    .from('user_story')
    .update(updateData)
    .eq('user_id', user.sub)
    .select()
    .single()

  if (error) {
    throw createError({ statusCode: 500, message: error.message })
  }

  return {
    success: true,
    updated_fields: Object.keys(updateData).filter(k => k !== 'updated_at'),
  }
})
