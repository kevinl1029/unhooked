import { test, expect } from '@playwright/test'

test.describe('Home Page', () => {
  // Home page tests need to bypass auth - authenticated users get redirected to dashboard
  test.use({ storageState: { cookies: [], origins: [] } })

  test('displays the landing page with correct content', async ({ page }) => {
    await page.goto('/')

    // Check for hero headline
    await expect(page.locator('h1')).toContainText('nicotine')

    // Check for hero subtitle
    await expect(page.getByText(/walking past your vape/i)).toBeVisible()
  })

  test('has a primary CTA button', async ({ page }) => {
    await page.goto('/')

    // Hero has "I'm ready" or "Get Early Access" button (depends on checkout mode)
    const ctaButton = page.locator('.hero-actions button, .hero-actions a').first()
    await expect(ctaButton).toBeVisible()
  })

  test('has a secondary CTA to see how it works', async ({ page }) => {
    await page.goto('/')

    const howItWorksLink = page.getByText(/show me how it works/i)
    await expect(howItWorksLink).toBeVisible()
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
