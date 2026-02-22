import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'
import { useVoiceSession } from '~/composables/useVoiceSession'
import type { WordTiming } from '~/server/utils/tts/types'

// ─── Mock composable dependencies ────────────────────────────────────────────

vi.mock('~/composables/useAudioRecorder', () => ({
  useAudioRecorder: () => ({
    isRecording: ref(false),
    isPaused: ref(false),
    error: ref(null),
    permissionState: ref(null),
    isSupported: ref(false),
    start: vi.fn().mockResolvedValue(false),
    stop: vi.fn().mockResolvedValue(null),
    cleanup: vi.fn(),
    getAudioLevel: vi.fn(() => 0),
    checkPermission: vi.fn(),
    requestPermission: vi.fn(),
  }),
}))

vi.mock('~/composables/useStreamingTTS', () => ({
  useStreamingTTS: () => ({
    isPlaying: ref(false),
    isWaitingForChunks: ref(false),
    currentWordIndex: ref(-1),
    allWordTimings: ref([]),
    ttsWords: ref([]),
    conversationId: ref(null),
    lastStreamStats: ref({
      tokenCount: 0,
      tokenChars: 0,
      audioChunkCount: 0,
      sawDone: false,
      sawErrorEvent: false,
      errorStatus: null,
      errorStatusText: null,
      requestId: null,
    }),
    processStream: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    reset: vi.fn(),
    preInitAudio: vi.fn().mockResolvedValue(undefined),
  }),
}))

// ─── Mock HTMLAudioElement ────────────────────────────────────────────────────

interface MockAudioInstance {
  src: string
  duration: number
  currentTime: number
  onloadedmetadata: ((e: Event) => void) | null
  onplay: ((e: Event) => void) | null
  onended: ((e: Event) => void) | null
  onerror: ((e: Event) => void) | null
  play: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
}

let audioInstances: MockAudioInstance[]
let MockAudio: ReturnType<typeof vi.fn>

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useVoiceSession - playFromUrl', () => {
  const sampleTimings: WordTiming[] = [
    { word: 'Hello', startMs: 0, endMs: 500 },
    { word: 'World', startMs: 600, endMs: 1000 },
  ]

  beforeEach(() => {
    vi.useFakeTimers()
    audioInstances = []

    MockAudio = vi.fn().mockImplementation((src: string): MockAudioInstance => {
      const instance: MockAudioInstance = {
        src,
        duration: 5,
        currentTime: 0,
        onloadedmetadata: null,
        onplay: null,
        onended: null,
        onerror: null,
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
      }
      audioInstances.push(instance)
      return instance
    })

    vi.stubGlobal('Audio', MockAudio)
    vi.stubGlobal('onUnmounted', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  const getLastAudio = () => audioInstances[audioInstances.length - 1]

  it('resolves true and sets isAISpeaking when audio starts playing', async () => {
    const { playFromUrl, isAISpeaking } = useVoiceSession()

    const promise = playFromUrl(
      'https://cdn.example.com/audio.wav',
      'Hello World',
      sampleTimings,
      'actual'
    )

    const audio = getLastAudio()
    audio.onplay?.(new Event('play'))

    const result = await promise

    expect(result).toBe(true)
    expect(isAISpeaking.value).toBe(true)
  })

  it('sets currentTranscript to the provided text', async () => {
    const { playFromUrl, currentTranscript } = useVoiceSession()

    const promise = playFromUrl(
      'https://cdn.example.com/audio.wav',
      'My test text',
      sampleTimings,
      'actual'
    )

    const audio = getLastAudio()
    audio.onplay?.(new Event('play'))
    await promise

    expect(currentTranscript.value).toBe('My test text')
  })

  it('scales estimated word timings to match actual audio duration', async () => {
    const { playFromUrl, effectiveWordTimings } = useVoiceSession()

    // Estimated timings total 5000ms (last endMs), actual audio is 10s → scale factor = 2
    const estimatedTimings: WordTiming[] = [
      { word: 'Hello', startMs: 0, endMs: 2500 },
      { word: 'World', startMs: 2500, endMs: 5000 },
    ]

    const promise = playFromUrl(
      'https://cdn.example.com/audio.wav',
      'Hello World',
      estimatedTimings,
      'estimated'
    )

    const audio = getLastAudio()
    audio.duration = 10 // 10s actual vs 5s estimated → scale factor 2
    audio.onloadedmetadata?.(new Event('loadedmetadata'))
    audio.onplay?.(new Event('play'))
    await promise

    const timings = effectiveWordTimings.value
    expect(timings[0].startMs).toBe(0)
    expect(timings[0].endMs).toBe(5000) // 2500 * 2
    expect(timings[1].startMs).toBe(5000) // 2500 * 2
    expect(timings[1].endMs).toBe(10000) // 5000 * 2
  })

  it('does not scale actual word timings', async () => {
    const { playFromUrl, effectiveWordTimings } = useVoiceSession()

    const actualTimings: WordTiming[] = [
      { word: 'Hello', startMs: 0, endMs: 250 },
      { word: 'World', startMs: 300, endMs: 500 },
    ]

    const promise = playFromUrl(
      'https://cdn.example.com/audio.wav',
      'Hello World',
      actualTimings,
      'actual'
    )

    const audio = getLastAudio()
    audio.duration = 10 // Different from estimated total — must NOT trigger scaling
    audio.onloadedmetadata?.(new Event('loadedmetadata'))
    audio.onplay?.(new Event('play'))
    await promise

    const timings = effectiveWordTimings.value
    expect(timings[0].startMs).toBe(0)
    expect(timings[0].endMs).toBe(250)
    expect(timings[1].startMs).toBe(300)
    expect(timings[1].endMs).toBe(500)
  })

  it('resolves false and keeps isAISpeaking false on audio error', async () => {
    const { playFromUrl, isAISpeaking } = useVoiceSession()

    const promise = playFromUrl(
      'https://cdn.example.com/audio.wav',
      'Hello World',
      sampleTimings,
      'actual'
    )

    const audio = getLastAudio()
    audio.onerror?.(new Event('error'))

    const result = await promise

    expect(result).toBe(false)
    expect(isAISpeaking.value).toBe(false)
  })

  it('resolves false when play() rejects', async () => {
    // Override next Audio instance to have a rejecting play()
    MockAudio.mockImplementationOnce((src: string): MockAudioInstance => {
      const instance: MockAudioInstance = {
        src,
        duration: 5,
        currentTime: 0,
        onloadedmetadata: null,
        onplay: null,
        onended: null,
        onerror: null,
        play: vi.fn().mockRejectedValue(new Error('NotAllowedError')),
        pause: vi.fn(),
      }
      audioInstances.push(instance)
      return instance
    })

    const { playFromUrl } = useVoiceSession()
    const result = await playFromUrl(
      'https://cdn.example.com/audio.wav',
      'Hello World',
      sampleTimings,
      'actual'
    )

    expect(result).toBe(false)
  })

  it('pauses previous audio element when called again', async () => {
    const { playFromUrl } = useVoiceSession()

    // First call — play it to completion
    const promise1 = playFromUrl(
      'https://cdn.example.com/audio1.wav',
      'First message',
      sampleTimings,
      'actual'
    )
    const audio1 = getLastAudio()
    audio1.onplay?.(new Event('play'))
    await promise1

    // Second call — cleanup of audio1 should happen before new audio is created
    const promise2 = playFromUrl(
      'https://cdn.example.com/audio2.wav',
      'Second message',
      sampleTimings,
      'actual'
    )

    expect(audio1.pause).toHaveBeenCalled()

    const audio2 = getLastAudio()
    audio2.onplay?.(new Event('play'))
    await promise2
  })
})
