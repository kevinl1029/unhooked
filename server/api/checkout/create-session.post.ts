import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  const stripe = new Stripe(config.stripeSecretKey)

  // Get UTM params from request body
  const body = await readBody(event)
  const {
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    referrer
  } = body || {}

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: config.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${config.public.appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.public.appUrl}/checkout/cancel`,

      // Collect customer info
      customer_creation: 'always',

      // Custom message on checkout
      custom_text: {
        submit: {
          message: "You'll receive a welcome email with next steps within 24 hours.",
        },
      },

      // Store attribution data for analytics
      metadata: {
        product: 'founding_member',
        landing_page_variant: 'v1',
        utm_source: utm_source || '',
        utm_medium: utm_medium || '',
        utm_campaign: utm_campaign || '',
        utm_term: utm_term || '',
        utm_content: utm_content || '',
        referrer: referrer || '',
      },
    })

    return { url: session.url }
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    throw createError({
      statusCode: 500,
      message: 'Failed to create checkout session',
    })
  }
})
