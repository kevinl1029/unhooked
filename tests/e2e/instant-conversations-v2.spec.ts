/**
 * E2E Tests: Instant Conversations v2 — 3-tier fast-start
 *
 * Tests the 3-tier fallback logic in startConversation():
 * - Tier 1: Play pre-stored audio from signed URL (fastest, no synthesize call)
 * - Tier 2: Real-time TTS with pre-computed text (synthesize called)
 * - Tier 3: Full LLM + TTS streaming flow (chat API called)
 *
 * Also verifies that non-core sessions skip the fast-start path entirely.
 *
 * Mock strategy:
 * - page.route() intercepts /api/session/opening, /api/voice/synthesize,
 *   /api/session/bootstrap, the audio URL, and /api/chat
 * - HTMLAudioElement is mocked via addInitScript for deterministic headless playback
 * - Microphone is mocked via addMicrophoneMocks so sessions auto-start
 */

import { test, expect } from './fixtures'
import { mockUserInProgress } from './utils'
import { mockConversationsAPI } from './utils/mock-session'
import { addMicrophoneMocks, createValidWav } from './utils/mock-audio'
import type { Page } from '@playwright/test'

// ──────────────────────────────────────────────
// Audio element mock helpers
// ──────────────────────────────────────────────

/**
 * Mock HTMLAudioElement so play() immediately fires onloadedmetadata → onplay → onended.
 * This makes Tier 1 and Tier 2 audio tests deterministic in headless Chromium
 * (bypasses autoplay policy restrictions).
 */
async function addAutoPlayAudioMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as any).__playedAudioUrls = []

    function MockAudio(this: any, src?: string) {
      this.src = src || ''
      this.duration = 3.0
      this.currentTime = 0
      this.paused = true
      this.onloadedmetadata = null
      this.onplay = null
      this.onended = null
      this.onerror = null
    }

    MockAudio.prototype.pause = function (this: any) {
      this.paused = true
    }

    MockAudio.prototype.play = function (this: any) {
      const self = this
      this.paused = false
      ;(window as any).__playedAudioUrls.push(self.src)

      // Fire onloadedmetadata (needed for timing scaling logic in playFromUrl/playAIResponse)
      setTimeout(() => {
        if (self.onloadedmetadata) self.onloadedmetadata(new Event('loadedmetadata'))
      }, 10)

      // Fire onplay (playFromUrl resolves on onplay)
      setTimeout(() => {
        if (self.onplay) self.onplay(new Event('play'))
      }, 50)

      // Fire onended (playAIResponse resolves on onended)
      setTimeout(() => {
        if (self.onended) self.onended(new Event('ended'))
      }, 150)

      return Promise.resolve()
    }

    ;(window as any).Audio = MockAudio
  })
}

/**
 * Mock HTMLAudioElement where the FIRST play() call rejects (Tier 1 fails)
 * and subsequent calls succeed (Tier 2 succeeds).
 *
 * Used to trigger the Tier 1 → Tier 2 fallback path.
 * The first call rejection causes playFromUrl()'s play().catch() to fire
 * resolve(false), dropping to Tier 2 without an unhandled rejection.
 */
async function addFirstFailAudioMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    let callCount = 0
    ;(window as any).__playedAudioUrls = []

    function MockAudio(this: any, src?: string) {
      this.src = src || ''
      this.duration = 3.0
      this.currentTime = 0
      this.paused = true
      this.onloadedmetadata = null
      this.onplay = null
      this.onended = null
      this.onerror = null
    }

    MockAudio.prototype.pause = function (this: any) {
      this.paused = true
    }

    MockAudio.prototype.play = function (this: any) {
      const self = this
      callCount++
      this.paused = false
      ;(window as any).__playedAudioUrls.push(self.src)

      if (callCount === 1) {
        // First call (Tier 1 playFromUrl): reject to simulate download failure.
        // playFromUrl's play().catch() handler fires resolve(false) → Tier 2 triggered.
        return Promise.reject(new Error('Audio download failed'))
      }

      // Subsequent calls (Tier 2 playAIResponse): succeed normally
      setTimeout(() => {
        if (self.onloadedmetadata) self.onloadedmetadata(new Event('loadedmetadata'))
      }, 10)
      setTimeout(() => {
        if (self.onplay) self.onplay(new Event('play'))
      }, 50)
      setTimeout(() => {
        if (self.onended) self.onended(new Event('ended'))
      }, 150)
      return Promise.resolve()
    }

    ;(window as any).Audio = MockAudio
  })
}

/**
 * Mock HTMLAudioElement where EVERY play() call rejects with NotAllowedError.
 * This simulates autoplay policy blocks for both Tier 1 and Tier 2.
 */
async function addAlwaysNotAllowedAudioMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    ;(window as any).__playedAudioUrls = []

    function MockAudio(this: any, src?: string) {
      this.src = src || ''
      this.duration = 3.0
      this.currentTime = 0
      this.paused = true
      this.onloadedmetadata = null
      this.onplay = null
      this.onended = null
      this.onerror = null
    }

    MockAudio.prototype.pause = function (this: any) {
      this.paused = true
    }

    MockAudio.prototype.play = function (this: any) {
      ;(window as any).__playedAudioUrls.push(this.src)
      const err = new Error('NotAllowedError')
      ;(err as any).name = 'NotAllowedError'
      return Promise.reject(err)
    }

    ;(window as any).Audio = MockAudio
  })
}

// ──────────────────────────────────────────────
// API mock helpers
// ──────────────────────────────────────────────

interface OpeningResponse {
  text?: string | null
  source?: 'static' | 'precomputed' | null
  audioUrl?: string | null
  wordTimings?: Array<{ word: string; startMs: number; endMs: number }> | null
  contentType?: string | null
  timingSource?: 'actual' | 'estimated' | null
}

async function mockOpeningAPI(page: Page, opening: OpeningResponse): Promise<void> {
  await page.route('**/api/session/opening*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        text: opening.text ?? null,
        source: opening.source ?? null,
        audioUrl: opening.audioUrl ?? null,
        wordTimings: opening.wordTimings ?? null,
        contentType: opening.contentType ?? null,
        timingSource: opening.timingSource ?? null,
      }),
    })
  })
}

async function mockBootstrapAPI(page: Page): Promise<void> {
  await page.route('**/api/session/bootstrap', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ conversationId: 'mock-conv-v2-instant' }),
    })
  })
}

async function mockSynthesizeAPI(page: Page, tracker?: { called: boolean }): Promise<void> {
  const wavBase64 = createValidWav(1000)
  await page.route('**/api/voice/synthesize', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }
    if (tracker) tracker.called = true
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        audio: wavBase64,
        contentType: 'audio/wav',
        wordTimings: [{ word: 'Test', startMs: 0, endMs: 500 }],
        timingSource: 'estimated',
        estimatedDurationMs: 1000,
      }),
    })
  })
}

// The mock signed URL our opening endpoint will return for pre-stored audio
const MOCK_SIGNED_AUDIO_URL = 'http://localhost:3000/mock-presigned-audio.wav'

const SAMPLE_WORD_TIMINGS = [
  { word: 'Every', startMs: 0, endMs: 200 },
  { word: 'craving', startMs: 220, endMs: 500 },
  { word: 'ends.', startMs: 520, endMs: 700 },
]

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

test.describe('Instant Conversations v2 — 3-tier fast-start', () => {
  test('Tier 1: plays pre-stored audio without calling /api/voice/synthesize', async ({
    page,
  }) => {
    const openingText = 'Every craving ends.'

    // Mock Audio to fire onplay automatically — enables Tier 1 in headless mode
    await addAutoPlayAudioMock(page)
    await addMicrophoneMocks(page)

    await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
    await mockConversationsAPI(page, [])

    // Opening endpoint returns text + pre-stored audio URL
    await mockOpeningAPI(page, {
      text: openingText,
      source: 'static',
      audioUrl: MOCK_SIGNED_AUDIO_URL,
      wordTimings: SAMPLE_WORD_TIMINGS,
      contentType: 'audio/wav',
      timingSource: 'estimated',
    })

    // Return a valid WAV binary when the signed URL is fetched
    const wavBase64 = createValidWav(700)
    await page.route('**/mock-presigned-audio.wav', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: Buffer.from(wavBase64, 'base64'),
      })
    })

    await mockBootstrapAPI(page)

    // Track synthesize — should NOT be called when Tier 1 succeeds
    const synthesizeTracker = { called: false }
    await mockSynthesizeAPI(page, synthesizeTracker)

    await page.goto('/session/stress_relief')
    await page.waitForTimeout(3000)

    // Opening text is visible (pushed to messages before audio attempt)
    await expect(page.getByText(openingText)).toBeVisible({ timeout: 5000 })

    // Tier 1 used pre-stored audio — synthesize must NOT have been called
    expect(synthesizeTracker.called).toBe(false)
  })

  test('Tier 2: calls /api/voice/synthesize when opening has no audioUrl', async ({ page }) => {
    const openingText = 'Nicotine never fixed anything.'

    await addAutoPlayAudioMock(page)
    await addMicrophoneMocks(page)

    await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
    await mockConversationsAPI(page, [])

    // Opening has text but no audioUrl → Tier 1 skipped, Tier 2 runs
    await mockOpeningAPI(page, {
      text: openingText,
      source: 'static',
      audioUrl: null,
      wordTimings: null,
      contentType: null,
      timingSource: null,
    })

    await mockBootstrapAPI(page)

    // Track synthesize — must be called for Tier 2
    const synthesizeTracker = { called: false }
    await mockSynthesizeAPI(page, synthesizeTracker)

    // Mock chat API as Tier 3 fallback (in case Tier 2 audio fails in this env)
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      const events = [
        `data: ${JSON.stringify({ type: 'token', token: openingText, conversationId: 'mock-t2-fallback' })}\n\n`,
        `data: ${JSON.stringify({ type: 'done', done: true, conversationId: 'mock-t2-fallback', sessionComplete: false, streamingTTS: false })}\n\n`,
      ].join('')
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
        body: events,
      })
    })

    await page.goto('/session/stress_relief')
    await page.waitForTimeout(3000)

    // Opening text should be visible
    await expect(page.getByText(openingText)).toBeVisible({ timeout: 5000 })

    // Tier 2: synthesize must have been called
    expect(synthesizeTracker.called).toBe(true)
  })

  test('Tier 1 → Tier 2 fallback: synthesize called when pre-stored audio fails', async ({
    page,
  }) => {
    const openingText = 'The urge always passes.'

    // First play() rejects → playFromUrl's .catch() fires resolve(false) → Tier 2 triggered
    await addFirstFailAudioMock(page)
    await addMicrophoneMocks(page)

    await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
    await mockConversationsAPI(page, [])

    // Opening has audioUrl, but the audio element will fail
    await mockOpeningAPI(page, {
      text: openingText,
      source: 'static',
      audioUrl: MOCK_SIGNED_AUDIO_URL,
      wordTimings: SAMPLE_WORD_TIMINGS,
      contentType: 'audio/wav',
      timingSource: 'estimated',
    })

    // Audio URL also returns 500 at network level
    await page.route('**/mock-presigned-audio.wav', async (route) => {
      await route.fulfill({ status: 500, body: 'Audio Unavailable' })
    })

    await mockBootstrapAPI(page)

    // Track synthesize — must be called as Tier 2 fallback
    const synthesizeTracker = { called: false }
    await mockSynthesizeAPI(page, synthesizeTracker)

    // Chat API fallback if Tier 2 also fails
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      const events = [
        `data: ${JSON.stringify({ type: 'token', token: openingText, conversationId: 'mock-t1t2-fallback' })}\n\n`,
        `data: ${JSON.stringify({ type: 'done', done: true, conversationId: 'mock-t1t2-fallback', sessionComplete: false, streamingTTS: false })}\n\n`,
      ].join('')
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
        body: events,
      })
    })

    await page.goto('/session/stress_relief')
    // Allow time for Tier 1 failure (50ms onerror) + Tier 2 synthesize call
    await page.waitForTimeout(3000)

    // Tier 2 must have been attempted after Tier 1 failed
    expect(synthesizeTracker.called).toBe(true)
  })

  test('Tier 3: uses full LLM streaming when opening has no text', async ({ page }) => {
    const streamingResponseText = 'Let us begin together.'

    await addAutoPlayAudioMock(page)
    await addMicrophoneMocks(page)

    await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
    await mockConversationsAPI(page, [])

    // Opening returns null text → fast-start skipped entirely, falls to Tier 3
    await mockOpeningAPI(page, {
      text: null,
      source: null,
      audioUrl: null,
      wordTimings: null,
      contentType: null,
      timingSource: null,
    })

    await mockBootstrapAPI(page)

    // Track chat API call — must be called for Tier 3
    const chatTracker = { called: false }
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      chatTracker.called = true
      const events = [
        `data: ${JSON.stringify({ type: 'token', token: streamingResponseText, conversationId: 'mock-conv-t3' })}\n\n`,
        `data: ${JSON.stringify({ type: 'done', done: true, conversationId: 'mock-conv-t3', sessionComplete: false, streamingTTS: false })}\n\n`,
      ].join('')
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
        body: events,
      })
    })

    // Mock synthesize for batch TTS that runs after streaming (streamingTTS: false)
    await mockSynthesizeAPI(page)

    await page.goto('/session/stress_relief')
    await page.waitForTimeout(3000)

    // Chat API must have been called (Tier 3 full flow)
    expect(chatTracker.called).toBe(true)

    // Streaming response text should be visible
    await expect(page.getByText(streamingResponseText)).toBeVisible({ timeout: 5000 })
  })

  test('Returning user with precomputed L2 opening uses Tier 1, not Tier 3', async ({ page }) => {
    const precomputedText = 'You handled that moment without nicotine.'

    // Mock Audio to auto-play — simulates preInitAudio having set up AudioContext
    await addAutoPlayAudioMock(page)
    await addMicrophoneMocks(page)

    // Returning user: L1 completed, now starting L2
    await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [0] })
    await mockConversationsAPI(page, [])

    // Opening returns precomputed text + pre-stored audio (L2 fast-start)
    await mockOpeningAPI(page, {
      text: precomputedText,
      source: 'precomputed',
      audioUrl: MOCK_SIGNED_AUDIO_URL,
      wordTimings: SAMPLE_WORD_TIMINGS,
      contentType: 'audio/wav',
      timingSource: 'actual',
    })

    // Return valid WAV binary for the signed audio URL
    const wavBase64 = createValidWav(700)
    await page.route('**/mock-presigned-audio.wav', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: Buffer.from(wavBase64, 'base64'),
      })
    })

    await mockBootstrapAPI(page)

    // Track synthesize and chat — NEITHER should be called when Tier 1 succeeds
    const synthesizeTracker = { called: false }
    await mockSynthesizeAPI(page, synthesizeTracker)

    const chatTracker = { called: false }
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      chatTracker.called = true
      const events = [
        `data: ${JSON.stringify({ type: 'token', token: 'LLM fallback text', conversationId: 'mock-t3-fallback' })}\n\n`,
        `data: ${JSON.stringify({ type: 'done', done: true, conversationId: 'mock-t3-fallback', sessionComplete: false, streamingTTS: false })}\n\n`,
      ].join('')
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
        body: events,
      })
    })

    await page.goto('/session/stress_relief')
    await page.waitForTimeout(3000)

    // Precomputed opening text should be visible
    await expect(page.getByText(precomputedText)).toBeVisible({ timeout: 5000 })

    // Tier 1 succeeded — neither synthesize (Tier 2) nor chat (Tier 3) should have been called
    expect(synthesizeTracker.called).toBe(false)
    expect(chatTracker.called).toBe(false)
  })

  test('NotAllowedError on Tier 1+2 causes Tier 3 fallback after opening payload', async ({ page }) => {
    const openingText = 'This should attempt fast-start audio first.'
    const fallbackText = 'Tier 3 fallback response'
    let openingCalled = false

    // Simulate autoplay policy: both Tier 1 and Tier 2 play() reject with NotAllowedError
    await addAlwaysNotAllowedAudioMock(page)
    await addMicrophoneMocks(page)

    await mockUserInProgress(page, { currentIllusion: 1, illusionsCompleted: [] })
    await mockConversationsAPI(page, [])

    await page.route('**/api/session/opening*', async (route) => {
      openingCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: openingText,
          source: 'precomputed',
          audioUrl: MOCK_SIGNED_AUDIO_URL,
          wordTimings: SAMPLE_WORD_TIMINGS,
          contentType: 'audio/wav',
          timingSource: 'actual',
        }),
      })
    })

    await page.route('**/mock-presigned-audio.wav', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: Buffer.from(createValidWav(700), 'base64'),
      })
    })

    await mockBootstrapAPI(page)
    await mockSynthesizeAPI(page)

    const chatTracker = { called: false }
    await page.route('**/api/chat', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue()
        return
      }
      chatTracker.called = true
      const events = [
        `data: ${JSON.stringify({ type: 'token', token: fallbackText, conversationId: 'mock-notallowed-fallback' })}\n\n`,
        `data: ${JSON.stringify({ type: 'done', done: true, conversationId: 'mock-notallowed-fallback', sessionComplete: false, streamingTTS: false })}\n\n`,
      ].join('')
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' },
        body: events,
      })
    })

    await page.goto('/session/stress_relief')
    await page.waitForTimeout(3000)

    expect(openingCalled).toBe(true)
    expect(chatTracker.called).toBe(true)
  })

  test('non-core session (check-in) does not call /api/session/opening', async ({ page }) => {
    // Track whether the opening endpoint is ever called
    let openingCalled = false
    await page.route('**/api/session/opening*', async (route) => {
      openingCalled = true
      // Fulfill with empty response so the page doesn't break if it does call it
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: null,
          source: null,
          audioUrl: null,
          wordTimings: null,
          contentType: null,
          timingSource: null,
        }),
      })
    })

    // Navigate to a check-in session (non-core, different sessionType)
    // Providing prompt in query param avoids the need to mock /api/check-ins/:id
    await page.goto('/check-in/test-non-core-e2e?prompt=How+are+you+feeling%3F')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)

    // /api/session/opening must NOT have been called for non-core sessions
    expect(openingCalled).toBe(false)
  })
})
