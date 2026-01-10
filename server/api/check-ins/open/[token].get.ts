/**
 * GET /api/check-ins/open/:token
 * Open a check-in via magic link token
 * Token valid for 24 hours from email_sent_at
 */
import { serverSupabaseServiceRole } from '#supabase/server'
import {
  getCheckInByToken,
  markCheckInOpened,
  getPendingCheckIns,
} from '~/server/utils/scheduling/check-in-scheduler'
import { isMagicLinkExpired, isCheckInExpired } from '~/server/utils/scheduling/check-in-expiration'

export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')

  if (!token) {
    throw createError({ statusCode: 400, message: 'Token is required' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Get check-in by token
  const checkIn = await getCheckInByToken(supabase, token)

  if (!checkIn) {
    throw createError({ statusCode: 404, message: 'Check-in not found' })
  }

  // Check if magic link is expired (24 hours)
  if (isMagicLinkExpired(checkIn.email_sent_at)) {
    // Redirect to most recent pending check-in
    const { nextCheckIn } = await getPendingCheckIns(supabase, checkIn.user_id)

    if (nextCheckIn && !isCheckInExpired(nextCheckIn.scheduled_for, nextCheckIn.timezone)) {
      return {
        redirect: true,
        redirect_to: `/check-in/${nextCheckIn.id}`,
        message: 'Your link has expired. Redirecting to your most recent check-in.',
      }
    }

    throw createError({
      statusCode: 410,
      message: 'This check-in link has expired and no pending check-ins are available.',
    })
  }

  // Check if check-in window has expired
  if (isCheckInExpired(checkIn.scheduled_for, checkIn.timezone)) {
    // Redirect to most recent pending check-in
    const { nextCheckIn } = await getPendingCheckIns(supabase, checkIn.user_id)

    if (nextCheckIn && !isCheckInExpired(nextCheckIn.scheduled_for, nextCheckIn.timezone)) {
      return {
        redirect: true,
        redirect_to: `/check-in/${nextCheckIn.id}`,
        message: 'This check-in window has closed. Redirecting to your most recent check-in.',
      }
    }

    throw createError({
      statusCode: 410,
      message: 'This check-in window has closed and no pending check-ins are available.',
    })
  }

  // Mark as opened
  await markCheckInOpened(supabase, checkIn.id)

  return {
    check_in: {
      id: checkIn.id,
      type: checkIn.check_in_type,
      scheduled_for: checkIn.scheduled_for,
      trigger_myth_key: checkIn.trigger_myth_key,
    },
    prompt: checkIn.prompt_template,
  }
})
