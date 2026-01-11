/**
 * GET /api/check-ins/[id]
 * Fetch a check-in by ID for the authenticated user
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { personalizeCheckIn, type CheckInType } from '~/server/utils/llm/tasks/checkin-personalization'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const checkInId = getRouterParam(event, 'id')
  if (!checkInId) {
    throw createError({ statusCode: 400, message: 'Check-in ID is required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Fetch the check-in
  const { data: checkIn, error } = await supabase
    .from('check_in_schedule')
    .select('*')
    .eq('id', checkInId)
    .eq('user_id', user.sub)
    .single()

  if (error || !checkIn) {
    throw createError({ statusCode: 404, message: 'Check-in not found' })
  }

  // Get personalized prompt
  let prompt = checkIn.prompt_template

  // Personalize the prompt based on user context
  try {
    const { data: userStory } = await supabase
      .from('user_story')
      .select('primary_triggers, personal_stakes')
      .eq('user_id', user.sub)
      .single()

    if (userStory) {
      const personalizedPrompt = await personalizeCheckIn({
        basePrompt: checkIn.prompt_template,
        checkInType: checkIn.check_in_type as CheckInType,
        userContext: {
          triggers: userStory.primary_triggers || [],
          stakes: userStory.personal_stakes || [],
        },
      })
      prompt = personalizedPrompt
    }
  } catch (e) {
    // Fall back to base prompt if personalization fails
    console.warn('[check-in/[id]] Personalization failed, using base prompt:', e)
  }

  return {
    check_in: checkIn,
    prompt,
  }
})
