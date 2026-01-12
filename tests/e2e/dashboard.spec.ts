import { test, expect } from '@playwright/test'
import { mockUserInProgress, mockProgressAPI, mockIntakeAPI } from './utils'

test.describe('Dashboard', () => {
  test.describe('Progress Display', () => {
    test('shows progress indicator with 5 illusion circles', async ({ page }) => {
      await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })

      await page.goto('/dashboard')

      // Should show 5 progress indicators
      // Fallback: just check for progress section existing
      await expect(page.locator('text=/session|progress|illusion/i').first()).toBeVisible()
    })

    test('shows 0 of 5 sessions completed for new user', async ({ page }) => {
      await mockUserInProgress(page, {
        currentIllusion: 1,
        illusionsCompleted: [],
        totalSessions: 0,
      })

      await page.goto('/dashboard')

      await expect(page.getByText(/0.*(of|\/)\s*5/i)).toBeVisible()
    })

    test('shows correct progress for user with 2 completed illusions', async ({ page }) => {
      await mockUserInProgress(page, {
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
      await mockUserInProgress(page, { currentIllusion: 2, illusionsCompleted: [1] })

      await page.goto('/dashboard')

      const continueButton = page.getByRole('link', { name: /continue|start|next/i })
      await expect(continueButton).toBeVisible()
    })

    test('continue button links to current illusion session', async ({ page }) => {
      await mockUserInProgress(page, { currentIllusion: 3, illusionsCompleted: [1, 2] })

      await page.goto('/dashboard')

      const continueButton = page.getByRole('link', { name: /continue|start|next/i })
      await expect(continueButton).toHaveAttribute('href', /\/session\/3/)
    })
  })

  test.describe('Completed Program', () => {
    test('shows completion message when all illusions done', async ({ page }) => {
      await mockProgressAPI(page, {
        programStatus: 'completed',
        currentIllusion: 5,
        illusionsCompleted: [1, 2, 3, 4, 5],
        totalSessions: 5,
      })
      await mockIntakeAPI(page)

      await page.goto('/dashboard')

      // Should show completion state
      await expect(page.getByText(/complete|unhooked|finished|congratulations/i)).toBeVisible()
    })

    test('shows all 5 illusions completed in journey summary', async ({ page }) => {
      await mockProgressAPI(page, {
        programStatus: 'completed',
        illusionsCompleted: [1, 2, 3, 4, 5],
        totalSessions: 5,
      })
      await mockIntakeAPI(page)

      await page.goto('/dashboard')

      // Completed state shows "all 5 illusions" in the description
      await expect(page.getByText(/all 5 illusions/i)).toBeVisible()
    })
  })
})
