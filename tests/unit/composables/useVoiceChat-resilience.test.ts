import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { useVoiceChat } from '~/composables/useVoiceChat'

type StreamOutcome = {
  success: boolean
  sessionComplete?: boolean
  conversationId?: string | null
  sawDone: boolean
  sawErrorEvent: boolean
  errorStatus: number | null
  requestId?: string | null
  assistantContent: string
}

const makeReader = () => ({}) as ReadableStreamDefaultReader<Uint8Array>
const mockedUseVoiceSession = vi.fn()

vi.mock('~/composables/useVoiceSession', () => ({
  useVoiceSession: () => mockedUseVoiceSession(),
}))

const getRequestBodies = (fetchMock: ReturnType<typeof vi.fn>) => {
  return fetchMock.mock.calls.map(([, init]) => {
    const body = (init as RequestInit | undefined)?.body as string | undefined
    return body ? JSON.parse(body) : null
  })
}

describe('useVoiceChat resilience', () => {
  const fetchMock = vi.fn()
  const playStreamingResponse = vi.fn()

  let streamOutcomes: StreamOutcome[] = []
  let transcriptRef = ref('')

  beforeEach(() => {
    vi.clearAllMocks()
    streamOutcomes = []
    transcriptRef = ref('')

    vi.stubGlobal('onUnmounted', vi.fn())

    vi.stubGlobal('useRuntimeConfig', () => ({
      public: {
        chatResilienceEnabled: 'true',
        chatPrimaryProvider: 'groq',
        chatSecondaryProvider: 'gemini',
        chatRetryBackoffMinMs: 1,
        chatRetryBackoffMaxMs: 1,
      },
    }))

    playStreamingResponse.mockImplementation(async () => {
      const outcome = streamOutcomes.shift()
      if (!outcome) {
        throw new Error('Missing stream outcome for test')
      }

      transcriptRef.value = outcome.assistantContent

      return {
        success: outcome.success,
        sessionComplete: outcome.sessionComplete || false,
        conversationId: outcome.conversationId || 'conv-test',
        sawDone: outcome.sawDone,
        sawErrorEvent: outcome.sawErrorEvent,
        errorStatus: outcome.errorStatus,
        requestId: outcome.requestId || 'req-test',
        assistantContentLength: outcome.assistantContent.trim().length,
      }
    })

    mockedUseVoiceSession.mockReturnValue({
      isProcessing: ref(false),
      isAISpeaking: ref(false),
      isPaused: ref(false),
      isRecording: ref(false),
      isTranscribing: ref(false),
      isAudioReady: ref(false),
      currentWordIndex: ref(-1),
      currentTranscript: transcriptRef,
      getCurrentWord: computed(() => null),
      getWords: computed(() => transcriptRef.value.split(/\s+/).filter(Boolean)),
      getTranscriptText: computed(() => transcriptRef.value),
      error: ref(null),
      permissionState: ref('granted'),
      isSupported: ref(true),
      isStreamingMode: ref(false),
      isTextStreaming: ref(false),
      isWaitingForChunks: ref(false),
      playStreamingResponse,
      playAIResponse: vi.fn().mockResolvedValue(true),
      pauseAudio: vi.fn(),
      resumeAudio: vi.fn(),
      stopAudio: vi.fn(),
      getAudioLevel: vi.fn(() => 0),
      checkPermission: vi.fn().mockResolvedValue('granted'),
      requestPermission: vi.fn().mockResolvedValue(true),
      preInitAudio: vi.fn().mockResolvedValue(undefined),
      recordUserResponse: vi.fn().mockResolvedValue(true),
      stopUserRecording: vi.fn().mockResolvedValue('transcript'),
      cleanup: vi.fn(),
    })

    fetchMock.mockResolvedValue({
      ok: true,
      body: { getReader: makeReader },
    })
    vi.stubGlobal('fetch', fetchMock)
  })

  it('retries once on primary after transient failure, then succeeds', async () => {
    streamOutcomes.push(
      {
        success: false,
        sawDone: false,
        sawErrorEvent: true,
        errorStatus: 503,
        assistantContent: '',
      },
      {
        success: true,
        sawDone: true,
        sawErrorEvent: false,
        errorStatus: null,
        assistantContent: 'Recovered response',
      }
    )

    const chat = useVoiceChat({ sessionType: 'core', enableStreamingTTS: true })
    const success = await chat.sendMessage('hello', 'text', true)

    expect(success).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(chat.messages.value).toEqual([
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'Recovered response' },
    ])
    expect(chat.hasFailedTurn.value).toBe(false)

    const requestBodies = getRequestBodies(fetchMock)
    expect(requestBodies[0].model).toBeTruthy()
    expect(requestBodies[1].model).toBe(requestBodies[0].model)
    expect(requestBodies.map(body => body.resilienceAttempt)).toEqual([1, 2])
    expect(requestBodies.map(body => body.resilienceRoute)).toEqual(['primary', 'primary'])
  })

  it('fails over to secondary on third attempt after two transient primary failures', async () => {
    streamOutcomes.push(
      {
        success: false,
        sawDone: false,
        sawErrorEvent: true,
        errorStatus: 503,
        assistantContent: '',
      },
      {
        success: false,
        sawDone: false,
        sawErrorEvent: true,
        errorStatus: 503,
        assistantContent: '',
      },
      {
        success: true,
        sawDone: true,
        sawErrorEvent: false,
        errorStatus: null,
        assistantContent: 'Failover response',
      }
    )

    const chat = useVoiceChat({ sessionType: 'core', enableStreamingTTS: true })
    const success = await chat.sendMessage('need help', 'voice', true)

    expect(success).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(chat.messages.value).toEqual([
      { role: 'user', content: 'need help' },
      { role: 'assistant', content: 'Failover response' },
    ])

    const requestBodies = getRequestBodies(fetchMock)
    expect(requestBodies[0].model).toBeTruthy()
    expect(requestBodies[1].model).toBe(requestBodies[0].model)
    expect(requestBodies[2].model).toBeTruthy()
    expect(requestBodies[2].model).not.toBe(requestBodies[0].model)
    expect(requestBodies.map(body => body.resilienceAttempt)).toEqual([1, 2, 3])
    expect(requestBodies.map(body => body.resilienceRoute)).toEqual(['primary', 'primary', 'secondary'])
  })

  it('enters actionable failure state after all three attempts fail and replays same logical turn on retry', async () => {
    streamOutcomes.push(
      {
        success: false,
        sawDone: false,
        sawErrorEvent: true,
        errorStatus: 503,
        assistantContent: '',
      },
      {
        success: false,
        sawDone: false,
        sawErrorEvent: true,
        errorStatus: 503,
        assistantContent: '',
      },
      {
        success: false,
        sawDone: false,
        sawErrorEvent: true,
        errorStatus: 503,
        assistantContent: '',
      }
    )

    const chat = useVoiceChat({ sessionType: 'core', enableStreamingTTS: true })
    const firstResult = await chat.sendMessage('stuck turn', 'text', true)

    expect(firstResult).toBe(false)
    expect(chat.hasFailedTurn.value).toBe(true)
    expect(chat.failedTurnMessage.value).toContain('Tap Retry')
    expect(chat.messages.value).toEqual([{ role: 'user', content: 'stuck turn' }])

    streamOutcomes.push({
      success: true,
      sawDone: true,
      sawErrorEvent: false,
      errorStatus: null,
      assistantContent: 'Recovered after manual retry',
    })

    const retryResult = await chat.retryFailedTurn()

    expect(retryResult).toBe(true)
    expect(chat.hasFailedTurn.value).toBe(false)
    expect(chat.messages.value).toEqual([
      { role: 'user', content: 'stuck turn' },
      { role: 'assistant', content: 'Recovered after manual retry' },
    ])

    const requestBodies = getRequestBodies(fetchMock)
    expect(requestBodies).toHaveLength(4)
    expect(requestBodies[3].messages).toEqual([{ role: 'user', content: 'stuck turn' }])
    expect(requestBodies[3].resilienceAttempt).toBe(1)
  })

  it('clears failed-turn UI when user sends a new message', async () => {
    streamOutcomes.push(
      {
        success: false,
        sawDone: false,
        sawErrorEvent: true,
        errorStatus: 503,
        assistantContent: '',
      },
      {
        success: false,
        sawDone: false,
        sawErrorEvent: true,
        errorStatus: 503,
        assistantContent: '',
      },
      {
        success: false,
        sawDone: false,
        sawErrorEvent: true,
        errorStatus: 503,
        assistantContent: '',
      },
      {
        success: true,
        sawDone: true,
        sawErrorEvent: false,
        errorStatus: null,
        assistantContent: 'Response to new turn',
      }
    )

    const chat = useVoiceChat({ sessionType: 'core', enableStreamingTTS: true })

    const firstResult = await chat.sendMessage('old turn', 'text', true)
    expect(firstResult).toBe(false)
    expect(chat.hasFailedTurn.value).toBe(true)

    const secondResult = await chat.sendMessage('new turn', 'text', true)

    expect(secondResult).toBe(true)
    expect(chat.hasFailedTurn.value).toBe(false)
    expect(chat.failedTurnMessage.value).toBeNull()
    expect(chat.messages.value).toEqual([
      { role: 'user', content: 'old turn' },
      { role: 'user', content: 'new turn' },
      { role: 'assistant', content: 'Response to new turn' },
    ])
  })

  it('fails fast without retry for non-transient 400 errors', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      body: null,
    })

    const chat = useVoiceChat({ sessionType: 'core', enableStreamingTTS: true })
    const success = await chat.sendMessage('bad request path', 'text', true)

    expect(success).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(chat.hasFailedTurn.value).toBe(true)
    expect(chat.messages.value).toEqual([{ role: 'user', content: 'bad request path' }])
  })
})
