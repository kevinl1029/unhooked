import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { useVoiceChat } from '~/composables/useVoiceChat'

const makeReader = () => ({}) as ReadableStreamDefaultReader<Uint8Array>

const mockedUseVoiceSession = vi.fn()
vi.mock('~/composables/useVoiceSession', () => ({
  useVoiceSession: () => mockedUseVoiceSession(),
}))

// Sample opening response shapes
const openingWithAudio = {
  text: 'Hello, welcome to your session.',
  source: 'static',
  audioUrl: 'https://example.com/audio.mp3',
  wordTimings: [{ word: 'Hello', startMs: 0, endMs: 500 }],
  contentType: 'audio/mpeg',
  timingSource: 'estimated',
}

const openingWithTextOnly = {
  text: 'Hello, welcome to your session.',
  source: 'precomputed',
  audioUrl: null,
  wordTimings: null,
  contentType: null,
  timingSource: null,
}

const openingEmpty = {
  text: null,
  source: null,
  audioUrl: null,
  wordTimings: null,
  contentType: null,
  timingSource: null,
}

describe('useVoiceChat instant-start (3-tier fast-start)', () => {
  let dollarFetchMock: ReturnType<typeof vi.fn>
  let fetchGlobalMock: ReturnType<typeof vi.fn>
  let playFromUrl: ReturnType<typeof vi.fn>
  let playAIResponse: ReturnType<typeof vi.fn>
  let playStreamingResponse: ReturnType<typeof vi.fn>
  let transcriptRef: ReturnType<typeof ref<string>>

  const setupVoiceSession = () => {
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
      getWords: computed(() => []),
      getTranscriptText: computed(() => transcriptRef.value),
      error: ref(null),
      permissionState: ref('granted'),
      isSupported: ref(true),
      isStreamingMode: ref(false),
      isTextStreaming: ref(false),
      isWaitingForChunks: ref(false),
      playFromUrl,
      playStreamingResponse,
      playAIResponse,
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
  }

  beforeEach(() => {
    vi.clearAllMocks()
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

    playFromUrl = vi.fn().mockResolvedValue(true)
    playAIResponse = vi.fn().mockResolvedValue(true)
    playStreamingResponse = vi.fn().mockImplementation(async () => {
      transcriptRef.value = 'Streaming response text'
      return {
        success: true,
        sessionComplete: false,
        conversationId: 'conv-streaming',
        sawDone: true,
        sawErrorEvent: false,
        errorStatus: null,
        requestId: 'req-streaming',
        assistantContentLength: 'Streaming response text'.length,
      }
    })

    setupVoiceSession()

    dollarFetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/session/opening') return openingWithAudio
      if (url === '/api/session/bootstrap') return { conversationId: 'conv-bootstrap-123' }
      throw new Error(`Unexpected $fetch call: ${url}`)
    })
    vi.stubGlobal('$fetch', dollarFetchMock)

    fetchGlobalMock = vi.fn().mockResolvedValue({
      ok: true,
      body: { getReader: makeReader },
    })
    vi.stubGlobal('fetch', fetchGlobalMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  const makeCoreChat = () =>
    useVoiceChat({
      sessionType: 'core',
      illusionKey: 'stress_relief',
      illusionLayer: 'intellectual',
      enableStreamingTTS: true,
    })

  it('Tier 1: pre-stored audio plays when opening has audioUrl and playFromUrl succeeds', async () => {
    const chat = makeCoreChat()
    const result = await chat.startConversation()

    expect(result).toBe(true)
    expect(playFromUrl).toHaveBeenCalledWith(
      openingWithAudio.audioUrl,
      openingWithAudio.text,
      openingWithAudio.wordTimings,
      openingWithAudio.timingSource,
    )
    expect(playAIResponse).not.toHaveBeenCalled()
    expect(chat.messages.value).toEqual([
      { role: 'assistant', content: openingWithAudio.text },
    ])
  })

  it('Tier 1 → Tier 2: falls back to playAIResponse on download timeout (>3s)', async () => {
    vi.useFakeTimers()

    // playFromUrl hangs forever (simulates slow download)
    playFromUrl.mockReturnValue(new Promise(() => {}))

    const chat = makeCoreChat()
    const conversationPromise = chat.startConversation()

    // Advance fake time past the 3-second download timeout
    await vi.advanceTimersByTimeAsync(3001)

    const result = await conversationPromise

    expect(result).toBe(true)
    expect(playFromUrl).toHaveBeenCalled()
    expect(playAIResponse).toHaveBeenCalledWith(openingWithAudio.text)
  })

  it('Tier 1 → Tier 2: falls back to playAIResponse when playFromUrl returns false', async () => {
    playFromUrl.mockResolvedValue(false)

    const chat = makeCoreChat()
    const result = await chat.startConversation()

    expect(result).toBe(true)
    expect(playFromUrl).toHaveBeenCalled()
    expect(playAIResponse).toHaveBeenCalledWith(openingWithAudio.text)
  })

  it('Tier 2: calls playAIResponse directly when text is available but no audioUrl', async () => {
    dollarFetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/session/opening') return openingWithTextOnly
      if (url === '/api/session/bootstrap') return { conversationId: 'conv-bootstrap-123' }
      throw new Error(`Unexpected $fetch call: ${url}`)
    })

    const chat = makeCoreChat()
    const result = await chat.startConversation()

    expect(result).toBe(true)
    expect(playFromUrl).not.toHaveBeenCalled()
    expect(playAIResponse).toHaveBeenCalledWith(openingWithTextOnly.text)
  })

  it('Tier 2 → Tier 3: falls through to streaming flow when playAIResponse fails', async () => {
    dollarFetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/session/opening') return openingWithTextOnly
      if (url === '/api/session/bootstrap') return { conversationId: 'conv-bootstrap-123' }
      throw new Error(`Unexpected $fetch call: ${url}`)
    })
    playAIResponse.mockResolvedValue(false)

    const chat = makeCoreChat()
    const result = await chat.startConversation()

    expect(result).toBe(true)
    expect(playAIResponse).toHaveBeenCalled()
    // Tier 3 streaming flow was used
    expect(playStreamingResponse).toHaveBeenCalled()
    expect(chat.messages.value).toEqual([
      { role: 'assistant', content: 'Streaming response text' },
    ])
  })

  it('Tier 3: uses streaming flow when opening text is null', async () => {
    dollarFetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/session/opening') return openingEmpty
      throw new Error(`Unexpected $fetch call: ${url}`)
    })

    const chat = makeCoreChat()
    const result = await chat.startConversation()

    expect(result).toBe(true)
    expect(playFromUrl).not.toHaveBeenCalled()
    expect(playAIResponse).not.toHaveBeenCalled()
    expect(playStreamingResponse).toHaveBeenCalled()
  })

  it('uses /api/session/opening as the endpoint (not /api/session/opening-text)', async () => {
    const chat = makeCoreChat()
    await chat.startConversation()

    const openingCalls = dollarFetchMock.mock.calls.filter(([url]) => url === '/api/session/opening')
    expect(openingCalls).toHaveLength(1)

    const oldEndpointCalls = dollarFetchMock.mock.calls.filter(([url]) => url === '/api/session/opening-text')
    expect(oldEndpointCalls).toHaveLength(0)
  })

  it('does not include debugTraceId in opening endpoint query', async () => {
    const chat = makeCoreChat()
    await chat.startConversation()

    const openingCall = dollarFetchMock.mock.calls.find(([url]) => url === '/api/session/opening')
    expect(openingCall).toBeTruthy()
    const options = openingCall?.[1] as { query?: Record<string, unknown> } | undefined
    expect(options?.query).toBeTruthy()
    expect(options?.query?.debugTraceId).toBeUndefined()
  })

  it('calls bootstrap exactly once when Tier 1 succeeds', async () => {
    const chat = makeCoreChat()
    await chat.startConversation()

    const bootstrapCalls = dollarFetchMock.mock.calls.filter(([url]) => url === '/api/session/bootstrap')
    expect(bootstrapCalls).toHaveLength(1)
  })

  it('calls bootstrap exactly once when Tier 2 is used (text only, no audioUrl)', async () => {
    dollarFetchMock.mockImplementation(async (url: string) => {
      if (url === '/api/session/opening') return openingWithTextOnly
      if (url === '/api/session/bootstrap') return { conversationId: 'conv-bootstrap-123' }
      throw new Error(`Unexpected $fetch call: ${url}`)
    })

    const chat = makeCoreChat()
    await chat.startConversation()

    const bootstrapCalls = dollarFetchMock.mock.calls.filter(([url]) => url === '/api/session/bootstrap')
    expect(bootstrapCalls).toHaveLength(1)
  })

  it('non-core session skips fast path entirely and does not call opening endpoint', async () => {
    const chat = useVoiceChat({
      sessionType: 'check_in',
      enableStreamingTTS: true,
    })
    await chat.startConversation()

    const openingCalls = dollarFetchMock.mock.calls.filter(([url]) => url === '/api/session/opening')
    expect(openingCalls).toHaveLength(0)
    expect(playFromUrl).not.toHaveBeenCalled()
  })
})
