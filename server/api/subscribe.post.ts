import { Resend } from 'resend'
import { serverSupabaseServiceRole } from '#supabase/server'

// Email sender configuration (consistent with founding member emails)
const EMAIL_SENDER_NAME = 'Kevin from Unhooked'
const EMAIL_SENDER_ADDRESS = 'kevin@getunhooked.app'
const EMAIL_REPLY_TO = 'kevin@getunhooked.app'

// Simple in-memory rate limiting (resets on server restart)
// Acceptable for MVP - Vercel's serverless architecture means this won't be 100% reliable
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 3 // requests per window
const RATE_WINDOW = 60 * 60 * 1000 // 1 hour in ms

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return false
  }

  if (record.count >= RATE_LIMIT) {
    return true
  }

  record.count++
  return false
}

// Email validation helper
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function getWelcomeEmailHtml(): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #333; font-size: 16px; line-height: 1.6;">
      <p style="margin: 0 0 24px 0;">Hey,</p>

      <p style="margin: 0 0 24px 0;">You're in! When Unhooked launches, you'll be first to know—and you'll have access to our founding member price of $199 (instead of $299).</p>

      <p style="margin: 0 0 24px 0;"><strong>Here's what Unhooked is:</strong></p>

      <p style="margin: 0 0 24px 0;">A 10-14 day voice-guided program that helps you become someone who genuinely doesn't want nicotine anymore. No patches. No willpower battles. No white-knuckling through cravings.</p>

      <p style="margin: 0 0 24px 0;">Instead, we systematically dismantle the five psychological illusions that make you think you need nicotine—until the desire simply isn't there.</p>

      <p style="margin: 0 0 24px 0;"><strong>What happens next:</strong></p>

      <p style="margin: 0 0 24px 0;">I'll email you when we're ready to open doors. Founding member spots are limited, so keep an eye out.</p>

      <p style="margin: 0 0 24px 0;">Talk soon,<br>Kevin<br>Founder, Unhooked</p>

      <p style="margin: 0 0 24px 0;">P.S. — Have questions before launch? Just reply to this email.</p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 40px 0;">

      <p style="font-size: 14px; color: #666; margin: 0 0 12px 0;">
        <a href="https://getunhooked.app" style="color: #0891b2;">getunhooked.app</a>
      </p>

      <p style="font-size: 12px; color: #999; margin: 0;">
        You're receiving this because you signed up at getunhooked.app.<br>
        Reply to this email if you'd like to unsubscribe.
      </p>
    </div>
  `
}

// Send welcome email and add to Resend audience
async function sendWelcomeEmailAndAddToAudience(
  resend: Resend,
  config: ReturnType<typeof useRuntimeConfig>,
  email: string
): Promise<void> {
  const shouldSendEmails = config.sendEmails !== 'false'

  // Add to Resend audience (same audience as founding members)
  if (config.resendAudienceId) {
    try {
      await resend.contacts.create({
        email: email,
        audienceId: config.resendAudienceId,
      })
    } catch (err) {
      console.error('Failed to add to Resend audience:', err)
      // Don't fail the request - contact might already exist
    }
  }

  // Send welcome email
  if (shouldSendEmails) {
    try {
      await resend.emails.send({
        from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
        to: email,
        replyTo: EMAIL_REPLY_TO,
        subject: "You're on the list",
        html: getWelcomeEmailHtml()
      })
    } catch (emailError) {
      // Log but don't fail - subscription is still saved
      console.error('Failed to send welcome email:', emailError)
    }
  } else {
    console.log('Email sending disabled (SEND_EMAILS=false). Would have sent welcome email to:', email)
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Get client info early for rate limiting
  const headers = getHeaders(event)
  const ipAddress = headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                    headers['x-real-ip'] ||
                    'unknown'

  // Check rate limit
  if (isRateLimited(ipAddress)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many attempts. Try again later.'
    })
  }

  // Initialize Supabase with service role key (bypasses RLS)
  const supabase = serverSupabaseServiceRole(event)

  // Initialize Resend
  const resend = new Resend(config.resendApiKey)

  // Get request body
  const body = await readBody(event)
  const { email, source, utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer } = body

  // Validate email
  if (!email || !isValidEmail(email)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Please enter a valid email address'
    })
  }

  const normalizedEmail = email.toLowerCase().trim()
  const userAgent = headers['user-agent'] || 'unknown'

  // Build metadata with UTM params
  const metadata: Record<string, string> = {}
  if (utm_source) metadata.utm_source = utm_source
  if (utm_medium) metadata.utm_medium = utm_medium
  if (utm_campaign) metadata.utm_campaign = utm_campaign
  if (utm_term) metadata.utm_term = utm_term
  if (utm_content) metadata.utm_content = utm_content
  if (referrer) metadata.referrer = referrer

  try {
    // Check if already subscribed
    const { data: existing } = await supabase
      .from('mailing_list')
      .select('id, unsubscribed_at, email_status')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      // Already exists - check status
      if (!existing.unsubscribed_at && existing.email_status === 'active') {
        // Active subscriber - return friendly message, no new email
        return {
          success: true,
          alreadySubscribed: true,
          message: "You're already on the list"
        }
      }

      // Re-subscribing (was unsubscribed or bounced) - update record
      const { error: updateError } = await supabase
        .from('mailing_list')
        .update({
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
          email_status: 'active',
          bounce_type: null,
          status_updated_at: new Date().toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
          source: source || 'landing_page_nurture',
          metadata
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error('Database update error:', updateError)
        throw createError({
          statusCode: 500,
          statusMessage: 'Something went wrong. Please try again.'
        })
      }

      // Send welcome email for re-subscribers (same email as new subscribers)
      await sendWelcomeEmailAndAddToAudience(resend, config, normalizedEmail)

      return {
        success: true,
        alreadySubscribed: false,
        message: 'Check your inbox'
      }
    }

    // New subscriber - UPSERT to handle race conditions (double-click, network retry)
    const { error: insertError } = await supabase
      .from('mailing_list')
      .upsert({
        email: normalizedEmail,
        source: source || 'landing_page_nurture',
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata
      }, {
        onConflict: 'email',
        ignoreDuplicates: true
      })

    if (insertError) {
      console.error('Database insert error:', insertError)
      throw createError({
        statusCode: 500,
        statusMessage: 'Something went wrong. Please try again.'
      })
    }

    // Send welcome email and add to Resend audience
    await sendWelcomeEmailAndAddToAudience(resend, config, normalizedEmail)

    return {
      success: true,
      alreadySubscribed: false,
      message: 'Check your inbox'
    }

  } catch (error: unknown) {
    // Re-throw if already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) throw error

    console.error('Subscription error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Something went wrong. Please try again.'
    })
  }
})
