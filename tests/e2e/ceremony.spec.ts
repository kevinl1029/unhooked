/**
 * Ceremony E2E Tests
 *
 * Tests the voice-first ceremony page:
 * - Pre-ceremony screen renders correctly for ceremony_ready users
 * - Redirects for completed or not-ready users
 * - Begin Ceremony button transitions to conversation phase
 * - Error state when ceremony preparation fails
 */

import { test, expect } from '@playwright/test'
import {
  mockUserInProgress,
  mockCeremonyPrepare,
} from './utils'

test.describe('Ceremony - Pre-ceremony Screen', () => {
  test('shows pre-ceremony screen with "The Ceremony" heading and Begin button', async ({ page }) => {
    // Mock user who is ready for ceremony
    await mockUserInProgress(page, {
      programStatus: 'ceremony_ready',
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })

    await page.goto('/ceremony')

    // Should see the pre-ceremony screen
    await expect(page.getByText('YOUR FINAL SESSION')).toBeVisible({ timeout: 10000 })
    await expect(page.getByRole('heading', { name: /the ceremony/i })).toBeVisible()

    // Should see preparation instructions
    await expect(page.getByText(/set aside 15 minutes/i)).toBeVisible()
    await expect(page.getByText(/find a quiet space/i)).toBeVisible()

    // Should see Begin Ceremony button
    await expect(page.getByRole('button', { name: /begin ceremony/i })).toBeVisible()
  })

  test('shows product-specific instructions based on intake', async ({ page }) => {
    await mockUserInProgress(page, {
      programStatus: 'ceremony_ready',
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })

    await page.goto('/ceremony')

    await expect(page.getByRole('heading', { name: /the ceremony/i })).toBeVisible({ timeout: 10000 })

    // Should show product-specific text (default mock is 'vape')
    await expect(page.getByText(/vape/i)).toBeVisible()
  })

  test('shows motivational text on pre-ceremony screen', async ({ page }) => {
    await mockUserInProgress(page, {
      programStatus: 'ceremony_ready',
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })

    await page.goto('/ceremony')

    await expect(page.getByRole('heading', { name: /the ceremony/i })).toBeVisible({ timeout: 10000 })

    // Should see motivational text
    await expect(page.getByText(/moment worth being present for/i)).toBeVisible()
  })
})

test.describe('Ceremony - Route Guards', () => {
  test('redirects to dashboard if user is post-ceremony', async ({ page }) => {
    await mockUserInProgress(page, {
      programStatus: 'completed',
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })
    await page.route('**/api/user/status', async (route) => {
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
          },
          ceremony: { completed_at: new Date().toISOString() },
          artifacts: null,
          pending_follow_ups: null,
          next_session: null,
        }),
      })
    })

    await page.goto('/ceremony')

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })

  test('redirects to dashboard if user is not ceremony_ready', async ({ page }) => {
    await mockUserInProgress(page, {
      programStatus: 'in_progress',
      currentIllusion: 3,
      illusionsCompleted: [1, 2],
      totalSessions: 2,
    })

    await page.goto('/ceremony')

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })
})

test.describe('Ceremony - Begin Ceremony Flow', () => {
  test('Begin Ceremony button triggers prepare API and transitions to conversation', async ({ page }) => {
    await mockUserInProgress(page, {
      programStatus: 'ceremony_ready',
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })
    await mockCeremonyPrepare(page, {
      ready: true,
      ceremonyCompleted: false,
      illusionsCompleted: ['stress_relief', 'pleasure', 'willpower', 'focus', 'identity'],
      totalMoments: 5,
    })

    // Mock the chat API for the conversation (SSE endpoint)
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() === 'POST') {
        const encoder = new TextEncoder()
        const body = encoder.encode(
          'data: {"type":"token","content":"Welcome "}\n\n' +
          'data: {"type":"token","content":"to your ceremony."}\n\n' +
          'data: {"type":"done","conversationId":"mock-ceremony-conv"}\n\n'
        )
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
          body: Buffer.from(body),
        })
      } else {
        await route.continue()
      }
    })

    // Mock conversations API
    await page.route('**/api/conversations', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.goto('/ceremony')

    // Wait for pre-ceremony screen
    await expect(page.getByRole('heading', { name: /the ceremony/i })).toBeVisible({ timeout: 10000 })

    // Click Begin Ceremony
    await page.getByRole('button', { name: /begin ceremony/i }).click()

    // Should transition away from pre-ceremony (Begin Ceremony button should disappear)
    await expect(page.getByRole('button', { name: /begin ceremony/i })).not.toBeVisible({ timeout: 10000 })
  })

  test('shows error state when ceremony prepare fails', async ({ page }) => {
    await mockUserInProgress(page, {
      programStatus: 'ceremony_ready',
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })

    // Mock prepare to fail
    await page.route('**/api/ceremony/prepare', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Failed to prepare ceremony' }),
      })
    })

    await page.goto('/ceremony')

    // Wait for pre-ceremony screen
    await expect(page.getByRole('heading', { name: /the ceremony/i })).toBeVisible({ timeout: 10000 })

    // Click Begin Ceremony
    await page.getByRole('button', { name: /begin ceremony/i }).click()

    // Should show error state
    await expect(page.getByText(/something went wrong/i)).toBeVisible({ timeout: 10000 })

    // Should show return to dashboard button
    await expect(page.getByRole('button', { name: /return to dashboard/i })).toBeVisible()
  })

  test('shows error state when prepare returns not ready', async ({ page }) => {
    await mockUserInProgress(page, {
      programStatus: 'ceremony_ready',
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })

    // Mock prepare to return not ready
    await mockCeremonyPrepare(page, {
      ready: false,
      ceremonyCompleted: false,
      illusionsCompleted: ['stress_relief'],
      totalMoments: 1,
    })

    await page.goto('/ceremony')

    // Wait for pre-ceremony screen
    await expect(page.getByRole('heading', { name: /the ceremony/i })).toBeVisible({ timeout: 10000 })

    // Click Begin Ceremony
    await page.getByRole('button', { name: /begin ceremony/i }).click()

    // Should show error state (prepare returned not ready)
    await expect(page.getByText(/something went wrong/i)).toBeVisible({ timeout: 10000 })
  })
})

test.describe('Ceremony - Error and Exit', () => {
  test('error state has return to dashboard button that navigates to dashboard', async ({ page }) => {
    await mockUserInProgress(page, {
      programStatus: 'ceremony_ready',
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })

    // Mock prepare to fail
    await page.route('**/api/ceremony/prepare', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Server error' }),
      })
    })

    // Mock dashboard APIs for redirect
    await page.route('**/api/user/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          phase: 'ceremony_ready',
          progress: { program_status: 'ceremony_ready', current_illusion: 5, illusions_completed: [1, 2, 3, 4, 5], illusion_order: [1, 2, 3, 4, 5], total_sessions: 5, started_at: new Date().toISOString() },
          ceremony: { completed_at: null },
          artifacts: null,
          pending_follow_ups: null,
          next_session: null,
        }),
      })
    })

    await page.goto('/ceremony')
    await expect(page.getByRole('heading', { name: /the ceremony/i })).toBeVisible({ timeout: 10000 })

    // Trigger error
    await page.getByRole('button', { name: /begin ceremony/i }).click()
    await expect(page.getByText(/something went wrong/i)).toBeVisible({ timeout: 10000 })

    // Click Return to Dashboard
    await page.getByRole('button', { name: /return to dashboard/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })
})
