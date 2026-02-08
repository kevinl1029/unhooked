import type { Page } from '@playwright/test'

// ──────────────────────────────────────────────
// Chat API Mocking (Streaming SSE)
// ──────────────────────────────────────────────

export interface MockChatResponseOptions {
  /** Individual text tokens to stream (takes priority over responseText) */
  tokens?: string[]
  /** Full response text — will be split into word-boundary tokens */
  responseText?: string
  /** Conversation ID to return in SSE events */
  conversationId?: string
  /** Whether to signal session completion in the done event */
  sessionComplete?: boolean
  /** Return an API error instead of a successful response */
  error?: { message: string; status?: number }
}

/**
 * Build a single SSE `data:` line
 */
function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

/**
 * Build a full SSE response body for a chat response.
 * Includes token events + done event (or a single error event).
 */
function buildChatSSEBody(options: MockChatResponseOptions = {}): string {
  const conversationId = options.conversationId || 'mock-conversation-id'

  if (options.error) {
    return sseEvent({
      type: 'error',
      error: options.error.message,
      status: options.error.status || 500,
    })
  }

  // Split responseText at word boundaries if no explicit tokens provided
  const tokens =
    options.tokens ??
    (options.responseText
      ? options.responseText.split(/(?<=\s)/)
      : ['Hello! ', "I'm your AI coach. ", "Let's begin."])

  const events: string[] = []

  for (const token of tokens) {
    events.push(
      sseEvent({
        type: 'token',
        token,
        conversationId,
      }),
    )
  }

  events.push(
    sseEvent({
      type: 'done',
      done: true,
      conversationId,
      sessionComplete: options.sessionComplete ?? false,
      streamingTTS: false,
    }),
  )

  return events.join('')
}

/**
 * Mock `POST /api/chat` (streaming SSE).
 *
 * Pass a single options object for a static response, or an **array** to
 * return different responses for successive calls (the last entry repeats
 * for any extra calls beyond the array length).
 */
export async function mockChatAPI(
  page: Page,
  options: MockChatResponseOptions | MockChatResponseOptions[] = {},
): Promise<void> {
  let callIndex = 0
  const responseList = Array.isArray(options) ? options : [options]

  await page.route('**/api/chat', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    const current = responseList[Math.min(callIndex, responseList.length - 1)]
    callIndex++

    // Hard errors: return non-200 so `response.ok` is false on the client
    if (current.error) {
      await route.fulfill({
        status: current.error.status || 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: current.error.message }),
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body: buildChatSSEBody(current),
    })
  })
}

// ──────────────────────────────────────────────
// Conversations API Mocking
// ──────────────────────────────────────────────

export interface MockConversationOptions {
  id?: string
  sessionCompleted?: boolean
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
  illusionKey?: 'stress_relief' | 'pleasure' | 'willpower' | 'focus' | 'identity'
  illusionNumber?: number
}

function numberToIllusionKey(illusionNumber?: number): MockConversationOptions['illusionKey'] {
  if (illusionNumber === 1) return 'stress_relief'
  if (illusionNumber === 2) return 'pleasure'
  if (illusionNumber === 3) return 'willpower'
  if (illusionNumber === 4) return 'focus'
  if (illusionNumber === 5) return 'identity'
  return 'stress_relief'
}

function getConversationIllusionKey(conv: MockConversationOptions): MockConversationOptions['illusionKey'] {
  return conv.illusionKey || numberToIllusionKey(conv.illusionNumber)
}

function getConversationTitle(illusionKey?: MockConversationOptions['illusionKey']): string {
  const titles: Record<string, string> = {
    stress_relief: 'The Stress Illusion',
    pleasure: 'The Pleasure Illusion',
    willpower: 'The Willpower Illusion',
    focus: 'The Focus Illusion',
    identity: 'The Identity Illusion',
  }
  return titles[illusionKey || 'stress_relief'] || 'New conversation'
}

/**
 * Mock `GET /api/conversations` (list) and `GET /api/conversations/:id` (detail).
 *
 * Uses a single catch-all route with URL-based dispatch to avoid glob-matching
 * ambiguity between the list and detail endpoints.
 */
export async function mockConversationsAPI(
  page: Page,
  conversations: MockConversationOptions[] = [],
): Promise<void> {
  // Build a lookup map for detail requests
  const convMap = new Map<string, MockConversationOptions>()
  for (const conv of conversations) {
    convMap.set(conv.id || 'mock-conversation-id', conv)
  }

  // Detail routes: /api/conversations/:id  (single * matches one path segment)
  await page.route('**/api/conversations/*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const segments = url.pathname.split('/').filter(Boolean) // ['api', 'conversations', '<id>']
    const convId = segments[segments.length - 1]
    const conv = convMap.get(convId)

    if (conv) {
      const illusionKey = getConversationIllusionKey(conv)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: convId,
          title: getConversationTitle(illusionKey),
          session_completed: conv.sessionCompleted ?? false,
          illusion_key: illusionKey,
          messages: conv.messages || [],
          created_at: new Date().toISOString(),
        }),
      })
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Conversation not found' }),
      })
    }
  })

  // List route: /api/conversations  (no sub-path)
  await page.route('**/api/conversations', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.continue()
      return
    }

    const url = new URL(route.request().url())
    const illusionParam = url.searchParams.get('illusionKey')

    const filtered = illusionParam
      ? conversations.filter((c) => getConversationIllusionKey(c) === illusionParam)
      : conversations

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        filtered.map((c) => ({
          illusion_key: getConversationIllusionKey(c),
          id: c.id || 'mock-conversation-id',
          session_completed: c.sessionCompleted ?? false,
          title: getConversationTitle(getConversationIllusionKey(c)),
          created_at: new Date().toISOString(),
        })),
      ),
    })
  })
}

// ──────────────────────────────────────────────
// User Status API Mocking (/api/user/status)
// ──────────────────────────────────────────────

export interface MockUserStatusOptions {
  phase?: 'not_started' | 'in_progress' | 'ceremony_ready' | 'post_ceremony'
  currentIllusion?: number
  illusionsCompleted?: number[]
  illusionOrder?: number[]
  totalSessions?: number
}

/**
 * Mock `GET /api/user/status` — used by `useUserStatus()` on the dashboard.
 */
export async function mockUserStatusAPI(
  page: Page,
  options: MockUserStatusOptions = {},
): Promise<void> {
  const phase = options.phase ?? 'in_progress'
  const currentIllusion = options.currentIllusion ?? 1
  const illusionsCompleted = options.illusionsCompleted ?? []
  const illusionOrder = options.illusionOrder ?? [1, 2, 3, 4, 5]
  const totalSessions = options.totalSessions ?? 0

  const nextIllusion = illusionOrder.find((m) => !illusionsCompleted.includes(m))

  await page.route('**/api/user/status', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          phase,
          progress: {
            program_status:
              phase === 'not_started'
                ? 'not_started'
                : phase === 'ceremony_ready'
                  ? 'completed'
                  : 'in_progress',
            current_illusion: currentIllusion,
            illusions_completed: illusionsCompleted,
            illusion_order: illusionOrder,
            total_sessions: totalSessions,
            started_at: phase !== 'not_started' ? new Date().toISOString() : null,
          },
          ceremony: null,
          artifacts: null,
          pending_follow_ups: null,
          next_session: nextIllusion ? { illusionNumber: nextIllusion } : null,
          illusion_last_sessions: null,
        }),
      })
    } else {
      await route.continue()
    }
  })
}
