import type { Page } from '@playwright/test'
import { toSSEStream, MOCK_CONVERSATION_ID, type ChatScenario } from '../fixtures/llm-responses'

export interface MockChatOptions {
  scenario?: ChatScenario
  delay?: number // ms delay before response
}

/**
 * Mock the /api/chat endpoint with predefined responses
 */
export async function mockChatAPI(
  page: Page,
  options: MockChatOptions = {}
): Promise<void> {
  const { scenario = 'normal', delay = 50 } = options

  await page.route('**/api/chat', async (route) => {
    // Add small delay to simulate network latency
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    const sseBody = toSSEStream(scenario)

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body: sseBody,
    })
  })
}

/**
 * Mock the /api/voice/transcribe endpoint
 */
export async function mockTranscribeAPI(
  page: Page,
  transcript: string = 'This is a mock transcription of audio input.'
): Promise<void> {
  await page.route('**/api/voice/transcribe', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ transcript }),
    })
  })
}

/**
 * Mock the /api/voice/synthesize endpoint
 */
export async function mockSynthesizeAPI(page: Page): Promise<void> {
  await page.route('**/api/voice/synthesize', async (route) => {
    // Return minimal audio data and word timings
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        audio: 'data:audio/mp3;base64,//uQx...', // Minimal base64 audio stub
        wordTimings: [
          { word: 'Hello', start: 0, end: 0.5 },
          { word: 'there', start: 0.5, end: 1.0 },
        ],
      }),
    })
  })
}

/**
 * Mock the /api/conversations endpoints
 */
export async function mockConversationsAPI(page: Page): Promise<void> {
  // Mock GET /api/conversations
  await page.route('**/api/conversations', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    } else if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: MOCK_CONVERSATION_ID,
          title: 'Mock Conversation',
          created_at: new Date().toISOString(),
        }),
      })
    } else {
      await route.continue()
    }
  })

  // Mock GET /api/conversations/[id]
  await page.route('**/api/conversations/*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: MOCK_CONVERSATION_ID,
        title: 'Mock Conversation',
        messages: [],
      }),
    })
  })
}

/**
 * Convenience function to set up all API mocks at once
 */
export async function mockAllAPIs(
  page: Page,
  chatScenario: ChatScenario = 'normal'
): Promise<void> {
  await mockChatAPI(page, { scenario: chatScenario })
  await mockTranscribeAPI(page)
  await mockSynthesizeAPI(page)
  await mockConversationsAPI(page)
}
