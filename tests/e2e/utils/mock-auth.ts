import type { Page } from '@playwright/test'

export const MOCK_USER = {
  id: 'mock-user-id-12345',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}

export const MOCK_SESSION = {
  access_token: 'mock-access-token-for-testing',
  refresh_token: 'mock-refresh-token-for-testing',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: MOCK_USER,
}

/**
 * Mock Supabase authentication by setting localStorage and intercepting auth endpoints
 */
export async function mockAuth(page: Page): Promise<void> {
  // Get the Supabase URL from environment or use a placeholder
  // The actual key name depends on your Supabase project
  const storageKey = 'sb-localhost-auth-token'

  // Set up auth state before navigation
  await page.addInitScript((args) => {
    const { storageKey, session } = args
    localStorage.setItem(storageKey, JSON.stringify(session))
  }, { storageKey, session: MOCK_SESSION })

  // Intercept Supabase auth API calls
  await page.route('**/_supabase/**', async (route) => {
    const url = route.request().url()

    // Handle session refresh
    if (url.includes('/auth/v1/token')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_SESSION),
      })
      return
    }

    // Handle user fetch
    if (url.includes('/auth/v1/user')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_USER),
      })
      return
    }

    // Let other requests through
    await route.continue()
  })

  // Also intercept direct Supabase API calls (for serverSupabaseUser)
  await page.route('**/rest/v1/**', async (route) => {
    // Add auth header validation mock if needed
    await route.continue()
  })
}

/**
 * Mock unauthenticated state - useful for testing login redirects
 */
export async function mockNoAuth(page: Page): Promise<void> {
  const storageKey = 'sb-localhost-auth-token'

  await page.addInitScript((key) => {
    localStorage.removeItem(key)
  }, storageKey)

  // Intercept auth calls and return unauthorized
  await page.route('**/_supabase/**/auth/**', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Unauthorized' }),
    })
  })
}

/**
 * Get mock user data for assertions
 */
export function getMockUser() {
  return MOCK_USER
}

/**
 * Get mock session data for assertions
 */
export function getMockSession() {
  return MOCK_SESSION
}
