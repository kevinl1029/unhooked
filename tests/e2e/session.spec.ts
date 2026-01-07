import { test, expect } from '@playwright/test'
import { mockUserInProgress, mockChatAPI, mockAllAPIs } from './utils'
import { getFullResponse } from './fixtures/llm-responses'

test.describe('Myth Sessions', () => {
  test.describe('Session Start', () => {
    test('session page loads for authenticated user', async ({ page }) => {
      await mockUserInProgress(page, { currentMyth: 1 })
      await mockAllAPIs(page, 'greeting')

      await page.goto('/session/1')

      // Should show session interface
      await expect(page.locator('body')).toBeVisible()
      // Should not redirect away
      await expect(page).toHaveURL(/\/session\/1/)
    })

    test('AI sends greeting message to start conversation', async ({ page }) => {
      await mockUserInProgress(page, { currentMyth: 1 })
      await mockChatAPI(page, { scenario: 'greeting' })

      await page.goto('/session/1')

      // Wait for AI greeting to appear
      const greetingText = getFullResponse('greeting')
      // Check for part of the greeting
      await expect(page.getByText(/glad you're here|courage/i)).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Chat Interaction', () => {
    test('user can send a text message', async ({ page }) => {
      await mockUserInProgress(page, { currentMyth: 1 })
      await mockChatAPI(page, { scenario: 'normal' })

      await page.goto('/session/1')

      // Find and fill the chat input
      const chatInput = page.getByPlaceholder(/message|type|write/i)
      await chatInput.fill('I use nicotine when I feel stressed')

      // Send the message
      const sendButton = page.getByRole('button', { name: /send/i })
      await sendButton.click()

      // User message should appear
      await expect(page.getByText('I use nicotine when I feel stressed')).toBeVisible()
    })

    test('AI responds to user message', async ({ page }) => {
      await mockUserInProgress(page, { currentMyth: 1 })
      await mockChatAPI(page, { scenario: 'normal' })

      await page.goto('/session/1')

      // Send a message
      const chatInput = page.getByPlaceholder(/message|type|write/i)
      await chatInput.fill('I need help understanding my addiction')
      await page.getByRole('button', { name: /send/i }).click()

      // Wait for AI response
      await expect(page.getByText(/important insight|exactly the same/i)).toBeVisible({ timeout: 10000 })
    })

    test('chat input is cleared after sending', async ({ page }) => {
      await mockUserInProgress(page, { currentMyth: 1 })
      await mockChatAPI(page, { scenario: 'normal' })

      await page.goto('/session/1')

      const chatInput = page.getByPlaceholder(/message|type|write/i)
      await chatInput.fill('Test message')
      await page.getByRole('button', { name: /send/i }).click()

      // Input should be cleared
      await expect(chatInput).toHaveValue('')
    })
  })

  test.describe('Session Completion', () => {
    test('shows completion card when session ends', async ({ page }) => {
      await mockUserInProgress(page, { currentMyth: 1, mythsCompleted: [] })
      await mockChatAPI(page, { scenario: 'session-complete' })

      await page.goto('/session/1')

      // Send a message to trigger AI response with SESSION_COMPLETE
      const chatInput = page.getByPlaceholder(/message|type|write/i)
      await chatInput.fill('I understand now')
      await page.getByRole('button', { name: /send/i }).click()

      // Wait for session complete card
      await expect(page.getByText(/complete|finished|great work|incredible/i)).toBeVisible({ timeout: 10000 })
    })

    test('SESSION_COMPLETE token is not shown to user', async ({ page }) => {
      await mockUserInProgress(page, { currentMyth: 1 })
      await mockChatAPI(page, { scenario: 'session-complete' })

      await page.goto('/session/1')

      // Trigger completion
      const chatInput = page.getByPlaceholder(/message|type|write/i)
      await chatInput.fill('I get it now')
      await page.getByRole('button', { name: /send/i }).click()

      // Wait for response
      await page.waitForTimeout(1000)

      // The token should NOT be visible
      await expect(page.getByText('[SESSION_COMPLETE]')).not.toBeVisible()
    })

    test('completion card has continue button', async ({ page }) => {
      await mockUserInProgress(page, { currentMyth: 1, mythsCompleted: [] })
      await mockChatAPI(page, { scenario: 'session-complete' })

      await page.goto('/session/1')

      // Trigger completion
      const chatInput = page.getByPlaceholder(/message|type|write/i)
      await chatInput.fill('Done')
      await page.getByRole('button', { name: /send/i }).click()

      // Wait for completion card
      await expect(page.getByRole('link', { name: /continue|next|dashboard/i })).toBeVisible({ timeout: 10000 })
    })
  })

  test.describe('Free Myth Access', () => {
    test('user can access any myth session directly', async ({ page }) => {
      await mockUserInProgress(page, { currentMyth: 1, mythsCompleted: [] })
      await mockAllAPIs(page, 'greeting')

      // Access myth 3 directly even though current is 1
      await page.goto('/session/3')

      // Should load without redirect
      await expect(page).toHaveURL(/\/session\/3/)
    })
  })

  test.describe('Navigation', () => {
    test('has link to exit/return to dashboard', async ({ page }) => {
      await mockUserInProgress(page, { currentMyth: 1 })
      await mockAllAPIs(page, 'normal')

      await page.goto('/session/1')

      // Should have exit/back link
      const exitLink = page.getByRole('link', { name: /exit|back|dashboard|leave/i })
      await expect(exitLink).toBeVisible()
    })
  })
})
