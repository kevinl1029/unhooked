import { test, expect } from '@playwright/test'
import { getMockUser } from './utils'
import { mockUserInProgress, mockNewUser } from './utils'

test.describe('Authentication', () => {
  test.describe('Protected Routes', () => {
    // These tests need to bypass the storageState auth
    test.use({ storageState: { cookies: [], origins: [] } })

    test('unauthenticated user is redirected from dashboard to login', async ({ page }) => {
      await page.goto('/dashboard')
      await expect(page).toHaveURL('/login')
    })

    test('unauthenticated user is redirected from onboarding to login', async ({ page }) => {
      await page.goto('/onboarding')
      await expect(page).toHaveURL('/login')
    })

    test('unauthenticated user is redirected from session page to login', async ({ page }) => {
      await page.goto('/session/1')
      await expect(page).toHaveURL('/login')
    })
  })

  test.describe('Authenticated Access', () => {
    // These tests use the storageState auth from setup
    test('authenticated user can access dashboard', async ({ page }) => {
      // Mock API responses for a user in progress
      await mockUserInProgress(page)

      await page.goto('/dashboard')

      // Should stay on dashboard, not redirect
      await expect(page).toHaveURL('/dashboard')
    })

    test('authenticated user sees their email in header', async ({ page }) => {
      await mockUserInProgress(page)

      await page.goto('/dashboard')

      const mockUser = getMockUser()
      await expect(page.getByText(mockUser.email)).toBeVisible()
    })

    test('authenticated user can see sign out button', async ({ page }) => {
      await mockUserInProgress(page)

      await page.goto('/dashboard')

      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible()
    })
  })

  test.describe('New User Flow', () => {
    test('new user without intake is redirected to onboarding', async ({ page }) => {
      // Mock API to return null for intake/progress (new user)
      await mockNewUser(page)

      await page.goto('/dashboard')

      // Should redirect to onboarding since no intake exists
      await expect(page).toHaveURL('/onboarding')
    })
  })
})
