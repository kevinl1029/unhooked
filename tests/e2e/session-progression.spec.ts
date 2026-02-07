/**
 * Session Progression & Program State Tests (P1)
 *
 * Verifies that:
 * - Completing a session advances the user to the next illusion on the dashboard
 * - All illusions complete shows "Begin Ceremony" CTA
 * - Dashboard renders correctly for each program state
 */

import { test, expect } from '@playwright/test'
import { mockIntakeAPI, mockUserInProgress } from './utils'
import { mockChatAPI, mockConversationsAPI, mockUserStatusAPI } from './utils/mock-session'
import {
  mockCheckInInterstitial,
  mockDashboardMoments,
  mockTimezoneAPI,
} from './utils/mock-check-in'

/**
 * Set up all mocks needed for the dashboard to render in a given state.
 * Uses mockUserStatusAPI (which mocks /api/user/status) — the endpoint
 * the dashboard actually calls via useUserStatus().
 */
async function setupDashboard(
  page: import('@playwright/test').Page,
  statusOptions: Parameters<typeof mockUserStatusAPI>[1] = {},
) {
  await mockUserStatusAPI(page, statusOptions)
  await mockIntakeAPI(page)
  await mockCheckInInterstitial(page, { hasPending: false })
  await mockDashboardMoments(page)
  await mockTimezoneAPI(page)
}

test.describe('Session Progression & Program State', () => {
  test('dashboard updates after session completion', async ({ page }) => {
    // ── Set up session page mocks (illusion 1 in progress) ──
    await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
    await mockConversationsAPI(page, [])
    await mockChatAPI(page, [
      { responseText: 'Welcome to your first session.', conversationId: 'mock-conv-1' },
      {
        responseText: 'Great work today. You now see through the stress illusion.',
        conversationId: 'mock-conv-1',
        sessionComplete: true,
      },
    ])

    // ── Set up dashboard mocks (post-completion state: illusion 2) ──
    // These mock different endpoints than the session page, so no conflict.
    await mockUserStatusAPI(page, {
      phase: 'in_progress',
      currentIllusion: 2,
      illusionsCompleted: [1],
      totalSessions: 1,
    })
    await mockCheckInInterstitial(page, { hasPending: false })
    await mockDashboardMoments(page)
    await mockTimezoneAPI(page)

    // ── Complete a session ──
    await page.goto('/session/1?mode=text')
    await expect(page.getByText(/Welcome to your first session/)).toBeVisible({ timeout: 15000 })

    // Send a message to trigger the completion response
    const textarea = page.getByPlaceholder('Type your message...')
    await textarea.fill('I understand now')
    await page.getByRole('button', { name: 'Send message' }).click()

    // Wait for session complete card
    await expect(page.getByText('Session Complete')).toBeVisible({ timeout: 15000 })

    // Click "Return to Dashboard"
    await page.getByRole('button', { name: /Return to Dashboard/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    // ── Verify dashboard shows updated progress ──
    // Should show 1 of 5 completed (illusion 1 done)
    await expect(page.getByText(/1.*(of|\/)\s*5/i)).toBeVisible({ timeout: 10000 })
  })

  test('all illusions complete shows ceremony-ready state', async ({ page }) => {
    await setupDashboard(page, {
      phase: 'ceremony_ready',
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })

    await page.goto('/dashboard')

    // Should show the ceremony-ready CTA
    await expect(page.getByText(/you're ready for the final step/i)).toBeVisible({
      timeout: 10000,
    })

    // Should have a "Begin Ceremony" link
    const ceremonyLink = page.getByRole('link', { name: /begin ceremony/i })
    await expect(ceremonyLink).toBeVisible()
    await expect(ceremonyLink).toHaveAttribute('href', '/ceremony')
  })

  test.describe('Program status transitions render correctly', () => {
    test('not_started shows welcome and "Begin First Session" CTA', async ({ page }) => {
      await setupDashboard(page, {
        phase: 'not_started',
        currentIllusion: 1,
        illusionsCompleted: [],
        totalSessions: 0,
      })

      await page.goto('/dashboard')

      await expect(page.getByText(/welcome to your journey/i)).toBeVisible({ timeout: 10000 })
      await expect(page.getByRole('link', { name: /begin first session/i })).toBeVisible()
    })

    test('in_progress shows progress carousel with session navigation', async ({ page }) => {
      await setupDashboard(page, {
        phase: 'in_progress',
        currentIllusion: 3,
        illusionsCompleted: [1, 2],
        totalSessions: 2,
      })

      await page.goto('/dashboard')

      // Should show progress (2 of 5)
      await expect(page.getByText(/2.*(of|\/)\s*5/i)).toBeVisible({ timeout: 10000 })
    })

    test('ceremony_ready shows "Begin Ceremony" as primary CTA', async ({ page }) => {
      await setupDashboard(page, {
        phase: 'ceremony_ready',
        currentIllusion: 5,
        illusionsCompleted: [1, 2, 3, 4, 5],
        totalSessions: 5,
      })

      await page.goto('/dashboard')

      await expect(page.getByText(/you're ready for the final step/i)).toBeVisible({
        timeout: 10000,
      })
      await expect(page.getByRole('link', { name: /begin ceremony/i })).toBeVisible()

      // Should NOT show "Begin First Session" (that's for not_started)
      await expect(page.getByRole('link', { name: /begin first session/i })).not.toBeVisible()
    })

    test('post_ceremony shows support section and artifacts', async ({ page }) => {
      // For post-ceremony, we need a custom mock that includes artifacts
      await mockIntakeAPI(page)
      await mockCheckInInterstitial(page, { hasPending: false })
      await mockDashboardMoments(page)
      await mockTimezoneAPI(page)

      const completedAt = new Date().toISOString()
      await page.route('**/api/user/status', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue()
          return
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            phase: 'post_ceremony',
            progress: {
              program_status: 'completed',
              current_illusion: 5,
              illusions_completed: [1, 2, 3, 4, 5],
              illusion_order: [1, 2, 3, 4, 5],
              total_sessions: 5,
              started_at: completedAt,
              completed_at: completedAt,
            },
            ceremony: {
              completed_at: completedAt,
              already_quit: true,
            },
            artifacts: {
              reflective_journey: {
                id: 'mock-journey-id',
                artifact_type: 'reflective_journey',
                audio_duration_ms: 120000,
              },
              illusions_cheat_sheet: {
                id: 'mock-cheat-sheet-id',
                artifact_type: 'illusions_cheat_sheet',
              },
            },
            pending_follow_ups: null,
            next_session: null,
            illusion_last_sessions: null,
          }),
        })
      })

      // Mock follow-ups endpoint (dashboard may fetch this)
      await page.route('**/api/follow-ups/pending', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        })
      })

      await page.goto('/dashboard')

      // Post-ceremony should NOT show "Begin First Session" or "Begin Ceremony"
      await expect(page.getByRole('link', { name: /begin first session/i })).not.toBeVisible({
        timeout: 10000,
      })
      await expect(page.getByRole('link', { name: /begin ceremony/i })).not.toBeVisible()

      // Should show artifact cards (Your Journey, Your Toolkit)
      await expect(page.getByText(/your journey/i).first()).toBeVisible({ timeout: 10000 })
      await expect(page.getByText(/your toolkit/i)).toBeVisible()
    })
  })
})
