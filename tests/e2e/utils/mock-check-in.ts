import type { Page } from '@playwright/test'

// ──────────────────────────────────────────────
// Check-In Interstitial Mocking
// ──────────────────────────────────────────────

export interface MockInterstitialOptions {
  hasPending?: boolean
  checkIn?: {
    id: string
    prompt: string
    type: string
  }
}

/**
 * Mock `GET /api/check-ins/interstitial` — used on dashboard mount.
 *
 * Pass `hasPending: true` with a `checkIn` object to trigger the
 * interstitial modal on the dashboard.
 */
export async function mockCheckInInterstitial(
  page: Page,
  options: MockInterstitialOptions = {},
): Promise<void> {
  await page.route('**/api/check-ins/interstitial', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    if (options.hasPending && options.checkIn) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          has_pending: true,
          check_in: options.checkIn,
        }),
      })
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ has_pending: false }),
      })
    }
  })
}

// ──────────────────────────────────────────────
// Check-In Detail API
// ──────────────────────────────────────────────

export interface MockCheckInOptions {
  id?: string
  prompt?: string
  type?: 'morning' | 'evening' | 'post_session'
  status?: 'scheduled' | 'sent' | 'opened' | 'completed' | 'skipped'
}

/**
 * Mock `GET /api/check-ins/:id` — returns check-in data with personalized prompt.
 */
export async function mockCheckInAPI(
  page: Page,
  options: MockCheckInOptions = {},
): Promise<void> {
  const checkInId = options.id || 'test-check-in-123'

  await page.route(`**/api/check-ins/${checkInId}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        check_in: {
          id: checkInId,
          user_id: 'mock-user-id',
          scheduled_for: new Date(Date.now() - 5 * 60_000).toISOString(),
          timezone: 'America/New_York',
          check_in_type: options.type || 'morning',
          prompt_template: options.prompt || 'How are you feeling today?',
          status: options.status || 'scheduled',
          magic_link_token: 'mock-token',
          email_sent_at: null,
          opened_at: null,
          response_conversation_id: null,
        },
        prompt: options.prompt || 'How are you feeling today?',
      }),
    })
  })
}

/**
 * Mock `GET /api/check-ins/:id` to return 404 (invalid / not found).
 */
export async function mockCheckInNotFound(
  page: Page,
  checkInId: string = 'invalid-id',
): Promise<void> {
  await page.route(`**/api/check-ins/${checkInId}`, async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Check-in not found' }),
    })
  })
}

// ──────────────────────────────────────────────
// Check-In Action Mocking (skip / complete)
// ──────────────────────────────────────────────

/**
 * Mock `POST /api/check-ins/:id/skip`
 */
export async function mockCheckInSkip(
  page: Page,
  checkInId: string = 'test-check-in-123',
): Promise<void> {
  await page.route(`**/api/check-ins/${checkInId}/skip`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock `POST /api/check-ins/:id/complete`
 */
export async function mockCheckInComplete(
  page: Page,
  checkInId: string = 'test-check-in-123',
): Promise<void> {
  await page.route(`**/api/check-ins/${checkInId}/complete`, async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    } else {
      await route.continue()
    }
  })
}

// ──────────────────────────────────────────────
// Dashboard Helper Mocks (for check-in tests)
// ──────────────────────────────────────────────

/**
 * Mock `GET /api/dashboard/moments` — returns null (no moments).
 */
export async function mockDashboardMoments(page: Page): Promise<void> {
  await page.route('**/api/dashboard/moments', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(null),
    })
  })
}

/**
 * Mock `POST /api/user/timezone` — accepts timezone detection silently.
 */
export async function mockTimezoneAPI(page: Page): Promise<void> {
  await page.route('**/api/user/timezone', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    } else {
      await route.continue()
    }
  })
}
