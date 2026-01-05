import { test, expect } from '@playwright/test'

test.describe('Navigation', () => {
  test('clicking brand logo navigates to home', async ({ page }) => {
    await page.goto('/login')

    // Click the brand logo/name in the header
    await page.getByRole('link', { name: 'Unhooked' }).click()

    // Should be back on home page
    await expect(page).toHaveURL('/')
  })

  test('login page is accessible', async ({ page }) => {
    await page.goto('/login')

    // Login page should load without errors
    await expect(page.locator('body')).toBeVisible()
  })

  test('unauthenticated users are redirected from dashboard', async ({ page }) => {
    // Try to access protected route
    await page.goto('/dashboard')

    // Should be redirected to login
    await expect(page).toHaveURL('/login')
  })
})
