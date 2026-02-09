import { test as base } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const sessionFile = path.join(process.cwd(), 'playwright/.auth/session.json')

type CustomFixtures = {
  /**
   * Set to true to skip injecting the Supabase auth token into localStorage.
   * Use this for tests that verify unauthenticated behavior.
   *
   * Example:
   *   test.use({ storageState: { cookies: [], origins: [] }, noAuth: true })
   */
  noAuth: boolean
}

/**
 * Extended Playwright test that injects the Supabase auth token into
 * localStorage via context.addInitScript on every page navigation.
 *
 * This solves the well-known timing race where Supabase's JS client reads
 * localStorage during initialization, but Playwright's storageState
 * restoration hasn't completed yet — causing intermittent auth failures.
 *
 * The addInitScript runs synchronously before ANY page JavaScript, so the
 * token is guaranteed to be present when Supabase initializes.
 *
 * Usage:
 *   import { test, expect } from './fixtures'
 *
 *   // Authenticated test (default):
 *   test('dashboard loads', async ({ page }) => { ... })
 *
 *   // Unauthenticated test:
 *   test.use({ storageState: { cookies: [], origins: [] }, noAuth: true })
 *   test('redirects to login', async ({ page }) => { ... })
 */
export const test = base.extend<CustomFixtures>({
  noAuth: [false, { option: true }],

  context: async ({ context, noAuth }, use) => {
    if (!noAuth && fs.existsSync(sessionFile)) {
      try {
        const { storageKey, session } = JSON.parse(
          fs.readFileSync(sessionFile, 'utf-8')
        )

        if (storageKey && session) {
          await context.addInitScript(
            ({ key, sessionData }: { key: string; sessionData: unknown }) => {
              window.localStorage.setItem(key, JSON.stringify(sessionData))
            },
            { key: storageKey, sessionData: session }
          )
        }
      } catch {
        // Session file is malformed or unreadable — fall back to storageState only
      }
    }

    await use(context)
  },
})

export { expect } from '@playwright/test'
