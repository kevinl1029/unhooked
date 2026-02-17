/**
 * Check-In Email Sender
 * Processes scheduled check-ins and sends emails via Resend
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getResendClient, getEmailSubject } from './resend-client'
import { generateUnsubscribeToken } from '../auth/hmac-tokens'

// From email address
const FROM_EMAIL = 'coach@getunhooked.app'
const FROM_NAME = 'Unhooked Coach'
export const UNSENT_CHECK_IN_EXPIRY_HOURS = 48

interface CheckInToSend {
  id: string
  user_id: string
  check_in_type: string
  magic_link_token: string
  scheduled_for: string
  prompt_template: string | null
  observation_assignment: string | null
  personalization_context: { name?: string } | null
  retry_count: number
  user: {
    email: string
  }
}

export function shouldExpireUnsentCheckIn(
  scheduledFor: string | Date,
  now: Date = new Date()
): boolean {
  const scheduled = scheduledFor instanceof Date ? scheduledFor : new Date(scheduledFor)
  const ageMs = now.getTime() - scheduled.getTime()
  return ageMs >= UNSENT_CHECK_IN_EXPIRY_HOURS * 60 * 60 * 1000
}

/**
 * Process scheduled check-ins that are due
 * Called by Vercel Cron daily
 */
export async function processScheduledCheckIns(supabase: SupabaseClient): Promise<{
  processed: number
  sent: number
  errors: string[]
}> {
  const now = new Date()

  // Find all due scheduled check-ins. Keep retrying until sent or expired (max 3 attempts).
  const { data: checkIns, error } = await supabase
    .from('check_in_schedule')
    .select(`
      id,
      user_id,
      check_in_type,
      magic_link_token,
      scheduled_for,
      prompt_template,
      observation_assignment,
      personalization_context,
      retry_count
    `)
    .eq('status', 'scheduled')
    .lte('scheduled_for', now.toISOString())
    .lt('retry_count', 3)

  if (error) {
    console.error('[check-in-sender] Failed to query check-ins:', error)
    return { processed: 0, sent: 0, errors: [error.message] }
  }

  if (!checkIns || checkIns.length === 0) {
    return { processed: 0, sent: 0, errors: [] }
  }

  const errors: string[] = []
  let sent = 0

  // Process each check-in
  for (const checkIn of checkIns) {
    try {
      if (shouldExpireUnsentCheckIn(checkIn.scheduled_for, now)) {
        const { error: expireError } = await supabase
          .from('check_in_schedule')
          .update({
            status: 'expired',
            expired_at: now.toISOString(),
          })
          .eq('id', checkIn.id)

        if (expireError) {
          errors.push(`Failed to expire stale check-in ${checkIn.id}: ${expireError.message}`)
          console.error(`[check-in-sender] Failed to expire stale check-in ${checkIn.id}:`, expireError)
        }
        continue
      }

      // Check if user has unsubscribed from emails
      const { data: progressData } = await supabase
        .from('user_progress')
        .select('email_unsubscribed_at')
        .eq('user_id', checkIn.user_id)
        .single()

      if (progressData?.email_unsubscribed_at) {
        console.log(`[check-in-sender] User ${checkIn.user_id} unsubscribed, skipping email`)
        await supabase
          .from('check_in_schedule')
          .update({ status: 'sent', email_sent_at: null })
          .eq('id', checkIn.id)
        sent++
        continue
      }

      // Get user email
      const { data: userData, error: userError } = await supabase
        .from('auth.users')
        .select('email')
        .eq('id', checkIn.user_id)
        .single()

      if (userError || !userData?.email) {
        // Try auth.getUser instead
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(checkIn.user_id)

        if (authError || !authData.user?.email) {
          errors.push(`Failed to get email for user ${checkIn.user_id}`)
          continue
        }

        await sendCheckInEmail({
          ...checkIn,
          user: { email: authData.user.email },
        })
        sent++
      } else {
        await sendCheckInEmail({
          ...checkIn,
          user: { email: userData.email },
        })
        sent++
      }

      // Update status to sent
      await supabase
        .from('check_in_schedule')
        .update({
          status: 'sent',
          email_sent_at: now.toISOString(),
        })
        .eq('id', checkIn.id)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Failed to send check-in ${checkIn.id}: ${message}`)
      console.error(`[check-in-sender] Failed to process check-in ${checkIn.id}:`, err)

      // Increment retry_count; mark as failed after 3rd attempt
      const newRetryCount = (checkIn.retry_count ?? 0) + 1
      if (newRetryCount >= 3) {
        await supabase
          .from('check_in_schedule')
          .update({ retry_count: newRetryCount, status: 'failed' })
          .eq('id', checkIn.id)
      } else {
        await supabase
          .from('check_in_schedule')
          .update({ retry_count: newRetryCount })
          .eq('id', checkIn.id)
      }
    }
  }

  return {
    processed: checkIns.length,
    sent,
    errors,
  }
}

/**
 * Send a check-in email via Resend
 */
async function sendCheckInEmail(checkIn: CheckInToSend): Promise<void> {
  const resend = getResendClient()
  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl || 'https://getunhooked.app'

  const magicLink = `${appUrl}/check-in/open/${checkIn.magic_link_token}`
  const name = checkIn.personalization_context?.name ?? null
  const subject = getEmailSubject(checkIn.check_in_type, name)

  const hmacSig = generateUnsubscribeToken(checkIn.user_id)
  const footerUnsubscribeLink = `${appUrl}/api/check-ins/unsubscribe?uid=${checkIn.user_id}&sig=${hmacSig}`
  const listUnsubscribeUrl = `${appUrl}/api/check-ins/unsubscribe?token=${checkIn.magic_link_token}`

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: checkIn.user.email,
    subject,
    html: buildEmailHtml(
      magicLink,
      checkIn.check_in_type,
      checkIn.prompt_template,
      checkIn.observation_assignment,
      footerUnsubscribeLink
    ),
    text: buildEmailText(
      magicLink,
      checkIn.check_in_type,
      checkIn.prompt_template,
      checkIn.observation_assignment,
      footerUnsubscribeLink
    ),
    headers: {
      'List-Unsubscribe': `<${listUnsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }

  console.log(`[check-in-sender] Sent ${checkIn.check_in_type} email to ${checkIn.user.email}`)
}

// Per-type email content config
const CHECK_IN_EMAIL_CONFIG: Record<string, { heading: string; body: string; cta: string }> = {
  post_session: {
    heading: 'Quick thought for you',
    body: 'A quick thought from your session earlier.',
    cta: 'Open check-in',
  },
  evidence_bridge: {
    heading: 'What did you notice?',
    body: '', // populated from prompt_template
    cta: 'Share what you noticed',
  },
  morning: {
    heading: 'Good morning',
    body: 'Start your day with a quick reflection.',
    cta: 'Open check-in',
  },
  evening: {
    heading: "Day's winding down",
    body: 'Take a moment to reflect on your day.',
    cta: 'Open check-in',
  },
}

function getEmailConfig(checkInType: string): { heading: string; body: string; cta: string } {
  return CHECK_IN_EMAIL_CONFIG[checkInType] ?? {
    heading: 'Your check-in is ready',
    body: 'Take a moment to reflect on how things are going.',
    cta: 'Open check-in',
  }
}

/**
 * Build HTML email content
 * Evidence bridge emails include observation assignment text
 * Other check-ins use generic copy
 */
function buildEmailHtml(
  magicLink: string,
  checkInType: string,
  promptTemplate: string | null,
  observationAssignment: string | null,
  footerUnsubscribeLink: string
): string {
  const emailConfig = getEmailConfig(checkInType)
  const bodyText = checkInType === 'evidence_bridge'
    ? (promptTemplate || observationAssignment || 'Take a moment to reflect on how things are going.')
    : emailConfig.body

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unhooked Check-in</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #ffffff;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="480" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #104e54 0%, #0a3a3f 100%); border-radius: 16px; padding: 40px; max-width: 480px;">
          <tr>
            <td align="center" style="padding-bottom: 8px;">
              <p style="color: rgba(255, 255, 255, 0.65); font-size: 12px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; margin: 0;">Unhooked</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">${emailConfig.heading}</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <p style="color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6; margin: 0;">
                ${bodyText}
              </p>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #fc4a1a, #f7b733); color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 9999px; font-size: 16px;">
                ${emailConfig.cta}
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 40px;">
              <p style="color: rgba(255, 255, 255, 0.4); font-size: 12px; margin: 0;">
                <a href="${footerUnsubscribeLink}" style="color: rgba(255, 255, 255, 0.4); text-decoration: underline;">Unsubscribe from check-in emails</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Build plain text email content
 */
function buildEmailText(
  magicLink: string,
  checkInType: string,
  promptTemplate: string | null,
  observationAssignment: string | null,
  footerUnsubscribeLink: string
): string {
  const emailConfig = getEmailConfig(checkInType)
  const bodyText = checkInType === 'evidence_bridge'
    ? (promptTemplate || observationAssignment || 'Take a moment to reflect on how things are going.')
    : emailConfig.body

  return `UNHOOKED

${emailConfig.heading}

${bodyText}

${emailConfig.cta}: ${magicLink}

Unsubscribe from check-in emails: ${footerUnsubscribeLink}`
}
