import { test as setup, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const E2E_TEST_EMAIL = process.env.E2E_TEST_EMAIL || 'e2e-test-user@test.local'
const E2E_TEST_PASSWORD = process.env.E2E_TEST_PASSWORD || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''

const AUTH_DIR = path.join(process.cwd(), 'playwright/.auth')
const authFile = path.join(AUTH_DIR, 'user.json')
const sessionFile = path.join(AUTH_DIR, 'session.json')

function getSupabaseStorageKey(url: string): string {
  const hostname = new URL(url).hostname
  const projectRef = hostname.split('.')[0]
  return `sb-${projectRef}-auth-token`
}

/**
 * Authentication setup that runs once before all tests.
 *
 * Strategy (API-based + addInitScript):
 * 1. Call /api/test/auth to get a full Supabase session via HTTP (no UI needed).
 * 2. Save the session to a JSON file for the custom fixture's addInitScript.
 * 3. Inject the token into a browser context's localStorage via addInitScript,
 *    then navigate to a public page so Supabase's client sets cookies for SSR auth.
 * 4. Save storageState (cookies + localStorage) so tests start authenticated.
 *
 * This replaces the older /test-login page approach which was slower and
 * suffered from Supabase's localStorage timing race condition.
 */
setup('authenticate', async ({ request, browser }) => {
  if (!E2E_TEST_PASSWORD) {
    throw new Error('E2E_TEST_PASSWORD environment variable is required for E2E tests')
  }
  if (!SUPABASE_URL) {
    throw new Error(
      'SUPABASE_URL environment variable is required for auth setup. ' +
      'Ensure it is set in .env or .env.local.'
    )
  }

  const storageKey = getSupabaseStorageKey(SUPABASE_URL)

  // Step 1: Get session tokens via API (fast, no UI interaction needed)
  const response = await request.post('/api/test/auth', {
    data: { email: E2E_TEST_EMAIL, password: E2E_TEST_PASSWORD },
  })
  expect(response.ok(), `Auth API returned ${response.status()}: ${response.statusText()}`).toBeTruthy()

  const authData = await response.json()
  expect(authData.session, 'Auth API did not return a session').toBeTruthy()
  expect(authData.session.access_token, 'Session missing access_token').toBeTruthy()

  // Save session data for the custom fixture's addInitScript injection
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })
  fs.writeFileSync(
    sessionFile,
    JSON.stringify({ storageKey, session: authData.session })
  )

  // Step 2: Set session in a browser context to capture cookies for SSR auth.
  // addInitScript ensures the token is in localStorage BEFORE Supabase's JS client
  // initializes, eliminating the well-known timing race condition.
  const context = await browser.newContext()
  await context.addInitScript(
    ({ key, session }: { key: string; session: unknown }) => {
      window.localStorage.setItem(key, JSON.stringify(session))
    },
    { key: storageKey, session: authData.session }
  )

  const page = await context.newPage()

  // Navigate to a public page so the Supabase client initializes, picks up
  // the localStorage token, and sets cookies for server-side auth.
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // Save storage state (cookies + localStorage) for test reuse
  await context.storageState({ path: authFile })
  await context.close()
})
