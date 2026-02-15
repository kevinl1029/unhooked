import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface IntakeBody {
  productTypes: string[]
  usageFrequency: string
  yearsUsing?: number
  preferredName?: string
  previousAttempts?: string
  longestQuitDuration?: string
  primaryReason: string
  triggers?: string[]
}

function getIllusionOrder(primaryReason: string): number[] {
  const reasonToIllusion: Record<string, number> = {
    'stress': 1,
    'pleasure': 2,
    'fear': 3,
    'focus': 4,
    'identity': 5
  }

  const firstIllusion = reasonToIllusion[primaryReason] || 1
  const defaultOrder = [1, 2, 3, 4, 5]

  // Put their primary reason first, then follow default order for the rest
  return [firstIllusion, ...defaultOrder.filter(i => i !== firstIllusion)]
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)

  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // JWT claims have 'sub' field for user ID, not 'id'
  const userId = user.sub
  if (!userId) {
    throw createError({ statusCode: 401, message: 'User ID not found' })
  }

  const body = await readBody<IntakeBody>(event)

  // Validate required fields
  if (!body.productTypes || body.productTypes.length === 0) {
    throw createError({ statusCode: 400, message: 'productTypes is required' })
  }
  if (!body.usageFrequency) {
    throw createError({ statusCode: 400, message: 'usageFrequency is required' })
  }
  if (!body.primaryReason) {
    throw createError({ statusCode: 400, message: 'primaryReason is required' })
  }

  // Validate preferredName (v1.1)
  let normalizedPreferredName: string | null = null
  if (body.preferredName !== undefined) {
    const trimmedName = body.preferredName.trim()
    if (trimmedName.length > 50) {
      throw createError({ statusCode: 400, message: 'preferredName cannot exceed 50 characters' })
    }
    normalizedPreferredName = trimmedName.length > 0 ? trimmedName : null
  }

  // Validate previousAttempts (v1.1)
  const allowedAttempts = ['never', 'once', 'a_few', 'many', 'countless']
  let normalizedPreviousAttempts: string | null = null
  if (body.previousAttempts !== undefined) {
    // Reject integer values (no backwards compat)
    if (typeof body.previousAttempts === 'number') {
      throw createError({ statusCode: 400, message: 'previousAttempts must be a string value' })
    }
    if (!allowedAttempts.includes(body.previousAttempts)) {
      throw createError({ statusCode: 400, message: `previousAttempts must be one of: ${allowedAttempts.join(', ')}` })
    }
    normalizedPreviousAttempts = body.previousAttempts
  }

  // Validate triggers with custom: prefix (v1.1)
  if (body.triggers) {
    for (const trigger of body.triggers) {
      if (trigger.startsWith('custom:')) {
        const customText = trigger.substring(7) // Remove 'custom:' prefix
        if (customText.trim().length === 0) {
          throw createError({ statusCode: 400, message: 'Custom trigger cannot be empty' })
        }
      }
    }
  }

  const supabase = serverSupabaseServiceRole(event)

  // Upsert intake data
  const { data: intakeData, error: intakeError } = await supabase
    .from('user_intake')
    .upsert({
      user_id: userId,
      product_types: body.productTypes,
      usage_frequency: body.usageFrequency,
      years_using: body.yearsUsing || null,
      preferred_name: normalizedPreferredName,
      previous_attempts: normalizedPreviousAttempts,
      longest_quit_duration: body.longestQuitDuration || null,
      primary_reason: body.primaryReason,
      triggers: body.triggers || null,
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (intakeError) {
    throw createError({ statusCode: 500, message: intakeError.message })
  }

  // Calculate illusion order based on primary reason
  const illusionOrder = getIllusionOrder(body.primaryReason)

  // Upsert progress data
  const { data: progressData, error: progressError } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      program_status: 'in_progress',
      illusion_order: illusionOrder,
      current_illusion: illusionOrder[0],
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (progressError) {
    throw createError({ statusCode: 500, message: progressError.message })
  }

  // Upsert user_story data (copies triggers from intake)
  const { error: storyError } = await supabase
    .from('user_story')
    .upsert({
      user_id: userId,
      primary_triggers: body.triggers || [],
      personal_stakes: [],
    })

  if (storyError && storyError.code !== '23505') {
    console.error('Failed to create user_story:', storyError)
  }

  return {
    intake: intakeData,
    progress: progressData
  }
})
