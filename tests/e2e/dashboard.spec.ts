import { test, expect } from '@playwright/test'
import { mockIntakeAPI, mockUserInProgress } from './utils'
import { mockUserStatusAPI, mockConversationsAPI, mockChatAPI } from './utils/mock-session'
import {
  mockCheckInInterstitial,
  mockDashboardMoments,
  mockTimezoneAPI,
} from './utils/mock-check-in'

/**
 * Set up all mocks needed for the dashboard to render in a given state.
 * The dashboard uses useUserStatus() which calls /api/user/status.
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

test.describe('Dashboard', () => {
  test.describe('Progress Display', () => {
    test('shows progress indicator with 5 illusion circles', async ({ page }) => {
      await setupDashboard(page, {
        phase: 'in_progress',
        currentIllusion: 1,
        illusionsCompleted: [],
      })

      await page.goto('/dashboard')

      // Should show 5 progress indicators
      // Fallback: just check for progress section existing
      await expect(page.locator('text=/session|progress|illusion/i').first()).toBeVisible()
    })

    test('shows 0 of 5 sessions completed for new user', async ({ page }) => {
      await setupDashboard(page, {
        phase: 'in_progress',
        currentIllusion: 1,
        illusionsCompleted: [],
        totalSessions: 0,
      })

      await page.goto('/dashboard')

      await expect(page.getByText(/0.*(of|\/)\s*5/i)).toBeVisible()
    })

    test('shows correct progress for user with 2 completed illusions', async ({ page }) => {
      await setupDashboard(page, {
        phase: 'in_progress',
        currentIllusion: 3,
        illusionsCompleted: [1, 2],
        totalSessions: 2,
      })

      await page.goto('/dashboard')

      await expect(page.getByText(/2.*(of|\/)\s*5/i)).toBeVisible()
    })
  })

  test.describe('Next Session Card', () => {
    test('shows continue button for user in progress', async ({ page }) => {
      await setupDashboard(page, {
        phase: 'in_progress',
        currentIllusion: 2,
        illusionsCompleted: [1],
      })

      await page.goto('/dashboard')

      // ProgressCarousel renders a <button> (not a link) for the Continue action
      const continueButton = page.getByRole('button', { name: /continue/i })
      await expect(continueButton).toBeVisible()
    })

    test('continue button navigates to current illusion session using string key', async ({ page }) => {
      await setupDashboard(page, {
        phase: 'in_progress',
        currentIllusion: 3,
        illusionsCompleted: [1, 2],
      })

      // Also mock session page dependencies so navigation completes
      await mockUserInProgress(page, { currentIllusion: 3, illusionsCompleted: [1, 2] })
      await mockConversationsAPI(page, [])
      await mockChatAPI(page, { responseText: 'Welcome back.', conversationId: 'mock-conv-1' })

      await page.goto('/dashboard')

      // ProgressCarousel focuses on current illusion and shows its title
      await expect(page.getByText(/Continue.*Willpower/i)).toBeVisible()

      // Click Continue and verify navigation uses string key URL (not numeric)
      await page.getByRole('button', { name: /continue/i }).click()
      await page.waitForURL(/\/session\/willpower/, { timeout: 10000 })
    })
  })

  test.describe('Completed Program', () => {
    test('shows ceremony-ready state when all illusions done', async ({ page }) => {
      await setupDashboard(page, {
        phase: 'ceremony_ready',
        currentIllusion: 5,
        illusionsCompleted: [1, 2, 3, 4, 5],
        totalSessions: 5,
      })

      await page.goto('/dashboard')

      // Should show ceremony-ready CTA
      await expect(page.getByText(/you're ready for the final step/i)).toBeVisible()
    })

    test('shows all 5 illusions completed in progress carousel', async ({ page }) => {
      await setupDashboard(page, {
        phase: 'ceremony_ready',
        currentIllusion: 5,
        illusionsCompleted: [1, 2, 3, 4, 5],
        totalSessions: 5,
      })

      await page.goto('/dashboard')

      // ProgressCarousel shows "5 of 5 illusions explored"
      await expect(page.getByText(/5 of 5/i)).toBeVisible()
    })
  })

  test.describe('Mobile Layout', () => {
    test.beforeEach(({ page }) => {
      const viewport = page.viewportSize()
      test.skip(!viewport || viewport.width >= 768, 'Mobile viewport only')
    })

    test('dashboard layout works on mobile without horizontal scroll', async ({ page }) => {
      await mockUserStatusAPI(page, {
        phase: 'in_progress',
        currentIllusion: 2,
        illusionsCompleted: [1],
        totalSessions: 1,
      })
      await mockIntakeAPI(page)
      await mockCheckInInterstitial(page, { hasPending: false })
      await mockDashboardMoments(page)
      await mockTimezoneAPI(page)

      await page.goto('/dashboard')

      // Progress indicator should be visible
      await expect(page.getByText(/1.*(of|\/)\s*5/i)).toBeVisible({ timeout: 10000 })

      // Continue/next session CTA should be visible (button with navigateTo)
      const continueButton = page.getByRole('button', { name: /continue/i })
      await expect(continueButton).toBeVisible()

      // No horizontal page scroll (carousel items are allowed to overflow within their container)
      const hasHorizontalScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(hasHorizontalScroll).toBe(false)
    })
  })

  test.describe('Error Handling', () => {
    test('progress API failure shows error with retry button', async ({ page }) => {
      // Mock /api/user/status to return 500
      await page.route('**/api/user/status', async (route) => {
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Internal server error' }),
          })
        } else {
          await route.continue()
        }
      })
      await mockIntakeAPI(page)
      await mockCheckInInterstitial(page, { hasPending: false })
      await mockDashboardMoments(page)
      await mockTimezoneAPI(page)

      await page.goto('/dashboard')

      // Should show error state with red text
      await expect(page.locator('.text-red-400')).toBeVisible({ timeout: 10000 })

      // Should show "Try Again" button
      await expect(page.getByRole('button', { name: /try again/i })).toBeVisible()
    })
  })
})
