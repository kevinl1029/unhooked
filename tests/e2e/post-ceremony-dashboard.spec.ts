/**
 * Post-Ceremony Dashboard Tests (P2)
 *
 * Verifies that after ceremony completion, the dashboard displays:
 * - "YOU'RE FREE" heading with ceremony date
 * - Artifact cards (Journey, Cheat Sheet) with correct links
 * - "Need a boost?" CTA with "Talk to me" button navigating to /support
 * - "Reinforce Your Freedom" section with 5 illusion cards
 */

import { test, expect } from '@playwright/test'
import { mockIntakeAPI } from './utils'
import {
  mockCheckInInterstitial,
  mockDashboardMoments,
  mockTimezoneAPI,
} from './utils/mock-check-in'

interface PostCeremonyOptions {
  hasJourney?: boolean
  hasCheatSheet?: boolean
  hasFinalRecording?: boolean
}

/**
 * Set up all mocks for a post-ceremony dashboard state.
 */
async function setupPostCeremonyDashboard(
  page: import('@playwright/test').Page,
  options: PostCeremonyOptions = {},
) {
  const {
    hasJourney = true,
    hasCheatSheet = true,
    hasFinalRecording = false,
  } = options

  const completedAt = new Date().toISOString()

  // Build artifacts object
  const artifacts: Record<string, unknown> = {}
  if (hasJourney) {
    artifacts.reflective_journey = {
      id: 'mock-journey-id',
      artifact_type: 'reflective_journey',
      audio_duration_ms: 154000,
    }
  }
  if (hasCheatSheet) {
    artifacts.illusions_cheat_sheet = {
      id: 'mock-cheat-sheet-id',
      artifact_type: 'illusions_cheat_sheet',
    }
  }
  if (hasFinalRecording) {
    artifacts.final_recording = {
      id: 'mock-recording-id',
      artifact_type: 'final_recording',
      audio_duration_ms: 45000,
      audio_path: 'recordings/mock-recording.webm',
    }
  }

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
          started_at: completedAt,
          completed_at: completedAt,
        },
        ceremony: {
          completed_at: completedAt,
          already_quit: true,
        },
        artifacts: Object.keys(artifacts).length > 0 ? artifacts : null,
        pending_follow_ups: null,
        next_session: null,
        illusion_last_sessions: null,
      }),
    })
  })

  // Mock journey endpoint for polling (dashboard polls /api/ceremony/journey)
  if (hasJourney) {
    await page.route('**/api/ceremony/journey', async (route) => {
      if (route.request().method() !== 'GET') {
        await route.continue()
        return
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          journey: {
            artifact_id: 'mock-journey-id',
            playlist: {
              segments: [
                { id: 'seg-1', type: 'narration', text: 'Your journey.', transcript: 'Your journey.' },
              ],
            },
            journey_text: 'Your reflective journey.',
            total_duration_ms: 154000,
            generated_at: completedAt,
          },
          status: 'ready',
        }),
      })
    })
  } else {
    await page.route('**/api/ceremony/journey', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Journey not found' }),
      })
    })
  }

  await mockIntakeAPI(page)
  await mockCheckInInterstitial(page, { hasPending: false })
  await mockTimezoneAPI(page)
  await mockDashboardMoments(page)
}

test.describe('Post-Ceremony Dashboard', () => {
  test('shows "YOU\'RE FREE" heading', async ({ page }) => {
    await setupPostCeremonyDashboard(page)

    await page.goto('/dashboard')

    await expect(page.getByRole('heading', { name: /you're free/i })).toBeVisible({ timeout: 10000 })
  })

  test('shows cheat sheet card with View link to /cheat-sheet', async ({ page }) => {
    await setupPostCeremonyDashboard(page, { hasCheatSheet: true })

    await page.goto('/dashboard')

    // Cheat sheet card heading
    await expect(page.locator('h3', { hasText: 'Illusions Cheat Sheet' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Quick reference guide')).toBeVisible()

    // "View" link should navigate to /cheat-sheet
    const viewLink = page.getByRole('link', { name: /view/i })
    await expect(viewLink).toBeVisible()
    await expect(viewLink).toHaveAttribute('href', '/cheat-sheet')
  })

  test('shows journey artifact card with Play link when journey is ready', async ({ page }) => {
    await setupPostCeremonyDashboard(page, { hasJourney: true })

    await page.goto('/dashboard')

    // Journey artifact card heading
    await expect(page.locator('h3', { hasText: 'Your Journey' })).toBeVisible({ timeout: 10000 })

    // Should show duration (154000ms = 2:34)
    await expect(page.getByText('2:34')).toBeVisible()

    // "Play" link should navigate to /journey
    const playLink = page.getByRole('link', { name: /play/i }).first()
    await expect(playLink).toBeVisible()
    await expect(playLink).toHaveAttribute('href', '/journey')
  })

  test('shows "Need a boost?" section with "Talk to me" button', async ({ page }) => {
    await setupPostCeremonyDashboard(page)

    await page.goto('/dashboard')

    // Should show "Need a boost?" text
    await expect(page.getByText('Need a boost?')).toBeVisible({ timeout: 10000 })

    // "Talk to me" button (navigates to /support via navigateTo)
    const talkButton = page.getByRole('button', { name: /talk to me/i })
    await expect(talkButton).toBeVisible()
  })

  test('"Talk to me" navigates to /support', async ({ page }) => {
    await setupPostCeremonyDashboard(page)

    // Mock support page APIs
    await page.route('**/api/reinforcement/start', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            conversation_id: 'mock-support-conv',
            session_type: 'boost',
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/dashboard')

    await expect(page.getByText('Need a boost?')).toBeVisible({ timeout: 10000 })

    // Click the Talk to me button
    await page.getByRole('button', { name: /talk to me/i }).click()

    // Should navigate to the support page
    await page.waitForURL(/\/support/, { timeout: 10000 })
  })

  test('shows "Reinforce Your Freedom" section with all 5 illusions', async ({ page }) => {
    await setupPostCeremonyDashboard(page)

    await page.goto('/dashboard')

    // Section heading
    await expect(page.getByRole('heading', { name: /reinforce your freedom/i })).toBeVisible({ timeout: 10000 })

    // All 5 illusions should be visible as cards with Reinforce buttons
    await expect(page.locator('h3', { hasText: 'Stress Relief' })).toBeVisible()
    await expect(page.locator('h3', { hasText: 'Pleasure' })).toBeVisible()
    await expect(page.locator('h3', { hasText: 'Willpower' })).toBeVisible()
    await expect(page.locator('h3', { hasText: 'Focus' })).toBeVisible()
    await expect(page.locator('h3', { hasText: 'Identity' })).toBeVisible()

    // Each should have a "Reinforce" button
    const reinforceButtons = page.getByRole('button', { name: /reinforce/i })
    await expect(reinforceButtons).toHaveCount(5)
  })

  test('reinforcement button navigates to reinforcement session', async ({ page }) => {
    await setupPostCeremonyDashboard(page)

    // Mock reinforcement start for the target page
    await page.route('**/api/reinforcement/start', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            conversation_id: 'mock-reinforcement-conv',
            session_type: 'reinforcement',
            illusion_key: 'stress_relief',
            anchor_moment: null,
          }),
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/dashboard')

    // Wait for reinforcement section
    await expect(page.getByRole('heading', { name: /reinforce your freedom/i })).toBeVisible({ timeout: 10000 })

    // Click the first Reinforce button (Stress Relief)
    await page.getByRole('button', { name: /reinforce/i }).first().click()

    // Should navigate to reinforcement page
    await page.waitForURL(/\/reinforcement\/stress_relief/, { timeout: 10000 })
  })
})
