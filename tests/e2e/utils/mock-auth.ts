import type { Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

// Test user credentials from environment
const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test-user@test.local'
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''

const SESSION_FILE = path.join(process.cwd(), 'playwright/.auth/session.json')

/**
 * Login as test user by injecting the saved session into localStorage.
 *
 * NOTE: With the custom fixture's addInitScript, tests already have auth
 * injected before every page load. This function is for tests that need
 * to re-authenticate mid-test (e.g., after clearing cookies).
 *
 * Falls back to the /test-login page if the session file isn't available.
 */
export async function loginAsTestUser(page: Page): Promise<void> {
  // Prefer session file injection (fast, no UI dependency)
  if (fs.existsSync(SESSION_FILE)) {
    const { storageKey, session } = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'))
    if (storageKey && session) {
      await page.evaluate(
        ({ key, sessionData }) => {
          window.localStorage.setItem(key, JSON.stringify(sessionData))
        },
        { key: storageKey, sessionData: session }
      )
      await page.reload()
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15000 })
      return
    }
  }

  // Fallback: use the /test-login page
  if (!E2E_TEST_PASSWORD) {
    throw new Error('E2E_TEST_PASSWORD environment variable is required')
  }
  const loginUrl = `/test-login?email=${encodeURIComponent(E2E_TEST_EMAIL)}&password=${encodeURIComponent(E2E_TEST_PASSWORD)}&redirect=/dashboard`
  await page.goto(loginUrl)
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
