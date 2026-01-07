/**
 * Mock LLM responses for E2E testing
 * These simulate the streaming SSE format from /api/chat
 */

export type ChatScenario = 'greeting' | 'normal' | 'session-complete' | 'error'

export interface MockChatResponse {
  tokens: string[]
  sessionComplete: boolean
}

export const MOCK_CONVERSATION_ID = 'mock-conv-id-12345'

export const llmResponses: Record<ChatScenario, MockChatResponse> = {
  greeting: {
    tokens: [
      "Hello! ",
      "I'm so glad you're here. ",
      "Taking this step shows real courage. ",
      "Let's explore your relationship with nicotine together. ",
      "What's been on your mind lately about your usage?"
    ],
    sessionComplete: false,
  },

  normal: {
    tokens: [
      "That's a really important insight. ",
      "Many people feel exactly the same way. ",
      "The key thing to understand is that nicotine doesn't actually provide what it promises. ",
      "It creates the problem it pretends to solve. ",
      "How does that resonate with your experience?"
    ],
    sessionComplete: false,
  },

  'session-complete': {
    tokens: [
      "You've done incredible work today. ",
      "You now understand that the stress relief you thought nicotine provided ",
      "was actually just relieving the stress that nicotine withdrawal created. ",
      "This is a profound shift in understanding. ",
      "Take some time to reflect on what we've discussed. ",
      "[SESSION_COMPLETE]"
    ],
    sessionComplete: true,
  },

  error: {
    tokens: [],
    sessionComplete: false,
  },
}

/**
 * Convert mock response to SSE format matching the real /api/chat endpoint
 */
export function toSSEStream(scenario: ChatScenario): string {
  const response = llmResponses[scenario]

  if (scenario === 'error') {
    return `data: ${JSON.stringify({
      error: 'Mock API error for testing',
      status: 500,
      conversationId: MOCK_CONVERSATION_ID
    })}\n\n`
  }

  const events: string[] = []

  // Stream each token
  for (const token of response.tokens) {
    events.push(`data: ${JSON.stringify({
      token,
      conversationId: MOCK_CONVERSATION_ID
    })}\n\n`)
  }

  // Send completion event
  events.push(`data: ${JSON.stringify({
    done: true,
    conversationId: MOCK_CONVERSATION_ID,
    sessionComplete: response.sessionComplete
  })}\n\n`)

  return events.join('')
}

/**
 * Get the full text response for a scenario
 */
export function getFullResponse(scenario: ChatScenario): string {
  return llmResponses[scenario].tokens.join('')
}
