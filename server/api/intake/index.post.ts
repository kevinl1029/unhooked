import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface IntakeBody {
  productTypes: string[]
  usageFrequency: string
  yearsUsing?: number
  previousAttempts?: number
  longestQuitDuration?: string
  primaryReason: string
  triggers?: string[]
}

function getMythOrder(primaryReason: string): number[] {
  const reasonToMyth: Record<string, number> = {
    'stress': 1,
    'pleasure': 2,
    'fear': 3,
    'focus': 4,
    'identity': 5
  }

  const firstMyth = reasonToMyth[primaryReason] || 1
  const defaultOrder = [1, 2, 3, 4, 5]

  // Put their primary reason first, then follow default order for the rest
  return [firstMyth, ...defaultOrder.filter(m => m !== firstMyth)]
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
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

  const supabase = serverSupabaseServiceRole(event)

  // Upsert intake data
  const { data: intakeData, error: intakeError } = await supabase
    .from('user_intake')
    .upsert({
      user_id: user.id,
      product_types: body.productTypes,
      usage_frequency: body.usageFrequency,
      years_using: body.yearsUsing || null,
      previous_attempts: body.previousAttempts || 0,
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

  // Calculate myth order based on primary reason
  const mythOrder = getMythOrder(body.primaryReason)

  // Upsert progress data
  const { data: progressData, error: progressError } = await supabase
    .from('user_progress')
    .upsert({
      user_id: user.id,
      program_status: 'in_progress',
      myth_order: mythOrder,
      current_myth: mythOrder[0],
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single()

  if (progressError) {
    throw createError({ statusCode: 500, message: progressError.message })
  }

  return {
    intake: intakeData,
    progress: progressData
  }
})
