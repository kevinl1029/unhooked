/**
 * Check-In Scheduler
 * Manages the timing and scheduling of micro check-ins
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CheckInType } from '../llm/task-types'
import crypto from 'crypto'

// Check-in schedule configuration
const MORNING_HOUR = 9    // 9am local
const EVENING_HOUR = 19   // 7pm local
const POST_SESSION_DELAY_HOURS = 2   // 2 hours after session
const ROLLING_WINDOW_DAYS = 3        // Schedule 3 days ahead
const QUIET_HOURS_START = 21  // 9pm — begin quiet hours
const QUIET_HOURS_END = 8     // 8am — end quiet hours

interface ScheduleConfig {
  userId: string
  timezone: string
  trigger: 'session_complete' | 'program_start' | 'daily_refresh'
  sessionId?: string
  illusionKey?: string
  sessionEndTime?: Date
  supabase: SupabaseClient
}

interface ScheduledCheckIn {
  id: string
  type: CheckInType
  scheduledFor: Date
}

/**
 * Generate a secure random token for magic links
 */
function generateMagicLinkToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Convert a date to the user's timezone and get hour
 */
function getHourInTimezone(date: Date, timezone: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      hour12: false,
    })
    const parts = formatter.formatToParts(date)
    const hourPart = parts.find(p => p.type === 'hour')
    return parseInt(hourPart?.value || '0', 10)
  } catch {
    // Fallback to UTC if timezone is invalid
    return date.getUTCHours()
  }
}

/**
 * Create a date at a specific hour in the user's timezone
 */
function createDateAtHour(baseDate: Date, hour: number, timezone: string): Date {
  // Start with the base date
  const date = new Date(baseDate)

  // Get current hour in timezone
  const currentHour = getHourInTimezone(date, timezone)

  // Calculate the difference
  const hourDiff = hour - currentHour

  // Adjust the date
  date.setHours(date.getHours() + hourDiff)
  date.setMinutes(0)
  date.setSeconds(0)
  date.setMilliseconds(0)

  return date
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Add hours to a date
 */
function addHours(date: Date, hours: number): Date {
  const result = new Date(date)
  result.setHours(result.getHours() + hours)
  return result
}

/**
 * Defer a scheduled time to outside quiet hours (9pm–8am local time).
 * If hour >= 21 (9pm): defer to 8am next day.
 * If hour < 8 (before 8am): defer to 8am same day.
 * Otherwise: no change.
 */
function applyQuietHours(scheduledFor: Date, timezone: string): Date {
  const hour = getHourInTimezone(scheduledFor, timezone)

  if (hour >= QUIET_HOURS_START) {
    // After 9pm — defer to 8am next day
    const nextDay = addDays(scheduledFor, 1)
    return createDateAtHour(nextDay, QUIET_HOURS_END, timezone)
  }

  if (hour < QUIET_HOURS_END) {
    // Before 8am — defer to 8am same day
    return createDateAtHour(scheduledFor, QUIET_HOURS_END, timezone)
  }

  // Within allowed hours — no change
  return scheduledFor
}

/**
 * Check if a check-in already exists at this time
 */
async function checkInExists(
  supabase: SupabaseClient,
  userId: string,
  scheduledFor: Date,
  type: CheckInType
): Promise<boolean> {
  // Check within a 1-hour window
  const windowStart = new Date(scheduledFor.getTime() - 30 * 60 * 1000)
  const windowEnd = new Date(scheduledFor.getTime() + 30 * 60 * 1000)

  const { data } = await supabase
    .from('check_in_schedule')
    .select('id')
    .eq('user_id', userId)
    .eq('check_in_type', type)
    .gte('scheduled_for', windowStart.toISOString())
    .lte('scheduled_for', windowEnd.toISOString())
    .limit(1)
    .single()

  return !!data
}

/**
 * Check if there's a conflicting check-in within a window
 */
async function hasConflictingCheckIn(
  supabase: SupabaseClient,
  userId: string,
  scheduledFor: Date,
  windowMinutes: number
): Promise<boolean> {
  const windowStart = new Date(scheduledFor.getTime() - windowMinutes * 60 * 1000)
  const windowEnd = new Date(scheduledFor.getTime() + windowMinutes * 60 * 1000)

  const { data } = await supabase
    .from('check_in_schedule')
    .select('id')
    .eq('user_id', userId)
    .in('status', ['scheduled', 'sent'])
    .gte('scheduled_for', windowStart.toISOString())
    .lte('scheduled_for', windowEnd.toISOString())
    .limit(1)
    .single()

  return !!data
}

/**
 * Create a check-in record
 */
async function createCheckIn(
  supabase: SupabaseClient,
  userId: string,
  type: CheckInType,
  scheduledFor: Date,
  timezone: string,
  triggerIllusionKey?: string,
  triggerSessionId?: string,
  promptTemplate?: string,
  observationAssignment?: string,
  personalizationContext?: { name: string } | null
): Promise<ScheduledCheckIn | null> {
  const magicLinkToken = generateMagicLinkToken()

  const { data, error } = await supabase
    .from('check_in_schedule')
    .insert({
      user_id: userId,
      scheduled_for: scheduledFor.toISOString(),
      timezone,
      check_in_type: type,
      trigger_illusion_key: triggerIllusionKey || null,
      trigger_session_id: triggerSessionId || null,
      prompt_template: promptTemplate || getDefaultPromptTemplate(type),
      observation_assignment: observationAssignment || null,
      magic_link_token: magicLinkToken,
      status: 'scheduled',
      personalization_context: personalizationContext || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error('[check-in-scheduler] Failed to create check-in:', error)
    return null
  }

  return {
    id: data.id,
    type,
    scheduledFor,
  }
}

/**
 * Get default prompt template for a check-in type
 */
function getDefaultPromptTemplate(type: CheckInType): string {
  switch (type) {
    case 'morning':
      return 'Good morning. How are you feeling about today?'
    case 'evening':
      return "Day's winding down. Anything on your mind from today?"
    case 'post_session':
      return 'Had any thoughts since we last talked?'
    case 'evidence_bridge':
      return 'What did you observe?'
    default:
      return 'Quick check-in. How are things going?'
  }
}

/**
 * Schedule an evidence bridge check-in for layer completions (L1/L2)
 * Uses 24-hour timing and observation-specific prompts
 */
export async function scheduleEvidenceBridgeCheckIn(
  supabase: SupabaseClient,
  userId: string,
  illusionKey: string,
  observationAssignment: string | null,
  sessionEndTime: Date,
  timezone: string,
  sessionId: string
): Promise<ScheduledCheckIn | null> {
  try {
    // Schedule for 24 hours later, then apply quiet hours deferral
    const rawTime = addHours(sessionEndTime, 24)
    const scheduledTime = applyQuietHours(rawTime, timezone)

    // Build the prompt template wrapping the observation
    const promptTemplate = observationAssignment
      ? `You were going to ${observationAssignment.toLowerCase().replace(/^(notice|pay attention to|track)/i, 'notice')} — what did you observe?`
      : 'What did you observe?'

    // Query preferred_name for personalization
    const { data: intakeData } = await supabase
      .from('user_intake')
      .select('preferred_name')
      .eq('user_id', userId)
      .single()
    const personalizationContext = intakeData?.preferred_name
      ? { name: intakeData.preferred_name }
      : null

    const checkIn = await createCheckIn(
      supabase,
      userId,
      'evidence_bridge',
      scheduledTime,
      timezone,
      illusionKey,
      sessionId,
      promptTemplate,
      observationAssignment || undefined,
      personalizationContext
    )

    if (checkIn) {
      console.log(`[check-in-scheduler] Scheduled evidence_bridge check-in for ${scheduledTime.toISOString()}`)
    }

    return checkIn
  } catch (err) {
    console.error('[check-in-scheduler] Failed to schedule evidence bridge check-in:', err)
    return null
  }
}

/**
 * Schedule check-ins for a user
 * Uses rolling 3-day window until ceremony is complete
 */
export async function scheduleCheckIns(config: ScheduleConfig): Promise<ScheduledCheckIn[]> {
  const { userId, timezone, trigger, sessionId, illusionKey, sessionEndTime, supabase } = config
  const scheduled: ScheduledCheckIn[] = []
  const now = new Date()

  // Check if ceremony is complete - if so, don't schedule new check-ins
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('ceremony_completed_at')
    .eq('user_id', userId)
    .single()

  if (userProgress?.ceremony_completed_at) {
    console.log('[check-in-scheduler] Ceremony complete, skipping check-in scheduling')
    return scheduled
  }

  // Query preferred_name once for personalization (single query per scheduling call)
  const { data: intakeData } = await supabase
    .from('user_intake')
    .select('preferred_name')
    .eq('user_id', userId)
    .single()
  const personalizationContext = intakeData?.preferred_name
    ? { name: intakeData.preferred_name }
    : null

  // Handle post-session check-in
  if (trigger === 'session_complete' && sessionEndTime) {
    const rawTime = addHours(sessionEndTime, POST_SESSION_DELAY_HOURS)
    const twoHoursLater = applyQuietHours(rawTime, timezone)

    // Check for conflicts (within 60 minutes)
    const hasConflict = await hasConflictingCheckIn(supabase, userId, twoHoursLater, 60)

    if (!hasConflict) {
      const checkIn = await createCheckIn(
        supabase,
        userId,
        'post_session',
        twoHoursLater,
        timezone,
        illusionKey,
        sessionId,
        undefined,
        undefined,
        personalizationContext
      )
      if (checkIn) {
        scheduled.push(checkIn)
        console.log(`[check-in-scheduler] Scheduled post_session check-in for ${twoHoursLater.toISOString()}`)
      }
    } else {
      console.log('[check-in-scheduler] Skipping post_session - conflict exists')
    }
  }

  // Handle rolling window for morning/evening check-ins
  if (trigger === 'program_start' || trigger === 'daily_refresh') {
    for (let d = 0; d < ROLLING_WINDOW_DAYS; d++) {
      const targetDate = addDays(now, d)

      // Morning check-in at 9am local
      const morningTime = createDateAtHour(targetDate, MORNING_HOUR, timezone)
      if (morningTime > now) {
        const exists = await checkInExists(supabase, userId, morningTime, 'morning')
        if (!exists) {
          const checkIn = await createCheckIn(
            supabase,
            userId,
            'morning',
            morningTime,
            timezone,
            undefined,
            undefined,
            undefined,
            undefined,
            personalizationContext
          )
          if (checkIn) {
            scheduled.push(checkIn)
            console.log(`[check-in-scheduler] Scheduled morning check-in for ${morningTime.toISOString()}`)
          }
        }
      }

      // Evening check-in at 7pm local
      const eveningTime = createDateAtHour(targetDate, EVENING_HOUR, timezone)
      if (eveningTime > now) {
        const exists = await checkInExists(supabase, userId, eveningTime, 'evening')
        if (!exists) {
          const checkIn = await createCheckIn(
            supabase,
            userId,
            'evening',
            eveningTime,
            timezone,
            undefined,
            undefined,
            undefined,
            undefined,
            personalizationContext
          )
          if (checkIn) {
            scheduled.push(checkIn)
            console.log(`[check-in-scheduler] Scheduled evening check-in for ${eveningTime.toISOString()}`)
          }
        }
      }
    }
  }

  return scheduled
}

/**
 * Get pending check-ins for a user
 */
export async function getPendingCheckIns(
  supabase: SupabaseClient,
  userId: string
): Promise<{ checkIns: any[]; nextCheckIn: any | null }> {
  // Include 'opened' status so users who started but didn't complete see the check-in again
  const { data: checkIns, error } = await supabase
    .from('check_in_schedule')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['scheduled', 'sent', 'opened'])
    .order('scheduled_for', { ascending: true })

  if (error) {
    console.error('[check-in-scheduler] Failed to get pending check-ins:', error)
    return { checkIns: [], nextCheckIn: null }
  }

  return {
    checkIns: checkIns || [],
    nextCheckIn: checkIns?.[0] || null,
  }
}

/**
 * Mark a check-in as skipped
 */
export async function skipCheckIn(
  supabase: SupabaseClient,
  checkInId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('check_in_schedule')
    .update({ status: 'skipped' })
    .eq('id', checkInId)
    .eq('user_id', userId)

  if (error) {
    console.error('[check-in-scheduler] Failed to skip check-in:', error)
    return false
  }

  return true
}

/**
 * Mark a check-in as completed
 */
export async function completeCheckIn(
  supabase: SupabaseClient,
  checkInId: string,
  userId: string,
  responseConversationId: string | null
): Promise<boolean> {
  const updateData: Record<string, any> = {
    status: 'completed',
    completed_at: new Date().toISOString(),
  }

  if (responseConversationId) {
    updateData.response_conversation_id = responseConversationId
  }

  const { error } = await supabase
    .from('check_in_schedule')
    .update(updateData)
    .eq('id', checkInId)
    .eq('user_id', userId)

  if (error) {
    console.error('[check-in-scheduler] Failed to complete check-in:', error)
    return false
  }

  return true
}

/**
 * Get a check-in by magic link token
 */
export async function getCheckInByToken(
  supabase: SupabaseClient,
  token: string
): Promise<any | null> {
  const { data, error } = await supabase
    .from('check_in_schedule')
    .select('*')
    .eq('magic_link_token', token)
    .single()

  if (error || !data) {
    return null
  }

  return data
}

/**
 * Mark a check-in as opened
 */
export async function markCheckInOpened(
  supabase: SupabaseClient,
  checkInId: string
): Promise<void> {
  await supabase
    .from('check_in_schedule')
    .update({
      status: 'opened',
      opened_at: new Date().toISOString(),
    })
    .eq('id', checkInId)
}
