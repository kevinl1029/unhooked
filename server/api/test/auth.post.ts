import { serverSupabaseServiceRole } from '#supabase/server'

/**
 * Test-only endpoint to authenticate E2E test user
 *
 * SECURITY: This endpoint only works in non-production environments
 * and requires the correct test credentials from environment variables.
 *
 * Returns session tokens that the client can use to set the session.
 */
export default defineEventHandler(async (event) => {
  // Block in production
  if (process.env.NODE_ENV === 'production') {
    throw createError({ statusCode: 403, message: 'Not available in production' })
  }

  const body = await readBody(event)
  const { email, password } = body

  // Validate required fields
  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email and password required' })
  }

  // Only allow the designated test user
  const config = useRuntimeConfig()
  const testEmail = config.e2eTestEmail
  const testPassword = config.e2eTestPassword

  if (!testEmail || !testPassword) {
    throw createError({
      statusCode: 500,
      message: 'E2E test credentials not configured in runtimeConfig'
    })
  }

  if (email !== testEmail || password !== testPassword) {
    throw createError({ statusCode: 401, message: 'Invalid test credentials' })
  }

  // Use service role to sign in as the test user
  const supabase = serverSupabaseServiceRole(event)

  // Sign in with password
  let data, error
  try {
    const result = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    data = result.data
    error = result.error
  } catch (e: any) {
    throw createError({
      statusCode: 500,
      message: `Supabase auth error: ${e.message || 'Unknown error'}`
    })
  }

  if (error) {
    throw createError({ statusCode: 401, message: `Auth failed: ${error.message}` })
  }

  if (!data.session) {
    throw createError({ statusCode: 500, message: 'No session returned' })
  }

  // Return the session tokens for the client to use
  return {
    success: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
    user: {
      id: data.user?.id,
      email: data.user?.email,
    },
  }
})
