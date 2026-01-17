import Stripe from 'stripe'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const sessionId = query.session_id as string

  if (!sessionId) {
    throw createError({ statusCode: 400, message: 'Missing session_id' })
  }

  const stripe = new Stripe(config.stripeSecretKey)

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    // Only return safe, non-sensitive data
    return {
      email: session.customer_details?.email || null,
      name: session.customer_details?.name || null,
      amount: session.amount_total,
      currency: session.currency,
      status: session.payment_status,
    }
  } catch (err: any) {
    console.error('Failed to retrieve session:', err)
    throw createError({ statusCode: 404, message: 'Session not found' })
  }
})
