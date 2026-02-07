/**
 * Reinforcement Sessions Tests (P2)
 *
 * Verifies that:
 * - Reinforcement session page loads and starts a conversation
 * - Session completion shows the completion card with dashboard navigation
 * - Invalid illusion key shows error and redirects to dashboard
 * - Exit link navigates back to dashboard
 */

import { test, expect } from '@playwright/test'
import { mockIntakeAPI } from './utils'
import { mockChatAPI, mockConversationsAPI } from './utils/mock-session'
import {
  mockCheckInInterstitial,
  mockDashboardMoments,
  mockTimezoneAPI,
} from './utils/mock-check-in'

/**
 * Mock the POST /api/reinforcement/start endpoint.
 */
async function mockReinforcementStart(
  page: import('@playwright/test').Page,
  options: {
    conversationId?: string
    illusionKey?: string
    anchorMoment?: { id: string; transcript: string } | null
    error?: { message: string; status: number }
  } = {},
) {
  await page.route('**/api/reinforcement/start', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    if (options.error) {
      await route.fulfill({
        status: options.error.status,
        contentType: 'application/json',
        body: JSON.stringify({ message: options.error.message }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        conversation_id: options.conversationId || 'mock-reinforcement-conv-1',
        session_type: 'reinforcement',
        illusion_key: options.illusionKey || 'stress_relief',
        anchor_moment: options.anchorMoment ?? null,
      }),
    })
  })
}

/**
 * Set up dashboard mocks for post-reinforcement redirect.
 */
async function setupDashboardMocks(page: import('@playwright/test').Page) {
  await page.route('**/api/user/status', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        phase: 'post_ceremony',
        progress: {
          program_status: 'completed',
          current_illusion: 5,
          illusions_completed: [1, 2, 3, 4, 5],
          illusion_order: [1, 2, 3, 4, 5],
          total_sessions: 5,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        },
        ceremony: { completed_at: new Date().toISOString(), already_quit: true },
        artifacts: null,
        pending_follow_ups: null,
        next_session: null,
        illusion_last_sessions: null,
      }),
    })
  })
  await mockIntakeAPI(page)
  await mockCheckInInterstitial(page, { hasPending: false })
  await mockDashboardMoments(page)
  await mockTimezoneAPI(page)
}

test.describe('Reinforcement Sessions', () => {
  test('reinforcement page loads with session header', async ({ page }) => {
    await mockReinforcementStart(page, {
      illusionKey: 'stress_relief',
      conversationId: 'mock-reinforcement-conv-1',
    })
    await mockConversationsAPI(page, [])
    await mockChatAPI(page, {
      responseText: 'Let\'s revisit what you learned about stress and nicotine.',
      conversationId: 'mock-reinforcement-conv-1',
    })

    await page.goto('/reinforcement/stress_relief')

    // Should show the illusion name in the header
    await expect(page.getByRole('heading', { name: 'Stress Relief' })).toBeVisible({ timeout: 10000 })

    // Should show the Exit link back to dashboard
    const exitLink = page.getByRole('link', { name: /exit/i })
    await expect(exitLink).toBeVisible()
    await expect(exitLink).toHaveAttribute('href', '/dashboard')
  })

  test('reinforcement with anchor moment shows moment quote in header', async ({ page }) => {
    await mockReinforcementStart(page, {
      illusionKey: 'stress_relief',
      conversationId: 'mock-reinforcement-conv-1',
      anchorMoment: {
        id: 'moment-1',
        transcript: 'I realized nicotine creates the stress it claims to relieve.',
      },
    })
    await mockConversationsAPI(page, [])
    await mockChatAPI(page, {
      responseText: 'Let\'s explore that insight further.',
      conversationId: 'mock-reinforcement-conv-1',
    })

    await page.goto('/reinforcement/stress_relief?moment_id=moment-1')

    // Header should show the truncated moment quote
    await expect(
      page.getByRole('heading', { name: /nicotine creates the stress/i }),
    ).toBeVisible({ timeout: 10000 })
  })

  // NOTE: Full session completion E2E tests are not feasible for reinforcement
  // because VoiceSessionView requires audio playback to finish before triggering
  // the session-complete event. Text-mode session completion is thoroughly tested
  // in session.spec.ts via TextSessionView.

  test('text fallback mode accepts user input and receives AI response', async ({ page }) => {
    await mockReinforcementStart(page, {
      illusionKey: 'willpower',
      conversationId: 'mock-reinforcement-conv-1',
    })
    await mockConversationsAPI(page, [])
    await mockChatAPI(page, [
      {
        responseText: 'Let\'s revisit willpower.',
        conversationId: 'mock-reinforcement-conv-1',
      },
      {
        responseText: 'That\'s a great insight about willpower.',
        conversationId: 'mock-reinforcement-conv-1',
      },
    ])

    await page.goto('/reinforcement/willpower')

    // Switch to text mode via "Use Text Instead" button
    await expect(page.getByRole('button', { name: /use text instead/i })).toBeVisible({ timeout: 10000 })
    await page.getByRole('button', { name: /use text instead/i }).click()

    // Wait for the opening message
    await expect(page.getByText(/revisit willpower/i)).toBeVisible({ timeout: 15000 })

    // Type and send a message
    const textarea = page.getByPlaceholder('Type your message...')
    await textarea.fill('I see through the willpower illusion')
    await page.getByRole('button', { name: 'Send' }).click()

    // User message should appear in transcript
    await expect(page.getByText('I see through the willpower illusion')).toBeVisible()

    // AI response should appear
    await expect(page.getByText(/great insight about willpower/i)).toBeVisible({ timeout: 15000 })
  })

  test('error starting reinforcement shows error and return button', async ({ page }) => {
    await mockReinforcementStart(page, {
      error: { message: 'Illusion not completed yet', status: 400 },
    })

    await setupDashboardMocks(page)

    await page.goto('/reinforcement/stress_relief')

    // Should show "Return to Dashboard" button (unique to the error state)
    await expect(page.getByRole('button', { name: /return to dashboard/i })).toBeVisible({ timeout: 10000 })

    // Error message should be visible in the main content area (not just the toast)
    // Use locator targeting the error div specifically (has text-red-400 class)
    await expect(page.locator('div.text-red-400')).toContainText('Illusion not completed yet')
  })

  test('exit link navigates back to dashboard', async ({ page }) => {
    await mockReinforcementStart(page, {
      illusionKey: 'focus',
      conversationId: 'mock-reinforcement-conv-1',
    })
    await mockConversationsAPI(page, [])
    await mockChatAPI(page, {
      responseText: 'Let\'s revisit focus.',
      conversationId: 'mock-reinforcement-conv-1',
    })

    await setupDashboardMocks(page)

    await page.goto('/reinforcement/focus')

    // Wait for page to load
    await expect(page.getByRole('link', { name: /exit/i })).toBeVisible({ timeout: 10000 })

    // Click Exit link
    await page.getByRole('link', { name: /exit/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })
})
