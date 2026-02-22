import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ChatTelemetryCollector, classifyTelemetryError } from '~/server/utils/telemetry'

// Shared init config for all tests
const BASE_INIT = {
  requestId: 'req-abc-123',
  requestStartedAt: new Date('2026-02-21T10:00:00Z').getTime(),
  userId: 'user-uuid-001',
  conversationId: 'conv-uuid-001',
  llmProvider: 'groq',
  llmModel: 'openai/gpt-oss-20b',
  ttsProvider: 'groq',
  ttsVoice: 'troy',
  ttsMode: 'sentence-batch',
  sessionType: 'core',
  isSessionStart: true,
  resilienceAttempt: null,
  resilienceRoute: null,
}

function makeMockSupabase(insertResult: object) {
  const mockInsert = vi.fn().mockResolvedValue(insertResult)
  const mockFrom = vi.fn(() => ({ insert: mockInsert }))
  return { mockSupabase: { from: mockFrom }, mockFrom, mockInsert }
}

describe('ChatTelemetryCollector', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-21T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should build complete success row with all timing marks', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)

    // stream starts 100ms after request
    vi.advanceTimersByTime(100)
    collector.markStreamStart()

    // first token 50ms after stream start
    vi.advanceTimersByTime(50)
    collector.markFirstToken()

    // first sentence 80ms after stream start
    vi.advanceTimersByTime(30)
    collector.markFirstSentence()

    // first audio 120ms after stream start
    vi.advanceTimersByTime(40)
    collector.markFirstAudio()

    collector.setMessageId('msg-uuid-001')

    // complete 300ms after request start
    vi.advanceTimersByTime(50)
    collector.markComplete({ tokenCount: 42, sentenceCount: 3, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockFrom, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)

    // Let the promise resolve
    await vi.runAllTimersAsync()

    expect(mockFrom).toHaveBeenCalledWith('chat_telemetry')
    const row = mockInsert.mock.calls[0][0]

    expect(row.status).toBe('success')
    expect(row.ttft_ms).toBe(50)
    expect(row.ttfs_ms).toBe(80)
    expect(row.ttfa_ms).toBe(120)
    expect(row.duration_ms).toBe(270)
    expect(row.token_count).toBe(42)
    expect(row.sentence_count).toBe(3)
    expect(row.message_id).toBe('msg-uuid-001')
    expect(row.tts_mode).toBe('sentence-batch')
    expect(row.request_id).toBe('req-abc-123')
    expect(row.user_id).toBe('user-uuid-001')
  })

  it('should build partial error row with missing marks', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)

    vi.advanceTimersByTime(100)
    collector.markStreamStart()

    vi.advanceTimersByTime(50)
    collector.markFirstToken()

    // Error before sentence/audio marks
    vi.advanceTimersByTime(20)
    collector.markError(Object.assign(new Error('Request aborted'), { status: undefined }))

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.status).toBe('error')
    expect(row.error_type).toBe('STREAM_INTERRUPTED')
    expect(row.ttft_ms).toBe(50)
    expect(row.ttfs_ms).toBeUndefined()
    expect(row.ttfa_ms).toBeUndefined()
    expect(row.duration_ms).toBe(170)
    expect(row.message_id).toBeNull()
  })

  it('should be idempotent for duplicate markFirstToken calls', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)

    vi.advanceTimersByTime(100)
    collector.markStreamStart()

    vi.advanceTimersByTime(50)
    collector.markFirstToken()

    vi.advanceTimersByTime(100)
    collector.markFirstToken() // duplicate — should not overwrite

    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.ttft_ms).toBe(50)
  })

  it('should be idempotent for duplicate markFirstSentence calls', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)

    vi.advanceTimersByTime(100)
    collector.markStreamStart()

    vi.advanceTimersByTime(50)
    collector.markFirstSentence()

    vi.advanceTimersByTime(100)
    collector.markFirstSentence() // duplicate

    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.ttfs_ms).toBe(50)
  })

  it('should be idempotent for duplicate markFirstAudio calls', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)

    vi.advanceTimersByTime(100)
    collector.markStreamStart()

    vi.advanceTimersByTime(50)
    collector.markFirstAudio()

    vi.advanceTimersByTime(100)
    collector.markFirstAudio() // duplicate

    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.ttfa_ms).toBe(50)
  })

  it('should compute duration_ms from requestStartedAt', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)

    vi.advanceTimersByTime(500)
    collector.markComplete({ tokenCount: 5, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.duration_ms).toBe(500)
  })

  it('should compute timing metrics relative to streamStartTime', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)

    vi.advanceTimersByTime(200)  // 200ms before stream
    collector.markStreamStart()

    vi.advanceTimersByTime(30)
    collector.markFirstToken()

    vi.advanceTimersByTime(20)
    collector.markFirstSentence()

    vi.advanceTimersByTime(40)
    collector.markFirstAudio()

    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    // All relative to streamStartTime, not requestStartedAt
    expect(row.ttft_ms).toBe(30)
    expect(row.ttfs_ms).toBe(50)
    expect(row.ttfa_ms).toBe(90)
    // duration from requestStartedAt
    expect(row.duration_ms).toBe(290)
  })

  it('should set created_at from requestStartedAt', async () => {
    const requestStartedAt = new Date('2026-02-21T10:00:00Z').getTime()
    const collector = new ChatTelemetryCollector({ ...BASE_INIT, requestStartedAt })
    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.created_at).toBe(new Date(requestStartedAt).toISOString())
  })

  it('should set stream_start_time on markStreamStart', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)

    vi.advanceTimersByTime(100)
    const streamStartMs = Date.now()
    collector.markStreamStart()

    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.stream_start_time).toBe(new Date(streamStartMs).toISOString())
  })

  it('should fire-and-forget on writeTo (not return a promise)', () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)
    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase } = makeMockSupabase({ error: null })
    const result = collector.writeTo(mockSupabase)
    expect(result).toBeUndefined()
  })

  it('should log error on write failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const collector = new ChatTelemetryCollector(BASE_INIT)
    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase } = makeMockSupabase({ error: { message: 'connection refused' } })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    expect(consoleSpy).toHaveBeenCalledWith(
      '[telemetry] Write failed',
      expect.objectContaining({ requestId: 'req-abc-123' })
    )

    consoleSpy.mockRestore()
  })

  it('should not log on write success', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const collector = new ChatTelemetryCollector(BASE_INIT)
    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    expect(consoleSpy).not.toHaveBeenCalled()

    consoleSpy.mockRestore()
  })

  it('should handle null streamStartTime gracefully', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)
    // No markStreamStart call

    collector.markFirstToken()
    collector.markFirstSentence()
    collector.markFirstAudio()
    collector.markComplete({ tokenCount: 0, sentenceCount: 0, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.ttft_ms).toBeUndefined()
    expect(row.ttfs_ms).toBeUndefined()
    expect(row.ttfa_ms).toBeUndefined()
    expect(row.stream_start_time).toBeUndefined()
  })

  it('should update tts_mode with effective mode on markComplete', async () => {
    const collector = new ChatTelemetryCollector({
      ...BASE_INIT,
      ttsMode: 'word-level',  // original config mode
    })
    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })  // effective mode

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.tts_mode).toBe('sentence-batch')
  })

  it('should set message_id via setMessageId', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)
    collector.setMessageId('msg-uuid-999')
    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.message_id).toBe('msg-uuid-999')
  })

  it('should default message_id to null', async () => {
    const collector = new ChatTelemetryCollector(BASE_INIT)
    collector.markComplete({ tokenCount: 1, sentenceCount: 1, ttsMode: 'sentence-batch' })

    const { mockSupabase, mockInsert } = makeMockSupabase({ error: null })
    collector.writeTo(mockSupabase)
    await vi.runAllTimersAsync()

    const row = mockInsert.mock.calls[0][0]
    expect(row.message_id).toBeNull()
  })
})

describe('classifyTelemetryError', () => {
  it('should classify timeout errors as LLM_TIMEOUT (status 408)', () => {
    const err = Object.assign(new Error('Request failed'), { status: 408 })
    expect(classifyTelemetryError(err)).toBe('LLM_TIMEOUT')
  })

  it('should classify timeout message as LLM_TIMEOUT', () => {
    const err = new Error('Request timeout')
    expect(classifyTelemetryError(err)).toBe('LLM_TIMEOUT')
  })

  it('should classify rate limit as LLM_RATE_LIMIT (status 429)', () => {
    const err = Object.assign(new Error('Too many requests'), { status: 429 })
    expect(classifyTelemetryError(err)).toBe('LLM_RATE_LIMIT')
  })

  it('should classify rate limit message as LLM_RATE_LIMIT', () => {
    const err = new Error('rate limit exceeded')
    expect(classifyTelemetryError(err)).toBe('LLM_RATE_LIMIT')
  })

  it('should classify 503 as LLM_PROVIDER_ERROR', () => {
    const err = Object.assign(new Error('Service unavailable'), { status: 503 })
    expect(classifyTelemetryError(err)).toBe('LLM_PROVIDER_ERROR')
  })

  it('should classify 500 as LLM_PROVIDER_ERROR', () => {
    const err = Object.assign(new Error('Internal server error'), { status: 500 })
    expect(classifyTelemetryError(err)).toBe('LLM_PROVIDER_ERROR')
  })

  it('should classify TTS errors as TTS_PROVIDER_ERROR', () => {
    const err = new Error('TTS synthesis failed')
    expect(classifyTelemetryError(err)).toBe('TTS_PROVIDER_ERROR')
  })

  it('should classify synthesize errors as TTS_PROVIDER_ERROR', () => {
    const err = new Error('Failed to synthesize audio')
    expect(classifyTelemetryError(err)).toBe('TTS_PROVIDER_ERROR')
  })

  it('should classify abort as STREAM_INTERRUPTED', () => {
    const err = new Error('Request aborted')
    expect(classifyTelemetryError(err)).toBe('STREAM_INTERRUPTED')
  })

  it('should classify unknown errors as UNKNOWN_ERROR', () => {
    const err = new Error('Something unexpected happened')
    expect(classifyTelemetryError(err)).toBe('UNKNOWN_ERROR')
  })
})
