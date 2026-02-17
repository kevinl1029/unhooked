/**
 * Check-In Expiration Utilities
 * Calculates expiration at display time and provides cron-driven expiration sweep.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { CheckInType } from '../llm/task-types'

/**
 * Get the hour in a specific timezone
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
    return date.getUTCHours()
  }
}

/**
 * Create a date at a specific hour in the user's timezone
 */
function createDateAtHour(baseDate: Date, hour: number, timezone: string): Date {
  const date = new Date(baseDate)
  const currentHour = getHourInTimezone(date, timezone)
  const hourDiff = hour - currentHour
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
 * Check-in windows:
 * - Morning (9am-7pm): Expires at 7pm local time
 * - Evening (7pm-9am next day): Expires at 9am next day local time
 * - Post-session: Expires at end of current window
 */
export function isCheckInExpired(
  scheduledFor: Date | string,
  userTimezone: string
): boolean {
  const now = new Date()
  const scheduled = typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor
  const scheduledHour = getHourInTimezone(scheduled, userTimezone)

  // Morning window: 9am-7pm (expires at 7pm)
  if (scheduledHour >= 9 && scheduledHour < 19) {
    const expiry = createDateAtHour(scheduled, 19, userTimezone)
    return now > expiry
  }

  // Evening window: 7pm-9am next day (expires at 9am)
  let expiry: Date
  if (scheduledHour >= 19) {
    // Scheduled in the evening, expires at 9am next day
    expiry = createDateAtHour(addDays(scheduled, 1), 9, userTimezone)
  } else {
    // Scheduled in early morning (before 9am), expires at 9am same day
    expiry = createDateAtHour(scheduled, 9, userTimezone)
  }

  return now > expiry
}

/**
 * Get the expiration time for a check-in
 */
export function getCheckInExpiration(
  scheduledFor: Date | string,
  userTimezone: string
): Date {
  const scheduled = typeof scheduledFor === 'string' ? new Date(scheduledFor) : scheduledFor
  const scheduledHour = getHourInTimezone(scheduled, userTimezone)

  // Morning window: expires at 7pm
  if (scheduledHour >= 9 && scheduledHour < 19) {
    return createDateAtHour(scheduled, 19, userTimezone)
  }

  // Evening window: expires at 9am next day
  if (scheduledHour >= 19) {
    return createDateAtHour(addDays(scheduled, 1), 9, userTimezone)
  }

  // Early morning: expires at 9am same day
  return createDateAtHour(scheduled, 9, userTimezone)
}

/**
 * Check if a magic link token is expired (24 hours)
 */
export function isMagicLinkExpired(emailSentAt: Date | string | null): boolean {
  if (!emailSentAt) return false // Not sent yet, not expired

  const sentAt = typeof emailSentAt === 'string' ? new Date(emailSentAt) : emailSentAt
  const now = new Date()
  const twentyFourHoursMs = 24 * 60 * 60 * 1000

  return now.getTime() - sentAt.getTime() > twentyFourHoursMs
}

/**
 * Filter out expired check-ins from a list
 */
export function filterExpiredCheckIns<T extends { scheduled_for: string; timezone: string }>(
  checkIns: T[]
): T[] {
  return checkIns.filter(checkIn => !isCheckInExpired(checkIn.scheduled_for, checkIn.timezone))
}

/**
 * Cron-driven expiration sweep.
 * Marks check-ins as expired when their window has passed.
 *
 * Expiry rules:
 * - Morning check-ins (9am): expire at 7pm local time
 * - Evening check-ins (7pm): expire at 9am next day local time
 * - Post-session check-ins: expire at end of their window
 * - Evidence bridge check-ins: NOT expired by this function (no time-based expiry)
 *
 * Only check-ins in 'scheduled' or 'sent' status are eligible.
 */
export async function expireOverdueCheckIns(
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<{ expired: number; errors: string[] }> {
  // Fetch all non-evidence-bridge check-ins that are scheduled or sent
  const { data: checkIns, error } = await supabase
    .from('check_in_schedule')
    .select('id, scheduled_for, timezone, check_in_type')
    .in('status', ['scheduled', 'sent'])
    .neq('check_in_type', 'evidence_bridge')

  if (error) {
    console.error('[check-in-expiration] Failed to query check-ins:', error)
    return { expired: 0, errors: [error.message] }
  }

  if (!checkIns || checkIns.length === 0) {
    return { expired: 0, errors: [] }
  }

  const errors: string[] = []
  let expired = 0

  for (const checkIn of checkIns) {
    const expiration = getCheckInExpiration(checkIn.scheduled_for, checkIn.timezone)
    if (now > expiration) {
      const { error: updateError } = await supabase
        .from('check_in_schedule')
        .update({ status: 'expired', expired_at: now.toISOString() })
        .eq('id', checkIn.id)

      if (updateError) {
        const msg = `Failed to expire check-in ${checkIn.id}: ${updateError.message}`
        errors.push(msg)
        console.error(`[check-in-expiration] ${msg}`)
      } else {
        expired++
        console.log(`[check-in-expiration] Expired check-in ${checkIn.id} (${checkIn.check_in_type})`)
      }
    }
  }

  return { expired, errors }
}
