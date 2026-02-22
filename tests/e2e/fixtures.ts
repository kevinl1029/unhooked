import { test as base } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const sessionFile = path.join(process.cwd(), 'playwright/.auth/session.json')

type CustomFixtures = {
  /**
   * Set to true to skip injecting the Supabase auth token into browser cookies.
   * Use this for tests that verify unauthenticated behavior.
   *
   * Example:
   *   test.use({ storageState: { cookies: [], origins: [] }, noAuth: true })
   */
  noAuth: boolean
}

/**
 * Encode a session JSON string into the @supabase/ssr cookie value format.
 *
 * @supabase/ssr stores sessions as: "base64-" + base64url(JSON.stringify(session))
 * where base64url uses the URL-safe alphabet (- and _ instead of + and /) with no padding.
 */
function encodeSupabaseCookieValue(sessionJson: string): string {
  const b64 = Buffer.from(sessionJson, 'utf8').toString('base64')
  return 'base64-' + b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Extended Playwright test that injects the Supabase auth session cookie into
 * the browser context before any page navigation.
 *
 * @nuxtjs/supabase v2 uses @supabase/ssr's createBrowserClient which stores
 * sessions in COOKIES (not localStorage). The server plugin reads cookies from
 * HTTP request headers for SSR auth. Using context.addCookies() ensures the
 * cookie is present in HTTP requests before the server processes them, which
 * allows the SSR auth middleware to find the user and not redirect to /login.
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
          // Encode session in @supabase/ssr cookie format and inject into browser context.
          // context.addCookies() sets the cookie BEFORE HTTP requests are made, so the
          // cookie is present in SSR request headers when the auth middleware checks the user.
          const cookieValue = encodeSupabaseCookieValue(JSON.stringify(session))
          await context.addCookies([{
            name: storageKey,
            value: cookieValue,
            domain: 'localhost',
            path: '/',
            sameSite: 'Lax',
            expires: session.expires_at ?? -1,
            httpOnly: false,
            secure: false,
          }])
        }
      } catch {
        // Session file is malformed or unreadable — fall back to storageState only
      }
    }

    await use(context)
  },
})

export { expect } from '@playwright/test'
