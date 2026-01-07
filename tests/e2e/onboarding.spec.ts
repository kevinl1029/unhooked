import { test, expect } from '@playwright/test'
import { mockNewUser, mockIntakeAPI } from './utils'

test.describe('Onboarding', () => {
  test.describe('Welcome Screen', () => {
    test('shows welcome message and Let\'s Go button', async ({ page }) => {
      await mockNewUser(page)

      await page.goto('/onboarding')

      await expect(page.getByText('Welcome to Unhooked')).toBeVisible()
      await expect(page.getByRole('button', { name: /let's go/i })).toBeVisible()
    })

    test('clicking Let\'s Go shows intake form', async ({ page }) => {
      await mockNewUser(page)

      await page.goto('/onboarding')

      await page.getByRole('button', { name: /let's go/i }).click()

      // Should now show the first step of intake form
      await expect(page.getByText(/product|type|vape|cigarette/i).first()).toBeVisible()
    })
  })

  test.describe('Intake Form Steps', () => {
    test.beforeEach(async ({ page }) => {
      await mockNewUser(page)
      await mockIntakeAPI(page)

      await page.goto('/onboarding')
      await page.getByRole('button', { name: /let's go/i }).click()
    })

    test('Step 1: can select product type and continue', async ({ page }) => {
      // Select a product type (vape)
      await page.getByText(/vape|vaping/i).first().click()

      // Click continue/next
      const continueButton = page.getByRole('button', { name: /continue|next/i })
      await expect(continueButton).toBeEnabled()
      await continueButton.click()

      // Should advance to step 2 (usage frequency)
      await expect(page.getByText(/how often|frequency|usage/i).first()).toBeVisible()
    })

    test('Step 1: can select multiple product types', async ({ page }) => {
      // Select multiple products
      await page.getByText(/vape|vaping/i).first().click()
      await page.getByText(/cigarette/i).first().click()

      // Both should be selected (visual check - they should have selected state)
      const continueButton = page.getByRole('button', { name: /continue|next/i })
      await expect(continueButton).toBeEnabled()
    })

    test('Step 2: can select usage frequency', async ({ page }) => {
      // Complete step 1
      await page.getByText(/vape|vaping/i).first().click()
      await page.getByRole('button', { name: /continue|next/i }).click()

      // Step 2: Select usage frequency
      await page.getByText(/multiple times|several times|daily/i).first().click()

      await page.getByRole('button', { name: /continue|next/i }).click()

      // Should advance to step 3
      await expect(page.getByText(/quit|attempt|tried/i).first()).toBeVisible()
    })

    test('can navigate back through steps', async ({ page }) => {
      // Go to step 2
      await page.getByText(/vape|vaping/i).first().click()
      await page.getByRole('button', { name: /continue|next/i }).click()

      // Click back button
      const backButton = page.getByRole('button', { name: /back/i })
      await backButton.click()

      // Should be back at step 1
      await expect(page.getByText(/product|type|what do you use/i).first()).toBeVisible()
    })

    test('Step 4: primary reason selection', async ({ page }) => {
      // Navigate to step 4 (complete steps 1-3)
      // Step 1
      await page.getByText(/vape|vaping/i).first().click()
      await page.getByRole('button', { name: /continue|next/i }).click()

      // Step 2
      await page.getByText(/multiple times|several times|daily/i).first().click()
      await page.getByRole('button', { name: /continue|next/i }).click()

      // Step 3 (optional - can skip or fill)
      await page.getByRole('button', { name: /continue|next|skip/i }).click()

      // Step 4: Primary reason
      await expect(page.getByText(/reason|why|stress|relax/i).first()).toBeVisible()

      // Select stress relief
      await page.getByText(/stress|relax|calm/i).first().click()

      await page.getByRole('button', { name: /continue|next/i }).click()

      // Should advance to step 5
      await expect(page.getByText(/trigger|when|situation/i).first()).toBeVisible()
    })
  })

  test.describe('Form Submission', () => {
    test('completing all steps redirects to dashboard', async ({ page }) => {
      await mockNewUser(page)
      await mockIntakeAPI(page)

      await page.goto('/onboarding')
      await page.getByRole('button', { name: /let's go/i }).click()

      // Complete all 5 steps
      // Step 1: Product type
      await page.getByText(/vape|vaping/i).first().click()
      await page.getByRole('button', { name: /continue|next/i }).click()

      // Step 2: Usage frequency
      await page.getByText(/multiple times|several times|daily/i).first().click()
      await page.getByRole('button', { name: /continue|next/i }).click()

      // Step 3: Quit history (optional)
      await page.getByRole('button', { name: /continue|next|skip/i }).click()

      // Step 4: Primary reason
      await page.getByText(/stress|relax|calm/i).first().click()
      await page.getByRole('button', { name: /continue|next/i }).click()

      // Step 5: Triggers (optional) - Submit
      await page.getByRole('button', { name: /start|submit|journey|finish/i }).click()

      // Should redirect to dashboard
      await expect(page).toHaveURL('/dashboard')
    })
  })
})
