import { test as setup, expect } from '@playwright/test'

const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test-user@test.local'
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

const authFile = 'playwright/.auth/user.json'

/**
 * This setup runs once before all tests to authenticate.
 * It saves the browser storage state (cookies, localStorage) to a file
 * that other tests can reuse, avoiding re-authentication for each test.
 */
setup('authenticate', async ({ page }) => {
  if (!E2E_TEST_PASSWORD) {
    throw new Error('E2E_TEST_PASSWORD environment variable is required for E2E tests')
  }

  // Navigate to the test login page
  await page.goto(`/test-login?email=${encodeURIComponent(E2E_TEST_EMAIL)}&password=${encodeURIComponent(E2E_TEST_PASSWORD)}&redirect=/dashboard`)

  // Wait for successful redirect (either dashboard or onboarding depending on user state)
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30000 })

  // Verify we're authenticated by checking we're not on login page
  expect(page.url()).not.toContain('/login')

  // Wait for the page to fully load and Supabase to store the session
  await page.waitForLoadState('networkidle')

  // Give Supabase a moment to persist the session
  await page.waitForTimeout(1000)

  // Save storage state to file for other tests to use
  await page.context().storageState({ path: authFile })
})
