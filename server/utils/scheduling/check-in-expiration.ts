/**
 * Check-In Expiration Utilities
 * Calculates expiration at display time (no cron job needed)
 */

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
