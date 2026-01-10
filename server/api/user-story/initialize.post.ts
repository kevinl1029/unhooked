/**
 * POST /api/user-story/initialize
 * Initialize user_story row when user starts program
 * Copies triggers from intake
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Check if user story already exists
  const { data: existingStory } = await supabase
    .from('user_story')
    .select('id')
    .eq('user_id', user.sub)
    .single()

  if (existingStory) {
    // Story already exists, return it
    return {
      success: true,
      already_exists: true,
      id: existingStory.id,
    }
  }

  // Fetch user intake to copy triggers
  const { data: intake, error: intakeError } = await supabase
    .from('user_intake')
    .select('triggers')
    .eq('user_id', user.sub)
    .single()

  if (intakeError && intakeError.code !== 'PGRST116') {
    throw createError({ statusCode: 500, message: intakeError.message })
  }

  // Create user story with triggers from intake
  const { data: newStory, error: createError } = await supabase
    .from('user_story')
    .insert({
      user_id: user.sub,
      primary_triggers: intake?.triggers || [],
      personal_stakes: [],
      origin_summary: null,
      origin_moment_ids: [],
      // All conviction scores default to 0 via schema
    })
    .select()
    .single()

  if (createError) {
    // Handle unique constraint violation (race condition)
    if (createError.code === '23505') {
      const { data: existing } = await supabase
        .from('user_story')
        .select('id')
        .eq('user_id', user.sub)
        .single()

      return {
        success: true,
        already_exists: true,
        id: existing?.id,
      }
    }
    throw createError({ statusCode: 500, message: createError.message })
  }

  return {
    success: true,
    already_exists: false,
    id: newStory.id,
  }
})
