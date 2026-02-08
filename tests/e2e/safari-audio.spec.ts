/**
 * Safari Audio / TTS Regression Tests (P1)
 *
 * Validates the 5 Safari audio fixes (US-001 through US-005):
 * - AudioContext preservation across message resets
 * - Gesture-initiated AudioContext creation
 * - Auto-started conversation audio recovery on first gesture
 * - JourneyPlayer segment auto-advance
 *
 * These tests ONLY run in WebKit and Mobile Safari projects.
 */

import { test, expect } from '@playwright/test'
import { mockUserInProgress, mockCeremonyPrepare, mockCeremonyGenerateJourney } from './utils'
import type { PlaylistSegment } from './utils'
import { mockConversationsAPI } from './utils/mock-session'
import {
  addAudioContextTracking,
  addMicrophoneMocks,
  mockChatAPIWithAudio,
  createValidWav,
  type AudioTracker,
} from './utils/mock-audio'

test.describe('Safari Audio / TTS Regression', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'webkit', 'Safari audio tests only run in WebKit')
  })

  test('AudioContext is not closed after streaming response completes', async ({ page }) => {
    // Tracks AudioContext creation, closure, and audio scheduling
    await addAudioContextTracking(page)
    await addMicrophoneMocks(page)

    await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
    await mockConversationsAPI(page, [])
    await mockChatAPIWithAudio(page, [
      { text: "Hello, I'm your AI coach. Let's explore the stress illusion together." },
    ])

    await page.goto('/session/stress_relief')
    await page.waitForLoadState('networkidle')

    // Wait for streaming to process and audio to be scheduled
    await page.waitForTimeout(5000)

    const tracker: AudioTracker = await page.evaluate(() => (window as any).__audioTracker)

    // AudioContext should have been created at least once
    expect(tracker.contextsCreated).toBeGreaterThanOrEqual(1)

    // CRITICAL: AudioContext must NOT be closed after response completes.
    // This validates US-001 — resetPlaybackState() preserves the context.
    expect(tracker.contextsClosed).toBe(0)

    // Audio chunks should have been scheduled for playback
    expect(tracker.chunksScheduled.length).toBeGreaterThanOrEqual(1)
  })

  test('audio is scheduled after gesture-initiated session start', async ({ page }) => {
    await addAudioContextTracking(page)
    await addMicrophoneMocks(page)

    await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
    await mockConversationsAPI(page, [])
    await mockChatAPIWithAudio(page, [
      { text: "Welcome! Let's begin your journey to freedom." },
    ])

    await page.goto('/session/stress_relief')
    await page.waitForLoadState('networkidle')

    // Provide a user gesture (tap) — this is critical for iOS Safari
    // where AudioContext must be created/resumed within a gesture handler
    await page.locator('body').click({ position: { x: 200, y: 300 } })

    // Wait for audio processing
    await page.waitForTimeout(5000)

    const tracker: AudioTracker = await page.evaluate(() => (window as any).__audioTracker)

    // AudioContext should exist
    expect(tracker.contextsCreated).toBeGreaterThanOrEqual(1)

    // Audio should have been scheduled after the gesture
    expect(tracker.chunksScheduled.length).toBeGreaterThanOrEqual(1)
  })

  test('auto-started conversation recovers audio on first user gesture', async ({ page }) => {
    await addAudioContextTracking(page)
    await addMicrophoneMocks(page)

    await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
    await mockConversationsAPI(page, [])
    await mockChatAPIWithAudio(page, [
      { text: 'Hello there. How are you feeling today?' },
    ])

    // Navigate to voice session — AI auto-starts without a user gesture
    await page.goto('/session/stress_relief')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // Capture tracker state before gesture
    const trackerBefore: AudioTracker = await page.evaluate(
      () => (window as any).__audioTracker,
    )

    // Provide a user gesture — this should trigger AudioContext.resume()
    // which unlocks audio playback on iOS Safari
    await page.locator('body').click()
    await page.waitForTimeout(1000)

    const trackerAfter: AudioTracker = await page.evaluate(
      () => (window as any).__audioTracker,
    )

    // AudioContext should have been created
    expect(trackerAfter.contextsCreated).toBeGreaterThanOrEqual(1)

    // resume() should have been called after the gesture (validates US-002/US-003)
    expect(trackerAfter.resumeCalls).toBeGreaterThan(trackerBefore.resumeCalls)
  })

  test('JourneyPlayer auto-advances through segments without requiring taps', async ({
    page,
  }) => {
    await addAudioContextTracking(page)

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
        audio_generated: true,
      },
      {
        id: 'seg-2',
        type: 'user_moment',
        text: 'I realized nicotine never helped my stress.',
        transcript: 'I realized nicotine never helped my stress.',
        moment_id: 'moment-1',
        audio_generated: true,
      },
      {
        id: 'seg-3',
        type: 'narration',
        text: 'And now you see the truth clearly.',
        transcript: 'And now you see the truth clearly.',
        audio_generated: true,
      },
    ]
    await mockCeremonyGenerateJourney(page, mockSegments)

    // Mock segment audio endpoints — each returns a valid WAV with word timings
    for (const seg of mockSegments) {
      await page.route(`**/api/ceremony/journey/${seg.id}/audio`, async (route) => {
        const wav = createValidWav(500) // 500ms per segment
        const words = seg.text.split(/\s+/)
        const msPerWord = 500 / words.length

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            audio_url: `data:audio/wav;base64,${wav}`,
            duration_ms: 500,
            word_timings: words.map((word, i) => ({
              word,
              start: i * msPerWord,
              end: (i + 1) * msPerWord,
            })),
            audio_unavailable: false,
            text: seg.text,
          }),
        })
      })
    }

    await page.goto('/ceremony')

    // Navigate through ceremony intro
    await expect(page.getByText(/the final step/i)).toBeVisible()
    await page.getByRole('button', { name: /still using/i }).click()
    await page.getByRole('button', { name: /begin ceremony/i }).click()

    // Wait for journey player to load
    await expect(page.getByRole('heading', { name: /your journey/i })).toBeVisible({
      timeout: 10000,
    })

    // Click play to start journey playback (user gesture creates AudioContext).
    // The play button has no text label (SVG-only), so use CSS class selector.
    const playButton = page.locator('button.bg-brand-accent.rounded-full')
    await expect(playButton).toBeVisible({ timeout: 5000 })
    await playButton.click()

    // Wait for all segments to be scheduled and play
    // 3 segments × 500ms + 750ms gaps between = ~3750ms total
    await page.waitForTimeout(5000)

    const tracker: AudioTracker = await page.evaluate(() => (window as any).__audioTracker)

    // All 3 segments should have been scheduled from the single play gesture
    // (no additional taps required between segments)
    expect(tracker.chunksScheduled.length).toBeGreaterThanOrEqual(3)

    // AudioContext should NOT have been closed between segments
    expect(tracker.contextsClosed).toBe(0)
  })
})
