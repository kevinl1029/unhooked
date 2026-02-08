/**
 * Ceremony Nudge Email Sender
 * Processes users eligible for ceremony nudge emails
 * Sends emails 24 hours after ceremony_ready_at if ceremony not started
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getResendClient } from './resend-client'

// From email address
const FROM_EMAIL = 'coach@getunhooked.app'
const FROM_NAME = 'Unhooked Coach'

interface CeremonyEmailUser {
  id: string
  email: string
  product_types: string[] | null
}

/**
 * Process ceremony nudge emails for eligible users
 * Called by cron every 5 minutes
 */
export async function processCeremonyEmails(supabase: SupabaseClient): Promise<{
  processed: number
  sent: number
  errors: string[]
}> {
  const now = new Date()
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Find users who:
  // - Are ceremony_ready
  // - Became ready >= 24 hours ago
  // - Haven't received the email yet
  // - Haven't completed the ceremony
  const { data: eligibleUsers, error } = await supabase
    .from('user_progress')
    .select(`
      user_id,
      ceremony_ready_at
    `)
    .eq('program_status', 'ceremony_ready')
    .lte('ceremony_ready_at', twentyFourHoursAgo.toISOString())
    .is('ceremony_email_sent_at', null)
    .is('ceremony_completed_at', null)

  if (error) {
    console.error('[ceremony-email-sender] Failed to query eligible users:', error)
    return { processed: 0, sent: 0, errors: [error.message] }
  }

  if (!eligibleUsers || eligibleUsers.length === 0) {
    return { processed: 0, sent: 0, errors: [] }
  }

  const errors: string[] = []
  let sent = 0

  // Process each eligible user
  for (const progress of eligibleUsers) {
    try {
      // Get user email from auth
      const { data: authData, error: authError } = await supabase.auth.admin.getUserById(progress.user_id)

      if (authError || !authData.user?.email) {
        errors.push(`Failed to get email for user ${progress.user_id}`)
        continue
      }

      // Get product type from user_intake
      const { data: intakeData } = await supabase
        .from('user_intake')
        .select('product_types')
        .eq('user_id', progress.user_id)
        .single()

      const user: CeremonyEmailUser = {
        id: progress.user_id,
        email: authData.user.email,
        product_types: intakeData?.product_types || null,
      }

      await sendCeremonyEmail(user)
      sent++

      // Update ceremony_email_sent_at timestamp
      await supabase
        .from('user_progress')
        .update({
          ceremony_email_sent_at: now.toISOString(),
        })
        .eq('user_id', progress.user_id)

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      errors.push(`Failed to send ceremony email to user ${progress.user_id}: ${message}`)
      console.error(`[ceremony-email-sender] Failed to process user ${progress.user_id}:`, err)
    }
  }

  return {
    processed: eligibleUsers.length,
    sent,
    errors,
  }
}

/**
 * Send a ceremony nudge email via Resend
 */
async function sendCeremonyEmail(user: CeremonyEmailUser): Promise<void> {
  const resend = getResendClient()
  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl || 'https://getunhooked.app'

  const dashboardUrl = `${appUrl}/dashboard`
  const productText = getProductText(user.product_types)

  const { error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: user.email,
    subject: 'Your final session is ready',
    html: buildEmailHtml(dashboardUrl, productText),
    text: buildEmailText(dashboardUrl, productText),
  })

  if (error) {
    throw new Error(`Resend error: ${error.message}`)
  }

  console.log(`[ceremony-email-sender] Sent ceremony nudge email to ${user.email}`)
}

/**
 * Get product-specific text for email
 */
function getProductText(productTypes: string[] | null): string {
  if (!productTypes || productTypes.length === 0) {
    return 'Have your nicotine products nearby'
  }

  // Map product types to friendly names
  const productMap: Record<string, string> = {
    'vape': 'vape',
    'cigarettes': 'cigarettes',
    'pouches': 'pouches',
    'chewing-tobacco': 'chewing tobacco',
    'cigars': 'cigars',
    'other': 'nicotine products',
  }

  const friendlyNames = productTypes
    .map(type => productMap[type] || 'nicotine products')
    .filter((value, index, self) => self.indexOf(value) === index) // unique

  if (friendlyNames.length === 1) {
    return `Have your ${friendlyNames[0]} nearby`
  } else if (friendlyNames.length === 2) {
    return `Have your ${friendlyNames[0]} or ${friendlyNames[1]} nearby`
  } else {
    return 'Have your nicotine products nearby'
  }
}

/**
 * Build HTML email content
 */
function buildEmailHtml(dashboardUrl: string, productText: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your final session is ready</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #041f21;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #041f21; padding: 40px 20px;">
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
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 600; margin: 0;">Your final session is ready</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <p style="color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6; margin: 0;">
                You've seen through all five illusions.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 16px;">
              <p style="color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6; margin: 0;">
                ${productText}. Set aside 15 minutes. Find a quiet space.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <p style="color: rgba(255, 255, 255, 0.85); font-size: 16px; line-height: 1.6; margin: 0;">
                This is a moment worth being present for.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #fc4a1a, #f7b733); color: #ffffff; text-decoration: none; font-weight: 600; padding: 14px 32px; border-radius: 9999px; font-size: 16px;">
                Begin Ceremony
              </a>
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
function buildEmailText(dashboardUrl: string, productText: string): string {
  return `UNHOOKED

Your final session is ready

You've seen through all five illusions.

${productText}. Set aside 15 minutes. Find a quiet space.

This is a moment worth being present for.

Begin Ceremony: ${dashboardUrl}`
}
