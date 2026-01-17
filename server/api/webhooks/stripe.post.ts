import Stripe from 'stripe'
import { Resend } from 'resend'
import { serverSupabaseServiceRole } from '#supabase/server'

// Email sender configuration (easy to find and update)
const EMAIL_SENDER_NAME = 'Kevin from Unhooked'
const EMAIL_SENDER_ADDRESS = 'kevin@getunhooked.app'
const EMAIL_REPLY_TO = 'kevin@getunhooked.app'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  // Debug: log config presence (not values)
  console.log('Webhook config check:', {
    hasStripeKey: !!config.stripeSecretKey,
    hasResendKey: !!config.resendApiKey,
    resendKeyPrefix: config.resendApiKey?.substring(0, 6),
    sendEmails: config.sendEmails,
  })

  const stripe = new Stripe(config.stripeSecretKey)

  const resend = new Resend(config.resendApiKey)

  // Get raw body for signature verification
  const body = await readRawBody(event)
  const signature = getHeader(event, 'stripe-signature')

  if (!body || !signature) {
    throw createError({ statusCode: 400, message: 'Missing body or signature' })
  }

  // Verify webhook signature
  let stripeEvent: Stripe.Event
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripeWebhookSecret
    )
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    throw createError({ statusCode: 400, message: 'Invalid signature' })
  }

  // Handle checkout.session.completed event
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session

    if (session.payment_status === 'paid') {
      const supabase = serverSupabaseServiceRole(event)

      const email = session.customer_details?.email
      const name = session.customer_details?.name
      const metadata = session.metadata || {}

      if (!email) {
        console.error('No email in checkout session:', session.id)
        return { received: true }
      }

      // 1. Upsert into founding_members table (idempotent for webhook retries)
      const { error: dbError } = await supabase
        .from('founding_members')
        .upsert({
          stripe_session_id: session.id,
          stripe_customer_id: session.customer as string,
          stripe_payment_intent_id: session.payment_intent as string,
          email: email,
          name: name,
          amount_paid: session.amount_total,
          currency: session.currency,
          paid_at: new Date(session.created * 1000).toISOString(),
          utm_source: metadata.utm_source || null,
          utm_medium: metadata.utm_medium || null,
          utm_campaign: metadata.utm_campaign || null,
          utm_term: metadata.utm_term || null,
          utm_content: metadata.utm_content || null,
          referrer: metadata.referrer || null,
          landing_page_variant: metadata.landing_page_variant || 'v1',
        }, {
          onConflict: 'stripe_session_id',
          ignoreDuplicates: true
        })

      if (dbError) {
        console.error('Failed to insert founding member:', dbError)
        // Fail the webhook so Stripe retries - data consistency is critical
        throw createError({ statusCode: 500, message: 'Database insert failed' })
      }

      // 2. Add to Resend audience (if configured)
      if (config.resendAudienceId) {
        try {
          await resend.contacts.create({
            email: email,
            firstName: name?.split(' ')[0] || '',
            lastName: name?.split(' ').slice(1).join(' ') || '',
            audienceId: config.resendAudienceId,
          })
          // Small delay to avoid Resend rate limit (2 req/sec on free tier)
          await new Promise(resolve => setTimeout(resolve, 600))
        } catch (err) {
          console.error('Failed to add to Resend audience:', err)
        }
      }

      // 3. Send welcome email (controlled by feature flag)
      const shouldSendEmails = config.sendEmails !== 'false'
      const firstName = name?.split(' ')[0] || 'there'

      if (shouldSendEmails) {
        try {
          const { data, error: emailError } = await resend.emails.send({
            from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
            to: email,
            replyTo: EMAIL_REPLY_TO,
            subject: "Welcome to Unhooked — You're In",
            html: getWelcomeEmailHtml(firstName),
          })

          if (emailError) {
            console.error('Resend API error:', emailError)
            // Don't update welcome_email_sent if there was an error
          } else {
            console.log('Welcome email sent successfully:', data?.id)
            // Update email sent status only on success
            await supabase
              .from('founding_members')
              .update({
                welcome_email_sent: true,
                welcome_email_sent_at: new Date().toISOString(),
              })
              .eq('stripe_session_id', session.id)
          }

        } catch (err) {
          console.error('Failed to send welcome email:', err)
        }
      } else {
        console.log('Email sending disabled (SEND_EMAILS=false). Would have sent welcome email to:', email)
      }
    }
  }

  return { received: true }
})

// Email template
function getWelcomeEmailHtml(firstName: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <h1 style="color: #0D9488; margin-bottom: 24px;">Welcome to Unhooked, ${firstName}.</h1>

  <p>You're officially a founding member. Thank you for believing in this before it even exists.</p>

  <p>Here's what happens next:</p>

  <ul style="padding-left: 20px;">
    <li><strong>Your access is being prepared.</strong> You'll be among the first to experience Unhooked when it launches in April 2026.</li>
    <li><strong>I'll be in touch personally.</strong> As a founding member, you have a direct line to me. Reply to this email anytime.</li>
    <li><strong>Your feedback will shape the product.</strong> I'll reach out before launch to learn more about your experience with nicotine.</li>
  </ul>

  <p>In the meantime, if you have questions or just want to say hi, hit reply. I read every message.</p>

  <p style="margin-top: 32px;">
    — Kevin<br>
    <span style="color: #666; font-size: 14px;">Founder, Unhooked</span>
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="font-size: 12px; color: #999;">
    You're receiving this because you purchased founding member access to Unhooked.
    If you have questions about your purchase, reply to this email.
  </p>

</body>
</html>
  `.trim()
}
