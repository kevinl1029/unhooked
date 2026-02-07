import { test, expect } from '@playwright/test'
import { mockIntakeAPI } from './utils'
import {
  mockCheckInAPI,
  mockCheckInNotFound,
  mockCheckInSkip,
  mockCheckInInterstitial,
  mockDashboardMoments,
  mockTimezoneAPI,
} from './utils/mock-check-in'
import { mockUserStatusAPI } from './utils/mock-session'

test.describe('Check-In System', () => {
  // ────────────────────────────────────────────
  // Direct Check-In Page (/check-in/[id])
  // ────────────────────────────────────────────

  test.describe('Check-In Page', () => {
    test('loads with prompt from query parameter', async ({ page }) => {
      const prompt = 'How are you feeling this morning?'

      await page.goto(`/check-in/test-123?prompt=${encodeURIComponent(prompt)}`)

      // Eyebrow text
      await expect(page.getByText('CHECK-IN')).toBeVisible({ timeout: 10000 })

      // Prompt text
      await expect(page.getByText(prompt)).toBeVisible()

      // Ready-state UI
      await expect(page.getByText('Tap to respond')).toBeVisible()

      // Skip option
      await expect(page.getByRole('button', { name: /Skip for now/i })).toBeVisible()
    })

    test('loads prompt from API when no query parameter', async ({ page }) => {
      const apiPrompt = 'Had any thoughts since we last talked?'

      await mockCheckInAPI(page, {
        id: 'api-check-in-456',
        prompt: apiPrompt,
        type: 'post_session',
      })

      await page.goto('/check-in/api-check-in-456')

      // Should fetch prompt from API and display it
      await expect(page.getByText(apiPrompt)).toBeVisible({ timeout: 10000 })
      await expect(page.getByText('CHECK-IN')).toBeVisible()
      await expect(page.getByText('Tap to respond')).toBeVisible()
    })

    test('invalid check-in ID shows error state', async ({ page }) => {
      await mockCheckInNotFound(page, 'nonexistent-id')

      await page.goto('/check-in/nonexistent-id')

      // Error state should display (use heading role to avoid strict-mode on duplicate text)
      await expect(page.getByRole('heading', { name: 'Check-in Not Found' })).toBeVisible({ timeout: 10000 })

      // Should offer navigation back to dashboard
      await expect(page.getByRole('link', { name: /Return to Dashboard/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Return to Dashboard/i })).toHaveAttribute(
        'href',
        '/dashboard',
      )
    })

    test('check-in API server error shows error state', async ({ page }) => {
      // Mock the check-in API to return 500
      await page.route('**/api/check-ins/server-error-123', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue()
          return
        }
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Internal server error' }),
        })
      })

      await page.goto('/check-in/server-error-123')

      // Error state should display
      await expect(page.getByRole('heading', { name: 'Check-in Not Found' })).toBeVisible({ timeout: 10000 })

      // Should offer navigation back to dashboard
      await expect(page.getByRole('link', { name: /Return to Dashboard/i })).toBeVisible()
      await expect(page.getByRole('link', { name: /Return to Dashboard/i })).toHaveAttribute(
        'href',
        '/dashboard',
      )
    })

    test('skip button navigates to dashboard', async ({ page }) => {
      await mockCheckInSkip(page, 'skip-test-123')

      // Also mock dashboard APIs so the redirect target loads without errors
      await mockUserStatusAPI(page, { phase: 'in_progress', currentIllusion: 2, illusionsCompleted: [1] })
      await mockIntakeAPI(page)
      await mockCheckInInterstitial(page, { hasPending: false })
      await mockDashboardMoments(page)
      await mockTimezoneAPI(page)

      await page.goto('/check-in/skip-test-123?prompt=How+are+you+feeling%3F')

      // Wait for ready state
      await expect(page.getByText('Tap to respond')).toBeVisible({ timeout: 10000 })

      // Click skip
      await page.getByRole('button', { name: /Skip for now/i }).click()

      // Should navigate to dashboard
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
    })
  })

  // ────────────────────────────────────────────
  // Dashboard Interstitial
  // ────────────────────────────────────────────

  test.describe('Dashboard Interstitial', () => {
    const pendingCheckIn = {
      id: 'interstitial-check-in-789',
      prompt: 'Good morning. How are you feeling about today?',
      type: 'morning',
    }

    /**
     * Set up all mocks needed for the dashboard to render with a pending
     * check-in interstitial.
     */
    async function setupDashboardWithInterstitial(page: import('@playwright/test').Page) {
      await mockUserStatusAPI(page, {
        phase: 'in_progress',
        currentIllusion: 2,
        illusionsCompleted: [1],
        totalSessions: 1,
      })
      await mockIntakeAPI(page)
      await mockCheckInInterstitial(page, {
        hasPending: true,
        checkIn: pendingCheckIn,
      })
      await mockDashboardMoments(page)
      await mockTimezoneAPI(page)
    }

    test('pending check-in shows interstitial modal on dashboard', async ({ page }) => {
      await setupDashboardWithInterstitial(page)

      await page.goto('/dashboard')

      // Interstitial eyebrow text
      await expect(page.getByText('QUICK THOUGHT FOR YOU...')).toBeVisible({ timeout: 15000 })

      // Prompt text in the modal
      await expect(page.getByText(pendingCheckIn.prompt)).toBeVisible()

      // Tap to respond hint
      await expect(page.getByText('Tap to respond')).toBeVisible()

      // Skip option
      await expect(page.getByRole('button', { name: /Skip for now/i })).toBeVisible()
    })

    test('skip button on interstitial closes modal', async ({ page }) => {
      await setupDashboardWithInterstitial(page)
      await mockCheckInSkip(page, pendingCheckIn.id)

      await page.goto('/dashboard')

      // Wait for interstitial to appear
      await expect(page.getByText('QUICK THOUGHT FOR YOU...')).toBeVisible({ timeout: 15000 })

      // Click skip
      await page.getByRole('button', { name: /Skip for now/i }).click()

      // Modal should close — eyebrow text should disappear
      await expect(page.getByText('QUICK THOUGHT FOR YOU...')).not.toBeVisible({ timeout: 5000 })
    })
  })
})
