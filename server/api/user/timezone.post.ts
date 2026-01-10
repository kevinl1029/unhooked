/**
 * POST /api/user/timezone
 * Store the user's timezone (detected via browser)
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

interface TimezoneBody {
  timezone: string
}

// List of valid IANA timezone identifiers (partial list of common ones)
const VALID_TIMEZONE_PATTERNS = [
  /^America\//,
  /^Europe\//,
  /^Asia\//,
  /^Africa\//,
  /^Australia\//,
  /^Pacific\//,
  /^Atlantic\//,
  /^Indian\//,
  /^Etc\//,
  /^UTC$/,
]

function isValidTimezone(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false

  // Check if it matches any valid pattern
  if (!VALID_TIMEZONE_PATTERNS.some(pattern => pattern.test(tz))) {
    return false
  }

  // Try to use it with Intl to verify
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<TimezoneBody>(event)

  if (!body.timezone) {
    throw createError({ statusCode: 400, message: 'timezone is required' })
  }

  if (!isValidTimezone(body.timezone)) {
    throw createError({ statusCode: 400, message: 'Invalid timezone' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Update user_progress with timezone
  const { error } = await supabase
    .from('user_progress')
    .update({ timezone: body.timezone })
    .eq('user_id', user.sub)

  if (error) {
    // If no row exists, try to upsert
    const { error: upsertError } = await supabase
      .from('user_progress')
      .upsert({
        user_id: user.sub,
        timezone: body.timezone,
      })

    if (upsertError) {
      throw createError({ statusCode: 500, message: upsertError.message })
    }
  }

  return { success: true, timezone: body.timezone }
})
