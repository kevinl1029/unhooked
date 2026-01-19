import Stripe from 'stripe'
import { Resend } from 'resend'
import { serverSupabaseServiceRole } from '#supabase/server'

// Email sender configuration (easy to find and update)
const EMAIL_SENDER_NAME = 'Kevin from Unhooked'
const EMAIL_SENDER_ADDRESS = 'kevin@getunhooked.app'
const EMAIL_REPLY_TO = 'kevin@getunhooked.app'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

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

      // 1. Try to insert the founding member record
      // If this session was already processed, the unique constraint will cause an error
      const { error: dbError } = await supabase
        .from('founding_members')
        .insert({
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
        })

      // Check for unique constraint violation (code 23505) - means duplicate webhook
      if (dbError) {
        if (dbError.code === '23505') {
          console.log('Session already processed (duplicate webhook), skipping:', session.id)
          return { received: true }
        }
        console.error('Failed to insert founding member:', dbError)
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
        } catch (err) {
          console.error('Failed to add to Resend audience:', err)
        }
        // Delay to avoid Resend rate limit (2 req/sec on free tier)
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // 3. Send welcome email (controlled by feature flag)
      const shouldSendEmails = config.sendEmails !== 'false'
      const firstName = name?.split(' ')[0] || 'there'

      if (shouldSendEmails) {
        try {
          const { error: emailError } = await resend.emails.send({
            from: `${EMAIL_SENDER_NAME} <${EMAIL_SENDER_ADDRESS}>`,
            to: email,
            replyTo: EMAIL_REPLY_TO,
            subject: "You just made the hardest part easy",
            html: getWelcomeEmailHtml(firstName),
          })

          if (emailError) {
            console.error('Resend API error:', emailError)
          } else {
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

  <p style="font-size: 18px; margin-bottom: 24px;">Hey ${firstName}!</p>

  <p>You just did something most people never do — you decided to stop <em>wanting</em> nicotine, not just stop using it.</p>

  <p>That shift is <em>everything</em>.</p>

  <p>Unhooked isn't about willpower or white-knuckling through cravings. It's about dismantling the mental hooks that make you feel like you need nicotine in the first place. By the time you finish, you won't be resisting cigarettes or vapes — you simply won't want them!</p>

  <p>That's the transformation waiting for you.</p>

  <p><strong>What happens next:</strong></p>

  <ul style="padding-left: 20px;">
    <li><strong>You're in the first wave.</strong> Unhooked launches in April 2026, and as a founding member, you get early access!</li>
    <li><strong>I'll reach out before launch</strong> to learn about your experience with nicotine — your input will directly shape how this works.</li>
    <li><strong>You have a direct line to me.</strong> Reply anytime. I read every message.</li>
  </ul>

  <p>A few months from now, you'll look back at this moment as the start of something different. Not because you fought your way through — but because you realized a "fight" wasn't the right approach in the first place!</p>

  <p>I'm excited to build this with you.</p>

  <p style="margin-top: 32px;">
    Talk soon,<br>
    Kevin<br>
    <span style="color: #666; font-size: 14px;">Founder, Unhooked</span>
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">

  <p style="font-size: 12px; color: #999;">
    You're receiving this because you became a founding member of Unhooked. Questions about your purchase? Just reply.
  </p>

</body>
</html>
  `.trim()
}
