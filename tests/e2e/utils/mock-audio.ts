import type { Page } from '@playwright/test'

// ──────────────────────────────────────────────
// WAV Generation
// ──────────────────────────────────────────────

/**
 * Generate a valid WAV file as base64 (24kHz mono, 16-bit PCM silence).
 * Produces audio data that can be decoded by any browser's AudioContext.
 */
export function createValidWav(durationMs: number = 1000): string {
  const sampleRate = 24000
  const numSamples = Math.floor((sampleRate * durationMs) / 1000)
  const bytesPerSample = 2 // 16-bit
  const dataSize = numSamples * bytesPerSample
  const fileSize = 44 + dataSize // WAV header is 44 bytes

  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)

  // RIFF header
  view.setUint32(0, 0x52494646, false) // 'RIFF'
  view.setUint32(4, fileSize - 8, true) // File size - 8
  view.setUint32(8, 0x57415645, false) // 'WAVE'

  // fmt chunk
  view.setUint32(12, 0x666d7420, false) // 'fmt '
  view.setUint32(16, 16, true) // Chunk size
  view.setUint16(20, 1, true) // Audio format (PCM)
  view.setUint16(22, 1, true) // Num channels (mono)
  view.setUint32(24, sampleRate, true) // Sample rate
  view.setUint32(28, sampleRate * bytesPerSample, true) // Byte rate
  view.setUint16(32, bytesPerSample, true) // Block align
  view.setUint16(34, 16, true) // Bits per sample

  // data chunk
  view.setUint32(36, 0x64617461, false) // 'data'
  view.setUint32(40, dataSize, true) // Data size

  // Audio data (silence = zeros, already initialized)

  // Convert to base64
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// ──────────────────────────────────────────────
// SSE Event Helpers
// ──────────────────────────────────────────────

function sseEvent(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

/**
 * Audio chunk descriptor for building streaming SSE with audio.
 */
export interface MockAudioChunk {
  chunkIndex: number
  text: string
  wordTimings: Array<{ word: string; startMs: number; endMs: number }>
  durationMs: number
  cumulativeOffsetMs: number
  isLast: boolean
}

/**
 * Build a complete SSE response body containing token events,
 * audio_chunk events, and a done event.
 */
export function buildStreamingSSEWithAudio(options: {
  tokens: string[]
  audioChunks: MockAudioChunk[]
  conversationId?: string
  sessionComplete?: boolean
}): string {
  const {
    tokens,
    audioChunks,
    conversationId = 'mock-conv-audio',
    sessionComplete = false,
  } = options

  const events: string[] = []

  // Token events (simulate word-by-word LLM output)
  for (const token of tokens) {
    events.push(sseEvent({ type: 'token', token, conversationId }))
  }

  // Audio chunk events (simulate TTS output)
  for (const chunk of audioChunks) {
    const wav = createValidWav(chunk.durationMs)
    events.push(
      sseEvent({
        type: 'audio_chunk',
        chunk: {
          chunkIndex: chunk.chunkIndex,
          audioBase64: wav,
          contentType: 'audio/wav',
          wordTimings: chunk.wordTimings,
          cumulativeOffsetMs: chunk.cumulativeOffsetMs,
          durationMs: chunk.durationMs,
          isLast: chunk.isLast,
          text: chunk.text,
        },
      }),
    )
  }

  // Done event
  events.push(
    sseEvent({
      type: 'done',
      done: true,
      conversationId,
      sessionComplete,
      streamingTTS: true,
    }),
  )

  return events.join('')
}

/**
 * Build a simple audio chunk from text.
 * Automatically calculates word timings from the text.
 */
export function buildSimpleAudioChunk(
  text: string,
  chunkIndex: number = 0,
  cumulativeOffsetMs: number = 0,
  isLast: boolean = true,
): MockAudioChunk {
  const words = text.split(/\s+/)
  const msPerWord = 200
  const durationMs = words.length * msPerWord

  return {
    chunkIndex,
    text,
    wordTimings: words.map((word, i) => ({
      word,
      startMs: i * msPerWord,
      endMs: (i + 1) * msPerWord,
    })),
    durationMs,
    cumulativeOffsetMs,
    isLast,
  }
}

// ──────────────────────────────────────────────
// AudioContext Tracking
// ──────────────────────────────────────────────

/**
 * Shape of the audio lifecycle tracker object injected into the page.
 * Access via: `page.evaluate(() => (window as any).__audioTracker)`
 */
export interface AudioTracker {
  contextsCreated: number
  contextsClosed: number
  chunksScheduled: Array<{ scheduledTime: number; currentTime: number }>
  contextStates: string[]
  resumeCalls: number
}

/**
 * Add init script to intercept and track AudioContext lifecycle events.
 *
 * Tracks:
 * - Number of AudioContext instances created and closed
 * - AudioBufferSourceNode.start() scheduling times
 * - AudioContext.resume() calls (important for iOS Safari gesture recovery)
 */
export async function addAudioContextTracking(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const tracker = {
      contextsCreated: 0,
      contextsClosed: 0,
      chunksScheduled: [] as Array<{ scheduledTime: number; currentTime: number }>,
      contextStates: [] as string[],
      resumeCalls: 0,
    }
    ;(window as any).__audioTracker = tracker

    const OriginalAudioContext = window.AudioContext
    window.AudioContext = class extends OriginalAudioContext {
      constructor(...args: any[]) {
        // @ts-ignore
        super(...args)
        tracker.contextsCreated++
        tracker.contextStates.push(this.state)
        console.log(
          `[AUDIO-TRACK] AudioContext created (#${tracker.contextsCreated}), state: ${this.state}`,
        )
      }

      close() {
        tracker.contextsClosed++
        console.log(`[AUDIO-TRACK] AudioContext closed (#${tracker.contextsClosed})`)
        return super.close()
      }

      resume() {
        tracker.resumeCalls++
        console.log(`[AUDIO-TRACK] AudioContext.resume() called (#${tracker.resumeCalls})`)
        return super.resume()
      }

      createBufferSource() {
        const source = super.createBufferSource()
        const originalStart = source.start.bind(source)
        const ctx = this
        source.start = (when?: number, offset?: number, duration?: number) => {
          const scheduledTime = when !== undefined ? when : ctx.currentTime
          tracker.chunksScheduled.push({
            scheduledTime,
            currentTime: ctx.currentTime,
          })
          console.log(`[AUDIO-TRACK] Buffer scheduled at ${scheduledTime.toFixed(3)}s`)
          return originalStart(when, offset, duration)
        }
        return source
      }
    } as typeof AudioContext
  })
}

// ──────────────────────────────────────────────
// Microphone / Permission Mocks
// ──────────────────────────────────────────────

/**
 * Add init script to mock `navigator.mediaDevices.getUserMedia` and
 * `navigator.permissions.query` for microphone access.
 *
 * Returns a silent MediaStream so voice session pages can initialize
 * without requiring actual hardware microphone access.
 */
export async function addMicrophoneMocks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia = async () => {
        console.log('[MOCK] getUserMedia called')
        const audioContext = new AudioContext()
        const oscillator = audioContext.createOscillator()
        const destination = audioContext.createMediaStreamDestination()
        oscillator.frequency.setValueAtTime(0, audioContext.currentTime)
        oscillator.connect(destination)
        oscillator.start()
        return destination.stream
      }
    }

    if (navigator.permissions) {
      const originalQuery = navigator.permissions.query.bind(navigator.permissions)
      navigator.permissions.query = async (descriptor: PermissionDescriptor) => {
        if (descriptor.name === 'microphone') {
          console.log('[MOCK] Permission query for microphone - returning granted')
          return { state: 'granted', name: 'microphone' } as PermissionStatus
        }
        return originalQuery(descriptor)
      }
    }
  })
}

/**
 * Mock the streaming chat API to return SSE with audio chunks.
 * Convenience wrapper combining route mocking with audio SSE building.
 *
 * Supports a single response or an array of responses for successive calls.
 */
export async function mockChatAPIWithAudio(
  page: Page,
  responses: Array<{
    text: string
    conversationId?: string
    sessionComplete?: boolean
  }>,
): Promise<void> {
  let callIndex = 0

  await page.route('**/api/chat', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue()
      return
    }

    const current = responses[Math.min(callIndex, responses.length - 1)]
    callIndex++

    const tokens = current.text.split(/(?<=\s)/)
    const audioChunk = buildSimpleAudioChunk(current.text)

    const body = buildStreamingSSEWithAudio({
      tokens,
      audioChunks: [audioChunk],
      conversationId: current.conversationId || 'mock-conv-audio',
      sessionComplete: current.sessionComplete || false,
    })

    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: {
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
      body,
    })
  })
}
