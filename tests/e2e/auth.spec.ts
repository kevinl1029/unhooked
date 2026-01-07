import { test, expect } from '@playwright/test'
import { mockAuth, mockNoAuth, getMockUser } from './utils'
import { mockUserInProgress, mockNewUser } from './utils'

test.describe('Authentication', () => {
  test.describe('Protected Routes', () => {
    test('unauthenticated user is redirected from dashboard to login', async ({ page }) => {
      await mockNoAuth(page)

      await page.goto('/dashboard')

      await expect(page).toHaveURL('/login')
    })

    test('unauthenticated user is redirected from onboarding to login', async ({ page }) => {
      await mockNoAuth(page)

      await page.goto('/onboarding')

      await expect(page).toHaveURL('/login')
    })

    test('unauthenticated user is redirected from session page to login', async ({ page }) => {
      await mockNoAuth(page)

      await page.goto('/session/1')

      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('Authenticated Access', () => {
    test('authenticated user can access dashboard', async ({ page }) => {
      await mockAuth(page)
      await mockUserInProgress(page)

      await page.goto('/dashboard')

      // Should stay on dashboard, not redirect
      await expect(page).toHaveURL('/dashboard')
    })

    test('authenticated user sees their email in header', async ({ page }) => {
      await mockAuth(page)
      await mockUserInProgress(page)

      await page.goto('/dashboard')

      const mockUser = getMockUser()
      await expect(page.getByText(mockUser.email)).toBeVisible()
    })

    test('authenticated user can see sign out button', async ({ page }) => {
      await mockAuth(page)
      await mockUserInProgress(page)

      await page.goto('/dashboard')

      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
    })
  })

  test.describe('New User Flow', () => {
    test('new user without intake is redirected to onboarding', async ({ page }) => {
      await mockAuth(page)
      await mockNewUser(page)

      await page.goto('/dashboard')

      // Should redirect to onboarding since no intake exists
      await expect(page).toHaveURL('/onboarding')
    })
  })
})
