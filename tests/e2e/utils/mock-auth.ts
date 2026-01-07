import type { Page } from '@playwright/test'

// Test user credentials from environment
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test-user@test.local'
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

/**
 * Login as test user
 *
 * NOTE: With the Playwright storageState setup, tests already have auth.
 * This function is mainly for tests that explicitly need to re-authenticate
 * or for backwards compatibility.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  if (!E2E_TEST_PASSWORD) {
    throw new Error('E2E_TEST_PASSWORD environment variable is required')
  }

  // Navigate to the test login page with credentials
  const loginUrl = `/test-login?email=${encodeURIComponent(E2E_TEST_EMAIL)}&password=${encodeURIComponent(E2E_TEST_PASSWORD)}&redirect=/dashboard`
  await page.goto(loginUrl)

  // Wait for redirect to dashboard or onboarding
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 })
}

/**
 * Check if already authenticated by looking for auth indicators
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.goto('/dashboard', { waitUntil: 'networkidle' })
    const url = page.url()
    return !url.includes('/login')
  } catch {
    return false
  }
}

/**
 * Ensure user is logged out
 */
export async function logout(page: Page): Promise<void> {
  // Clear cookies first
  const context = page.context()
  await context.clearCookies()

  // Navigate to a page so we can access localStorage
  await page.goto('/')

  // Clear storage
  await page.evaluate(() => {
    try {
      localStorage.clear()
      sessionStorage.clear()
    } catch {
      // Ignore if storage access fails
    }
  })
}

/**
 * No authentication - useful for testing login redirects
 * Just ensures a clean state with no auth
 */
export async function ensureLoggedOut(page: Page): Promise<void> {
  await logout(page)
}

// Keep these for backwards compatibility with existing tests
export const MOCK_USER = {
  email: E2E_TEST_EMAIL,
}

export function getMockUser() {
  return { email: E2E_TEST_EMAIL }
}

// Alias for clearer naming - with storageState these may be no-ops
export const mockAuth = loginAsTestUser
export const mockNoAuth = ensureLoggedOut
