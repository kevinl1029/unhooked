import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  test('displays the landing page with correct content', async ({ page }) => {
    await page.goto('/')

    // Check for brand name
    await expect(page.locator('h1')).toContainText('Unhooked')

    // Check for tagline
    await expect(page.getByText('Break Free Forever')).toBeVisible()

    // Check for value proposition
    await expect(
      page.getByText('Break free from nicotine')
    ).toBeVisible()
  })

  test('has a Get Started button that links to login', async ({ page }) => {
    await page.goto('/')

    const getStartedButton = page.getByRole('link', { name: 'Get Started' })
    await expect(getStartedButton).toBeVisible()

    // Verify it links to login
    await expect(getStartedButton).toHaveAttribute('href', '/login')
  })

  test('header contains navigation to login', async ({ page }) => {
    await page.goto('/')

    const loginLink = page.getByRole('link', { name: 'Continue your journey' })
    await expect(loginLink).toBeVisible()
  })
})

test.describe('Health Check API', () => {
  test('returns healthy status', async ({ request }) => {
    const response = await request.get('/api/health')

    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.version).toBe('1.0.0')
    expect(body.timestamp).toBeDefined()
  })
})
