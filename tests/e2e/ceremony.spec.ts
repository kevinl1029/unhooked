import { test, expect } from '@playwright/test'
import {
  mockUserInProgress,
  mockCeremonyPrepare,
  mockCeremonyGenerateJourney,
  type PlaylistSegment,
} from './utils'

test.describe('Ceremony - Intro and Journey Generation', () => {
  test('shows intro step with "still using" and "already stopped" buttons', async ({ page }) => {
    // Mock user who is ready for ceremony
    await mockUserInProgress(page, {
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

    await page.goto('/ceremony')

    // Wait for initial status check to complete
    await expect(page.getByText(/loading your ceremony progress/i)).toBeVisible()
    await expect(page.getByText(/loading your ceremony progress/i)).not.toBeVisible({ timeout: 10000 })

    // Should see intro step
    await expect(page.getByText(/the final step/i)).toBeVisible()
    await expect(page.getByText(/you've completed all 5 sessions/i)).toBeVisible()

    // Should see the two option buttons
    await expect(page.getByRole('button', { name: /still using/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /already stopped/i })).toBeVisible()

    // Should see Begin Ceremony button
    await expect(page.getByRole('button', { name: /begin ceremony/i })).toBeVisible()
  })

  test('clicking "Begin Ceremony" without selecting option shows disabled state', async ({ page }) => {
    await mockUserInProgress(page, {
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })
    await mockCeremonyPrepare(page, { ready: true, ceremonyCompleted: false })

    await page.goto('/ceremony')
    await expect(page.getByText(/the final step/i)).toBeVisible()

    // Begin Ceremony button should be disabled
    const beginButton = page.getByRole('button', { name: /begin ceremony/i })
    await expect(beginButton).toBeDisabled()
  })

  test('selecting option and clicking "Begin Ceremony" triggers journey generation', async ({ page }) => {
    await mockUserInProgress(page, {
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })
    await mockCeremonyPrepare(page, { ready: true, ceremonyCompleted: false })

    const mockSegments: PlaylistSegment[] = [
      {
        id: 'seg-1',
        type: 'narration',
        text: 'Your journey begins here.',
        transcript: 'Your journey begins here.',
        audio_generated: false,
      },
      {
        id: 'seg-2',
        type: 'user_moment',
        text: 'I realized nicotine never helped my stress.',
        transcript: 'I realized nicotine never helped my stress.',
        moment_id: 'moment-1',
        audio_generated: false,
      },
    ]
    await mockCeremonyGenerateJourney(page, mockSegments)

    await page.goto('/ceremony')
    await expect(page.getByText(/the final step/i)).toBeVisible()

    // Select "Still using" option
    await page.getByRole('button', { name: /still using/i }).click()

    // Begin Ceremony button should now be enabled
    const beginButton = page.getByRole('button', { name: /begin ceremony/i })
    await expect(beginButton).not.toBeDisabled()

    // Click Begin Ceremony
    await beginButton.click()

    // Should see generating step
    await expect(page.getByText(/creating your journey/i)).toBeVisible()
  })

  test('journey generation shows loading state with "Creating Your Journey" message', async ({ page }) => {
    await mockUserInProgress(page, {
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })
    await mockCeremonyPrepare(page, { ready: true, ceremonyCompleted: false })

    // Delay the journey generation response to test loading state
    await page.route('**/api/ceremony/generate-journey', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          journey_text: 'Your reflective journey...',
          playlist: {
            segments: [
              {
                id: 'seg-1',
                type: 'narration',
                text: 'Your journey begins.',
                transcript: 'Your journey begins.',
                audio_generated: false,
              },
            ],
          },
          artifact_id: 'mock-artifact-id',
          selected_moment_count: 0,
        }),
      })
    })

    await page.goto('/ceremony')
    await expect(page.getByText(/the final step/i)).toBeVisible()

    // Select option and begin
    await page.getByRole('button', { name: /already stopped/i }).click()
    await page.getByRole('button', { name: /begin ceremony/i }).click()

    // Should see loading state
    await expect(page.getByText(/creating your journey/i)).toBeVisible()
    await expect(page.getByText(/weaving together the most powerful moments/i)).toBeVisible()

    // Should see spinner
    const spinner = page.locator('.animate-spin').first()
    await expect(spinner).toBeVisible()
  })

  test('after generation, journey player is displayed with segments', async ({ page }) => {
    await mockUserInProgress(page, {
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })
    await mockCeremonyPrepare(page, { ready: true, ceremonyCompleted: false })

    const mockSegments: PlaylistSegment[] = [
      {
        id: 'seg-1',
        type: 'narration',
        text: 'Your journey begins with understanding.',
        transcript: 'Your journey begins with understanding.',
        audio_generated: false,
      },
      {
        id: 'seg-2',
        type: 'user_moment',
        text: 'I started vaping to cope with stress.',
        transcript: 'I started vaping to cope with stress.',
        moment_id: 'moment-1',
        audio_generated: false,
      },
      {
        id: 'seg-3',
        type: 'narration',
        text: 'And now you see the truth.',
        transcript: 'And now you see the truth.',
        audio_generated: false,
      },
    ]
    await mockCeremonyGenerateJourney(page, mockSegments)

    await page.goto('/ceremony')
    await expect(page.getByText(/the final step/i)).toBeVisible()

    // Select option and begin
    await page.getByRole('button', { name: /still using/i }).click()
    await page.getByRole('button', { name: /begin ceremony/i }).click()

    // Wait for journey to load
    await expect(page.getByText(/creating your journey/i)).toBeVisible()
    await expect(page.getByText(/your journey/i)).toBeVisible({ timeout: 10000 })

    // Should see journey player step
    await expect(page.getByText(/listen to the story of your transformation/i)).toBeVisible()

    // Should see skip button
    await expect(page.getByRole('button', { name: /skip for now/i })).toBeVisible()
  })

  test('shows not ready state when illusions incomplete', async ({ page }) => {
    await mockUserInProgress(page, {
      currentIllusion: 2,
      illusionsCompleted: [1],
      totalSessions: 1,
    })
    await mockCeremonyPrepare(page, {
      ready: false,
      ceremonyCompleted: false,
      illusionsCompleted: ['stress_relief'],
      totalMoments: 2,
    })

    await page.goto('/ceremony')

    // Should see not ready state
    await expect(page.getByText(/not quite ready yet/i)).toBeVisible()
    await expect(page.getByText(/illusions completed/i)).toBeVisible()
    await expect(page.getByText(/1.*\/.*5/i)).toBeVisible()

    // Should see return button
    await expect(page.getByRole('link', { name: /return to dashboard/i })).toBeVisible()
  })

  test('shows not ready state when not enough moments captured', async ({ page }) => {
    await mockUserInProgress(page, {
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })
    await mockCeremonyPrepare(page, {
      ready: false,
      ceremonyCompleted: false,
      illusionsCompleted: ['stress_relief', 'pleasure', 'willpower', 'focus', 'identity'],
      totalMoments: 2, // Less than required 3
    })

    await page.goto('/ceremony')

    // Should see not ready state
    await expect(page.getByText(/not quite ready yet/i)).toBeVisible()
    await expect(page.getByText(/2.*\/.*3 minimum/i)).toBeVisible()
  })

  test('redirects to dashboard if ceremony already completed', async ({ page }) => {
    await mockUserInProgress(page, {
      currentIllusion: 5,
      illusionsCompleted: [1, 2, 3, 4, 5],
      totalSessions: 5,
    })
    await mockCeremonyPrepare(page, {
      ready: true,
      ceremonyCompleted: true, // Already completed
    })

    await page.goto('/ceremony')

    // Should redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
  })
})
