/**
 * Post-Ceremony Dashboard Tests (P2)
 *
 * Verifies that after ceremony completion, the dashboard displays:
 * - Support section with "Get Support Now" button
 * - "Your Journey" section with all 5 illusion chips
 * - Artifact cards (Journey, Toolkit) with correct links
 * - Moment cards when moments exist
 * - Pending follow-up card when scheduled
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
  hasMoments?: boolean
  hasFollowUp?: boolean
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
    hasMoments = false,
    hasFollowUp = false,
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

  // Build illusion_last_sessions with staggered dates
  const illusionLastSessions: Record<string, string> = {
    stress_relief: new Date(Date.now() - 4 * 86400000).toISOString(),
    pleasure: new Date(Date.now() - 3 * 86400000).toISOString(),
    willpower: new Date(Date.now() - 2 * 86400000).toISOString(),
    focus: new Date(Date.now() - 1 * 86400000).toISOString(),
    identity: new Date().toISOString(),
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
        pending_follow_ups: hasFollowUp
          ? [{ id: 'follow-up-1', milestone_type: 'day_3', scheduled_for: new Date().toISOString() }]
          : null,
        next_session: null,
        illusion_last_sessions: illusionLastSessions,
      }),
    })
  })

  await mockIntakeAPI(page)
  await mockCheckInInterstitial(page, { hasPending: false })
  await mockTimezoneAPI(page)

  // Mock dashboard moments
  if (hasMoments) {
    await page.route('**/api/dashboard/moments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          moment_id: 'mock-moment-123',
          quote: 'I realized that nicotine never actually helped my stress — it was creating the cycle all along.',
          illusion_key: 'stress_relief',
          illusion_name: 'Stress Relief',
          relative_time: '2 days ago',
        }),
      })
    })
  } else {
    await mockDashboardMoments(page)
  }

  // Mock follow-ups endpoint
  await page.route('**/api/follow-ups/pending', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        hasFollowUp
          ? [{ id: 'follow-up-1', milestone_type: 'day_3', scheduled_for: new Date().toISOString() }]
          : [],
      ),
    })
  })
}

test.describe('Post-Ceremony Dashboard', () => {
  test('shows support section with "Get Support Now" button', async ({ page }) => {
    await setupPostCeremonyDashboard(page)

    await page.goto('/dashboard')

    // Should show support section heading
    await expect(page.getByText('Need Support?')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Reconnect with what you\'ve already discovered')).toBeVisible()

    // "Get Support Now" is a button (uses navigateTo, not a link)
    const supportButton = page.getByRole('button', { name: /get support now/i })
    await expect(supportButton).toBeVisible()
  })

  test('"Get Support Now" navigates to /support', async ({ page }) => {
    await setupPostCeremonyDashboard(page)

    await page.goto('/dashboard')

    await expect(page.getByText('Need Support?')).toBeVisible({ timeout: 10000 })

    // Click the support button
    await page.getByRole('button', { name: /get support now/i }).click()

    // Should navigate to the support page
    await page.waitForURL(/\/support/, { timeout: 10000 })
  })

  test('shows "Your Journey" section with all 5 illusion chips', async ({ page }) => {
    await setupPostCeremonyDashboard(page)

    await page.goto('/dashboard')

    // Journey section subtitle (unique text - avoids "Your Journey" appearing in both h2 and h3)
    await expect(page.getByText('All 5 illusions dismantled')).toBeVisible({ timeout: 10000 })

    // All 5 illusion chips should be visible (buttons include illusion name + days since)
    await expect(page.getByRole('button', { name: /stress relief/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /pleasure/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /willpower/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /focus/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /identity/i })).toBeVisible()
  })

  test('journey artifact card links to /journey', async ({ page }) => {
    await setupPostCeremonyDashboard(page, { hasJourney: true })

    await page.goto('/dashboard')

    // Journey artifact card heading
    await expect(page.locator('h3', { hasText: 'Your Journey' })).toBeVisible({ timeout: 10000 })

    // Should show duration
    await expect(page.getByText('2:34')).toBeVisible()

    // "Play" link should navigate to /journey
    const playLink = page.getByRole('link', { name: /play/i }).first()
    await expect(playLink).toBeVisible()
    await expect(playLink).toHaveAttribute('href', '/journey')
  })

  test('toolkit card links to /toolkit', async ({ page }) => {
    await setupPostCeremonyDashboard(page, { hasCheatSheet: true })

    await page.goto('/dashboard')

    // Toolkit card heading
    await expect(page.locator('h3', { hasText: 'Your Toolkit' })).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Quick reference guide')).toBeVisible()

    // "View" link should navigate to /toolkit
    const viewLink = page.getByRole('link', { name: /view/i })
    await expect(viewLink).toBeVisible()
    await expect(viewLink).toHaveAttribute('href', '/toolkit')
  })

  test('moment card displays quote with reconnect button', async ({ page }) => {
    await setupPostCeremonyDashboard(page, { hasMoments: true })

    await page.goto('/dashboard')

    // Moment section heading
    await expect(page.getByText('Reconnect with Your Insight')).toBeVisible({ timeout: 10000 })

    // Moment quote
    await expect(
      page.getByText(/nicotine never actually helped my stress/i),
    ).toBeVisible()

    // Reconnect button
    await expect(
      page.getByRole('button', { name: /reconnect with this/i }),
    ).toBeVisible()
  })

  test('illusion chip navigates to reinforcement session', async ({ page }) => {
    await setupPostCeremonyDashboard(page)

    await page.goto('/dashboard')

    // Wait for journey section to load (use unique subtitle text)
    await expect(page.getByText('All 5 illusions dismantled')).toBeVisible({ timeout: 10000 })

    // Click an illusion chip
    await page.getByRole('button', { name: /stress relief/i }).click()

    // Should navigate to reinforcement page
    await page.waitForURL(/\/reinforcement\/stress_relief/, { timeout: 10000 })
  })

  test('pending follow-up card shows with "Open" link', async ({ page }) => {
    await setupPostCeremonyDashboard(page, { hasFollowUp: true })

    await page.goto('/dashboard')

    // Follow-up card
    await expect(page.getByText('Day 3 Check-in')).toBeVisible({ timeout: 10000 })

    // "Open" link
    const openLink = page.getByRole('link', { name: /open/i })
    await expect(openLink).toBeVisible()
    await expect(openLink).toHaveAttribute('href', '/follow-up/follow-up-1')
  })
})
