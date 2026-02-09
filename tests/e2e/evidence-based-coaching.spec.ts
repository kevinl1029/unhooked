/**
 * Evidence-Based Coaching E2E Tests (US-018)
 *
 * Covers:
 * - L1 completion -> observation text + Continue CTA + dashboard "Session 2 of 3"
 * - Continue-immediately flow -> next session uses emotional layer (new core session path)
 * - L3 completion -> generic settling text, no Continue CTA, next illusion unlocked
 * - Dashboard layer progress dots (aria + opacity + size)
 * - Stale client wrong illusionLayer -> 409 -> refresh/retry with correct layer
 */

import { test, expect } from '@playwright/test'
import { mockIntakeAPI } from './utils'
import {
  mockCheckInInterstitial,
  mockDashboardMoments,
  mockTimezoneAPI,
} from './utils/mock-check-in'

type IllusionLayer = 'intellectual' | 'emotional' | 'identity'

interface ProgressState {
  current_illusion: number
  illusions_completed: number[]
  layer_progress: Record<string, IllusionLayer[]>
  total_sessions: number
}

function buildProgress(state: ProgressState) {
  const now = new Date().toISOString()
  return {
    id: 'mock-progress-id',
    user_id: 'mock-user-id',
    program_status: 'in_progress',
    current_illusion: state.current_illusion,
    illusion_order: [1, 2, 3, 4, 5],
    illusions_completed: state.illusions_completed,
    layer_progress: state.layer_progress,
    total_sessions: state.total_sessions,
    last_reminded_at: null,
    started_at: now,
    completed_at: null,
    last_session_at: state.total_sessions > 0 ? now : null,
    created_at: now,
    updated_at: now,
  }
}

function buildUserStatus(state: ProgressState) {
  const nextIllusion = [1, 2, 3, 4, 5].find((n) => !state.illusions_completed.includes(n)) || null
  return {
    phase: 'in_progress',
    progress: {
      program_status: 'in_progress',
      current_illusion: state.current_illusion,
      illusions_completed: state.illusions_completed,
      illusion_order: [1, 2, 3, 4, 5],
      layer_progress: state.layer_progress,
      total_sessions: state.total_sessions,
      started_at: new Date().toISOString(),
    },
    ceremony: null,
    artifacts: null,
    pending_follow_ups: null,
    next_session: nextIllusion ? { illusionNumber: nextIllusion } : null,
    illusion_last_sessions: null,
  }
}

async function setupDashboardDependencies(page: import('@playwright/test').Page) {
  await mockIntakeAPI(page)
  await mockCheckInInterstitial(page, { hasPending: false })
  await mockDashboardMoments(page)
  await mockTimezoneAPI(page)
}

async function mockProgressAndStatus(
  page: import('@playwright/test').Page,
  stateRef: { current: ProgressState }
) {
  await page.route('**/api/progress', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildProgress(stateRef.current)),
    })
  })

  await page.route('**/api/user/status', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildUserStatus(stateRef.current)),
    })
  })
}

function buildChatSSEBody(responseText: string, conversationId: string, sessionComplete = false) {
  const tokens = responseText.split(/(?<=\s)/)
  const events: string[] = []
  for (const token of tokens) {
    events.push(
      `data: ${JSON.stringify({ type: 'token', token, conversationId })}\n\n`
    )
  }
  events.push(
    `data: ${JSON.stringify({
      type: 'done',
      done: true,
      conversationId,
      sessionComplete,
      streamingTTS: false,
    })}\n\n`
  )
  return events.join('')
}

async function mockChatSequential(
  page: import('@playwright/test').Page,
  responses: Array<{ text: string; conversationId: string; sessionComplete?: boolean }>,
  requestBodies?: Array<{ conversationId?: string | null; illusionLayer?: string; sessionType?: string }>
) {
  let idx = 0
  await page.route('**/api/chat', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    const requestBody = route.request().postDataJSON() as {
      conversationId?: string | null
      illusionLayer?: string
      sessionType?: string
    }
    if (requestBodies) {
      requestBodies.push({
        conversationId: requestBody.conversationId ?? null,
        illusionLayer: requestBody.illusionLayer,
        sessionType: requestBody.sessionType,
      })
    }

    const current = responses[Math.min(idx, responses.length - 1)]
    idx++

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildChatSSEBody(current.text, current.conversationId, current.sessionComplete ?? false),
    })
  })
}

async function mockConversationsByLayer(
  page: import('@playwright/test').Page,
  layersByConversationId: Record<string, IllusionLayer>
) {
  await page.route('**/api/conversations/*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    const url = new URL(route.request().url())
    const conversationId = url.pathname.split('/').filter(Boolean).pop() as string
    const layer = layersByConversationId[conversationId] || 'intellectual'

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: conversationId,
        title: 'The Stress Illusion',
        session_completed: false,
        illusion_key: 'stress_relief',
        illusion_layer: layer,
        messages: [],
        created_at: new Date().toISOString(),
      }),
    })
  })

  await page.route('**/api/conversations', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }
    const url = new URL(route.request().url())
    if (url.pathname !== '/api/conversations') {
      await route.continue()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })
}

async function waitForSessionReady(page: import('@playwright/test').Page, openingText: RegExp) {
  await expect(page.getByText(openingText)).toBeVisible({ timeout: 15000 })
  await expect(page.getByPlaceholder('Type your message...')).toBeVisible({ timeout: 10000 })
}

test.describe('Evidence-Based Coaching (US-018)', () => {
  test('Flow 1: L1 completion shows observation + Continue CTA, dashboard shows Session 2 of 3', async ({
    page,
  }) => {
    const stateRef = {
      current: {
        current_illusion: 1,
        illusions_completed: [],
        layer_progress: {},
        total_sessions: 0,
      } satisfies ProgressState,
    }
    await setupDashboardDependencies(page)
    await mockProgressAndStatus(page, stateRef)
    await mockConversationsByLayer(page, { 'mock-conv-1': 'intellectual' })

    await mockChatSequential(page, [
      { text: 'Welcome to the intellectual layer session.', conversationId: 'mock-conv-1' },
      {
        text: 'Great work. [SESSION_COMPLETE] [OBSERVATION_ASSIGNMENT: Notice when stress appears — does it really come from nicotine?]',
        conversationId: 'mock-conv-1',
        sessionComplete: true,
      },
    ])

    await page.route('**/api/progress/complete-session', async (route) => {
      const body = route.request().postDataJSON() as { illusionLayer?: IllusionLayer }
      expect(body.illusionLayer).toBe('intellectual')

      stateRef.current = {
        ...stateRef.current,
        layer_progress: { stress_relief: ['intellectual'] },
        total_sessions: 1,
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          progress: buildProgress(stateRef.current),
          layerCompleted: 'intellectual',
          nextLayer: 'emotional',
          isIllusionComplete: false,
          observationAssignment:
            'Notice when stress appears — does it really come from nicotine?',
          nextIllusion: null,
          isComplete: false,
        }),
      })
    })

    await page.goto('/session/stress_relief?mode=text')
    await waitForSessionReady(page, /intellectual layer session/i)

    await page.getByPlaceholder('Type your message...').fill('I understand the stress illusion now.')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByRole('heading', { name: 'Session Complete' })).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByText('Notice when stress appears — does it really come from nicotine?', { exact: true })
    ).toBeVisible()
    await expect(page.getByRole('button', { name: /Continue to Next Session/i })).toBeVisible()

    await page.getByRole('button', { name: /Return to Dashboard/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.getByText('Session 2 of 3', { exact: true })).toBeVisible({ timeout: 10000 })
  })

  test('Flow 2: Continue immediately starts emotional layer and uses new core-session path', async ({
    page,
  }) => {
    const stateRef = {
      current: {
        current_illusion: 1,
        illusions_completed: [],
        layer_progress: {},
        total_sessions: 0,
      } satisfies ProgressState,
    }
    const chatRequests: Array<{ conversationId?: string | null; illusionLayer?: string; sessionType?: string }> = []

    await setupDashboardDependencies(page)
    await mockProgressAndStatus(page, stateRef)
    await mockConversationsByLayer(page, {
      'mock-conv-1': 'intellectual',
      'mock-conv-2': 'emotional',
    })

    await mockChatSequential(
      page,
      [
        { text: 'Intellectual layer session.', conversationId: 'mock-conv-1' },
        {
          text: 'Nice work. [SESSION_COMPLETE] [OBSERVATION_ASSIGNMENT: Track your stress.]',
          conversationId: 'mock-conv-1',
          sessionComplete: true,
        },
        {
          text: 'Welcome to the emotional layer. What have you been noticing?',
          conversationId: 'mock-conv-2',
        },
      ],
      chatRequests
    )

    await page.route('**/api/progress/complete-session', async (route) => {
      stateRef.current = {
        ...stateRef.current,
        layer_progress: { stress_relief: ['intellectual'] },
        total_sessions: 1,
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          progress: buildProgress(stateRef.current),
          layerCompleted: 'intellectual',
          nextLayer: 'emotional',
          isIllusionComplete: false,
          observationAssignment: 'Track your stress.',
          nextIllusion: null,
          isComplete: false,
        }),
      })
    })

    await page.goto('/session/stress_relief?mode=text')
    await waitForSessionReady(page, /intellectual layer session/i)

    await page.getByPlaceholder('Type your message...').fill('I get it.')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByRole('heading', { name: 'Session Complete' })).toBeVisible({
      timeout: 15000,
    })

    await page.getByRole('button', { name: /Continue to Next Session/i }).click()
    await expect(page.getByText(/Welcome to the emotional layer/i)).toBeVisible({ timeout: 15000 })

    expect(chatRequests.length).toBeGreaterThanOrEqual(3)
    const emotionalOpenRequest = chatRequests[2]
    expect(emotionalOpenRequest.conversationId).toBeNull()
    expect(emotionalOpenRequest.illusionLayer).toBe('emotional')
    expect(emotionalOpenRequest.sessionType ?? 'core').toBe('core')
  })

  test('Flow 3: L3 completion shows no Continue CTA and dashboard unlocks next illusion', async ({
    page,
  }) => {
    const stateRef = {
      current: {
        current_illusion: 1,
        illusions_completed: [],
        layer_progress: { stress_relief: ['intellectual', 'emotional'] },
        total_sessions: 2,
      } satisfies ProgressState,
    }

    await setupDashboardDependencies(page)
    await mockProgressAndStatus(page, stateRef)
    await mockConversationsByLayer(page, { 'mock-conv-3': 'identity' })
    await mockChatSequential(page, [
      { text: 'Welcome to the identity layer session.', conversationId: 'mock-conv-3' },
      {
        text: "You've seen through the Stress Relief illusion. [SESSION_COMPLETE]",
        conversationId: 'mock-conv-3',
        sessionComplete: true,
      },
    ])

    await page.route('**/api/progress/complete-session', async (route) => {
      const body = route.request().postDataJSON() as { illusionLayer?: IllusionLayer }
      expect(body.illusionLayer).toBe('identity')

      stateRef.current = {
        current_illusion: 2,
        illusions_completed: [1],
        layer_progress: { stress_relief: ['intellectual', 'emotional', 'identity'] },
        total_sessions: 3,
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          progress: buildProgress(stateRef.current),
          layerCompleted: 'identity',
          nextLayer: null,
          isIllusionComplete: true,
          observationAssignment: null,
          nextIllusion: 2,
          isComplete: false,
        }),
      })
    })

    await page.goto('/session/stress_relief?mode=text')
    await waitForSessionReady(page, /identity layer session/i)

    await page.getByPlaceholder('Type your message...').fill('I have integrated this.')
    await page.getByRole('button', { name: 'Send message' }).click()
    await expect(page.getByText('Session Complete')).toBeVisible({ timeout: 15000 })

    await expect(page.getByText('Great work. Take a moment to let this settle.', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Continue to Next Session/i })).not.toBeVisible()

    await page.getByRole('button', { name: /Return to Dashboard/i }).click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.getByText(/Continue: The Pleasure Illusion/i)).toBeVisible({ timeout: 10000 })
  })

  test('Flow 4: Dashboard layer progress dots show aria-label + opacity + size semantics', async ({
    page,
  }) => {
    const stateRef = {
      current: {
        current_illusion: 1,
        illusions_completed: [],
        layer_progress: { stress_relief: ['intellectual', 'emotional'] },
        total_sessions: 2,
      } satisfies ProgressState,
    }

    await setupDashboardDependencies(page)
    await mockProgressAndStatus(page, stateRef)

    await page.goto('/dashboard')

    await expect(page.getByText('Session 3 of 3', { exact: true })).toBeVisible({ timeout: 10000 })
    const dotsContainer = page.locator('div[aria-label="2 of 3 sessions complete"]')
    await expect(dotsContainer).toBeVisible()

    const dots = dotsContainer.locator('div.rounded-full')
    await expect(dots).toHaveCount(3)

    await expect(dots.nth(0)).toHaveCSS('opacity', '1')
    await expect(dots.nth(1)).toHaveCSS('opacity', '1')
    await expect(dots.nth(2)).toHaveCSS('opacity', '0.35')
    await expect(dots.nth(0)).toHaveCSS('width', '9px')
    await expect(dots.nth(2)).toHaveCSS('width', '8px')
  })

  test('Flow 5: stale client wrong illusionLayer gets 409 then refreshes and succeeds', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName !== 'chromium',
      'Validated in chromium; cross-browser route interception is flaky for this flow.'
    )
    const stateRef = {
      current: {
        current_illusion: 1,
        illusions_completed: [],
        layer_progress: { stress_relief: ['intellectual'] },
        total_sessions: 1,
      } satisfies ProgressState,
    }
    const completeBodies: Array<{ illusionLayer?: string }> = []
    let firstAttempt = true

    await setupDashboardDependencies(page)
    await mockProgressAndStatus(page, stateRef)
    // Conversation claims stale layer (intellectual), while progress expects emotional.
    await mockConversationsByLayer(page, { 'mock-conv-stale': 'intellectual' })
    await mockChatSequential(page, [
      { text: 'Emotional layer session.', conversationId: 'mock-conv-stale' },
      {
        text: 'Session complete. [SESSION_COMPLETE]',
        conversationId: 'mock-conv-stale',
        sessionComplete: true,
      },
    ])

    await page.route('**/api/progress/complete-session', async (route) => {
      const body = route.request().postDataJSON() as { illusionLayer?: IllusionLayer }
      completeBodies.push({ illusionLayer: body.illusionLayer })

      if (firstAttempt) {
        firstAttempt = false
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({
            message: "Layer mismatch. Expected 'emotional' but received 'intellectual'.",
            expectedLayer: 'emotional',
          }),
        })
        return
      }

      // Retry succeeds with refreshed layer.
      stateRef.current = {
        ...stateRef.current,
        layer_progress: { stress_relief: ['intellectual', 'emotional'] },
        total_sessions: 2,
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          progress: buildProgress(stateRef.current),
          layerCompleted: 'emotional',
          nextLayer: 'identity',
          isIllusionComplete: false,
          observationAssignment: 'Notice how this feels in your body.',
          nextIllusion: null,
          isComplete: false,
        }),
      })
    })

    await page.goto('/session/stress_relief?mode=text')
    await waitForSessionReady(page, /Emotional layer session/i)

    await page.getByPlaceholder('Type your message...').fill('This is landing emotionally.')
    await page.getByRole('button', { name: 'Send message' }).click()

    await expect(page.getByRole('heading', { name: 'Session Complete' })).toBeVisible({
      timeout: 15000,
    })
    expect(completeBodies.length).toBe(2)
    expect(completeBodies[0].illusionLayer).toBe('intellectual')
    expect(completeBodies[1].illusionLayer).toBe('emotional')
  })
})
