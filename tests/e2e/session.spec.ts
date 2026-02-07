import { test, expect } from '@playwright/test'
import { mockUserInProgress } from './utils'
import { mockChatAPI, mockConversationsAPI } from './utils/mock-session'

test.describe('Session Conversation Flow', () => {
  test.describe('Text Mode', () => {
    test('session page loads with AI opening message', async ({ page }) => {
      await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
      await mockConversationsAPI(page, [])
      await mockChatAPI(page, {
        responseText: 'Welcome to your first session. Let\'s explore the stress illusion together.',
        conversationId: 'mock-conv-1',
      })

      await page.goto('/session/1?mode=text')

      // The page title should show the illusion name
      await expect(page.getByText('The Stress Illusion')).toBeVisible({ timeout: 10000 })

      // AI opening message should stream in and display
      await expect(
        page.getByText(/Welcome to your first session/),
      ).toBeVisible({ timeout: 15000 })
    })

    test('text input accepts user message and receives AI response', async ({ page }) => {
      await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
      await mockConversationsAPI(page, [])
      await mockChatAPI(page, [
        // First call: AI opening message
        {
          responseText: 'Welcome! Tell me about your experience with nicotine.',
          conversationId: 'mock-conv-1',
        },
        // Second call: AI response to user message
        {
          responseText: 'That\'s a great insight. Nicotine creates the very stress it promises to relieve.',
          conversationId: 'mock-conv-1',
        },
      ])

      await page.goto('/session/1?mode=text')

      // Wait for opening message
      await expect(page.getByText(/Tell me about your experience/)).toBeVisible({ timeout: 15000 })

      // Type and send a message
      const textarea = page.getByPlaceholder('Type your message...')
      await textarea.fill('I usually vape when I feel stressed at work')
      await page.getByRole('button', { name: 'Send message' }).click()

      // Verify user message appears in the chat
      await expect(page.getByText('I usually vape when I feel stressed at work')).toBeVisible()

      // Verify AI response streams in
      await expect(page.getByText(/great insight/i)).toBeVisible({ timeout: 15000 })
    })

    test('conversation supports multiple turn exchanges', async ({ page }) => {
      await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
      await mockConversationsAPI(page, [])
      await mockChatAPI(page, [
        { responseText: 'Let\'s begin. What brought you here today?', conversationId: 'mock-conv-1' },
        { responseText: 'I see. And how does that make you feel?', conversationId: 'mock-conv-1' },
        { responseText: 'That\'s an important realization.', conversationId: 'mock-conv-1' },
      ])

      await page.goto('/session/1?mode=text')
      await expect(page.getByText(/What brought you here/)).toBeVisible({ timeout: 15000 })

      // First user turn
      const textarea = page.getByPlaceholder('Type your message...')
      await textarea.fill('I want to quit vaping')
      await page.getByRole('button', { name: 'Send message' }).click()
      await expect(page.getByText(/how does that make you feel/i)).toBeVisible({ timeout: 15000 })

      // Second user turn
      await textarea.fill('It makes me feel frustrated')
      await page.getByRole('button', { name: 'Send message' }).click()
      await expect(page.getByText(/important realization/i)).toBeVisible({ timeout: 15000 })
    })

    test('session completion shows completion card with navigation options', async ({ page }) => {
      await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
      await mockConversationsAPI(page, [])
      await mockChatAPI(page, [
        { responseText: 'Welcome to the session.', conversationId: 'mock-conv-1' },
        {
          responseText: 'You\'ve done great work today. Remember: nicotine creates stress, it doesn\'t relieve it.',
          conversationId: 'mock-conv-1',
          sessionComplete: true,
        },
      ])

      await page.goto('/session/1?mode=text')
      await expect(page.getByText(/Welcome to the session/)).toBeVisible({ timeout: 15000 })

      // Send a message to trigger the completion response
      const textarea = page.getByPlaceholder('Type your message...')
      await textarea.fill('I understand now')
      await page.getByRole('button', { name: 'Send message' }).click()

      // Session complete card should appear
      await expect(page.getByText('Session Complete')).toBeVisible({ timeout: 15000 })
      await expect(page.getByRole('button', { name: /Return to Dashboard/i })).toBeVisible()
      // Next session button should appear since there are more illusions
      await expect(page.getByRole('button', { name: /Continue to Next Session/i })).toBeVisible()
    })

    // NOTE: Session resume via useFetch('/api/conversations') cannot be tested
    // with Playwright route mocking because Nuxt's useFetch in onMounted does
    // not generate browser-level HTTP requests in the dev SSR environment.
    // This would need integration-level testing with a real database.

    test('session completion "Return to Dashboard" navigates correctly', async ({ page }) => {
      await mockUserInProgress(page, { currentIllusion: 3, illusionsCompleted: [1, 2] })
      await mockConversationsAPI(page, [])
      await mockChatAPI(page, [
        { responseText: 'Welcome back.', conversationId: 'mock-conv-1' },
        {
          responseText: 'Excellent progress today.',
          conversationId: 'mock-conv-1',
          sessionComplete: true,
        },
      ])

      await page.goto('/session/3?mode=text')
      await expect(page.getByText(/Welcome back/)).toBeVisible({ timeout: 15000 })

      // Trigger completion
      const textarea = page.getByPlaceholder('Type your message...')
      await textarea.fill('I see through the illusion now')
      await page.getByRole('button', { name: 'Send message' }).click()

      // Wait for completion card
      await expect(page.getByText('Session Complete')).toBeVisible({ timeout: 15000 })

      // Click "Return to Dashboard"
      await page.getByRole('button', { name: /Return to Dashboard/i }).click()
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    })

    test('session with invalid illusion ID shows unknown illusion title', async ({ page }) => {
      await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
      await mockConversationsAPI(page, [])
      await mockChatAPI(page, {
        error: { message: 'Invalid illusion number', status: 400 },
      })

      await page.goto('/session/999?mode=text')

      // The title should fall back to "Unknown Illusion"
      await expect(page.getByText('Unknown Illusion')).toBeVisible({ timeout: 10000 })
    })

    test('API failure during opening message shows error', async ({ page }) => {
      await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
      await mockConversationsAPI(page, [])
      await mockChatAPI(page, {
        error: { message: 'Service unavailable', status: 500 },
      })

      await page.goto('/session/1?mode=text')

      // The page should show a friendly error message
      await expect(
        page.getByText(/failed to start conversation|unavailable|try again/i),
      ).toBeVisible({ timeout: 15000 })
    })
  })

  test.describe('Mobile Layout', () => {
    test.beforeEach(({ page }) => {
      const viewport = page.viewportSize()
      test.skip(!viewport || viewport.width >= 768, 'Mobile viewport only')
    })

    test('session UI elements are visible and usable on mobile viewport', async ({ page }) => {
      await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
      await mockConversationsAPI(page, [])
      await mockChatAPI(page, [
        {
          responseText: 'Welcome to your first session.',
          conversationId: 'mock-conv-1',
        },
        {
          responseText: 'Great insight about stress!',
          conversationId: 'mock-conv-1',
        },
      ])

      await page.goto('/session/1?mode=text')

      // Title should be visible
      await expect(page.getByText('The Stress Illusion')).toBeVisible({ timeout: 10000 })

      // Opening message should appear
      await expect(page.getByText(/Welcome to your first session/)).toBeVisible({ timeout: 15000 })

      // Text input and send button should be visible
      const textarea = page.getByPlaceholder('Type your message...')
      await expect(textarea).toBeVisible()

      const sendButton = page.getByRole('button', { name: 'Send message' })
      await expect(sendButton).toBeVisible()

      // No horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth,
      )
      expect(hasHorizontalScroll).toBe(false)

      // Verify interaction works on mobile
      await textarea.fill('Testing on mobile')
      await sendButton.click()
      await expect(page.getByText('Testing on mobile')).toBeVisible()
      await expect(page.getByText(/Great insight about stress/i)).toBeVisible({ timeout: 15000 })
    })
  })
})
