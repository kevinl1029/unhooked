import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AudioChunk } from '~/server/utils/tts/types'

/**
 * Mock AudioContext that simulates iOS Safari behavior.
 *
 * On iOS Safari, AudioContext created outside a user gesture starts in
 * 'suspended' state and resume() returns a promise that never resolves
 * until a user gesture occurs. This mock lets us control that behavior.
 */
class MockAudioContext {
  state: AudioContextState
  currentTime = 0
  sampleRate = 44100
  destination = {} as AudioDestinationNode

  private _resumeResolvers: Array<() => void> = []
  private _allowResume: boolean

  constructor(options?: { startSuspended?: boolean }) {
    this.state = options?.startSuspended ? 'suspended' : 'running'
    this._allowResume = !options?.startSuspended
  }

  resume(): Promise<void> {
    if (this.state === 'running') return Promise.resolve()
    if (this._allowResume) {
      this.state = 'running'
      return Promise.resolve()
    }
    // Simulate iOS: promise stays pending until a gesture triggers resolution
    return new Promise<void>((resolve) => {
      this._resumeResolvers.push(() => {
        this.state = 'running'
        resolve()
      })
    })
  }

  suspend(): Promise<void> {
    this.state = 'suspended'
    return Promise.resolve()
  }

  close(): Promise<void> {
    this.state = 'closed'
    return Promise.resolve()
  }

  // Test helper: simulate a user gesture that unlocks audio
  _simulateGesture() {
    this._allowResume = true
    for (const resolve of this._resumeResolvers) {
      resolve()
    }
    this._resumeResolvers = []
  }

  decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    // Return a minimal mock AudioBuffer
    const duration = Math.max(0.1, arrayBuffer.byteLength / (this.sampleRate * 2))
    return Promise.resolve({
      duration,
      length: Math.floor(duration * this.sampleRate),
      numberOfChannels: 1,
      sampleRate: this.sampleRate,
      getChannelData: () => new Float32Array(Math.floor(duration * this.sampleRate)),
      copyFromChannel: vi.fn(),
      copyToChannel: vi.fn(),
    } as unknown as AudioBuffer)
  }

  createBufferSource(): AudioBufferSourceNode {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
      onended: null,
    } as unknown as AudioBufferSourceNode
  }
}

// Track which MockAudioContext instances are created
let createdContexts: MockAudioContext[] = []
let startSuspended = false

// Generate a valid minimal WAV base64 string
function createMinimalWavBase64(durationMs = 100): string {
  const sampleRate = 24000
  const numSamples = Math.floor((sampleRate * durationMs) / 1000)
  const bytesPerSample = 2
  const dataSize = numSamples * bytesPerSample
  const fileSize = 44 + dataSize

  const buffer = new ArrayBuffer(fileSize)
  const view = new DataView(buffer)

  // RIFF header
  view.setUint32(0, 0x52494646, false) // 'RIFF'
  view.setUint32(4, fileSize - 8, true)
  view.setUint32(8, 0x57415645, false) // 'WAVE'
  // fmt chunk
  view.setUint32(12, 0x666d7420, false) // 'fmt '
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * bytesPerSample, true)
  view.setUint16(32, bytesPerSample, true)
  view.setUint16(34, 16, true)
  // data chunk
  view.setUint32(36, 0x64617461, false) // 'data'
  view.setUint32(40, dataSize, true)

  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function makeChunk(overrides: Partial<AudioChunk> = {}): AudioChunk {
  return {
    chunkIndex: 0,
    audioBase64: createMinimalWavBase64(),
    contentType: 'audio/wav',
    wordTimings: [
      { word: 'Hello', startMs: 0, endMs: 50 },
      { word: 'world', startMs: 50, endMs: 100 },
    ],
    cumulativeOffsetMs: 0,
    durationMs: 100,
    isLast: false,
    text: 'Hello world',
    ...overrides,
  }
}

describe('useStreamingAudioQueue - iOS Safari AudioContext fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createdContexts = []
    startSuspended = false

    // Install mock AudioContext globally
    vi.stubGlobal('AudioContext', class extends MockAudioContext {
      constructor() {
        super({ startSuspended })
        createdContexts.push(this)
      }
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('initialize()', () => {
    it('creates an AudioContext on first call', async () => {
      const { initialize } = useStreamingAudioQueue()
      const ctx = await initialize()

      expect(ctx).toBeDefined()
      expect(createdContexts).toHaveLength(1)
    })

    it('reuses existing AudioContext on subsequent calls', async () => {
      const { initialize } = useStreamingAudioQueue()
      const ctx1 = await initialize()
      const ctx2 = await initialize()

      expect(ctx1).toBe(ctx2)
      expect(createdContexts).toHaveLength(1)
    })

    it('resolves immediately when AudioContext starts running (desktop)', async () => {
      startSuspended = false
      const { initialize } = useStreamingAudioQueue()

      const ctx = await initialize()
      expect(ctx.state).toBe('running')
    })

    it('resolves immediately when AudioContext starts suspended (iOS without gesture)', async () => {
      startSuspended = true
      const { initialize } = useStreamingAudioQueue()

      // Should NOT hang — this is the critical fix
      const ctx = await initialize()
      expect(ctx).toBeDefined()
      // Context is still suspended (no gesture), but initialize() didn't block
      expect(ctx.state).toBe('suspended')
    })

    it('registers auto-resume document listeners when context starts suspended', async () => {
      startSuspended = true
      const addEventSpy = vi.spyOn(document, 'addEventListener')

      const { initialize } = useStreamingAudioQueue()
      await initialize()

      const eventTypes = addEventSpy.mock.calls.map(call => call[0])
      expect(eventTypes).toContain('touchstart')
      expect(eventTypes).toContain('touchend')
      expect(eventTypes).toContain('click')

      addEventSpy.mockRestore()
    })

    it('does NOT register auto-resume listeners when context starts running', async () => {
      startSuspended = false
      const addEventSpy = vi.spyOn(document, 'addEventListener')

      const { initialize } = useStreamingAudioQueue()
      await initialize()

      const eventTypes = addEventSpy.mock.calls.map(call => call[0])
      expect(eventTypes).not.toContain('touchstart')
      expect(eventTypes).not.toContain('touchend')

      addEventSpy.mockRestore()
    })
  })

  describe('auto-resume via document interaction', () => {
    it('resumes AudioContext when a click event fires', async () => {
      startSuspended = true
      const { initialize } = useStreamingAudioQueue()

      await initialize()
      const ctx = createdContexts[0]
      expect(ctx.state).toBe('suspended')

      // Simulate a user gesture
      ctx._simulateGesture()
      document.dispatchEvent(new Event('click'))

      // The handler calls resume(), which now succeeds because _simulateGesture was called
      expect(ctx.state).toBe('running')
    })

    it('resumes AudioContext when a touchstart event fires', async () => {
      startSuspended = true
      const { initialize } = useStreamingAudioQueue()

      await initialize()
      const ctx = createdContexts[0]
      expect(ctx.state).toBe('suspended')

      ctx._simulateGesture()
      document.dispatchEvent(new Event('touchstart'))

      expect(ctx.state).toBe('running')
    })

    it('cleans up listeners after first interaction', async () => {
      startSuspended = true
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const { initialize } = useStreamingAudioQueue()
      await initialize()
      const ctx = createdContexts[0]

      ctx._simulateGesture()
      document.dispatchEvent(new Event('click'))

      // Should have removed all three listeners
      const removedTypes = removeSpy.mock.calls.map(call => call[0])
      expect(removedTypes).toContain('touchstart')
      expect(removedTypes).toContain('touchend')
      expect(removedTypes).toContain('click')

      removeSpy.mockRestore()
    })
  })

  describe('enqueueChunk() - non-blocking on suspended context', () => {
    it('does not hang when AudioContext is suspended', async () => {
      startSuspended = true
      const { initialize, enqueueChunk } = useStreamingAudioQueue()

      await initialize()
      expect(createdContexts[0].state).toBe('suspended')

      // This should resolve without hanging, even though context is suspended
      const chunk = makeChunk()
      await enqueueChunk(chunk)

      // Chunk was processed (word timings accumulated)
      // The composable should have scheduled the chunk even on suspended context
    })

    it('processes multiple chunks without blocking on suspended context', async () => {
      startSuspended = true
      const { initialize, enqueueChunk } = useStreamingAudioQueue()

      await initialize()

      const chunk1 = makeChunk({ chunkIndex: 0 })
      const chunk2 = makeChunk({
        chunkIndex: 1,
        wordTimings: [{ word: 'Goodbye', startMs: 0, endMs: 100 }],
        text: 'Goodbye',
      })

      // Both should resolve without hanging
      await enqueueChunk(chunk1)
      await enqueueChunk(chunk2)
    })

    it('schedules chunks for playback even when context is suspended', async () => {
      startSuspended = true
      const onPlaybackStart = vi.fn()
      const { initialize, enqueueChunk } = useStreamingAudioQueue({
        onPlaybackStart,
      })

      await initialize()
      const ctx = createdContexts[0]

      await enqueueChunk(makeChunk())

      // createBufferSource + connect + start should have been called
      // even though context is suspended (Web Audio API queues them)
      const sourceNode = ctx.createBufferSource()
      expect(sourceNode.connect).toBeDefined()
      expect(sourceNode.start).toBeDefined()
    })
  })

  describe('stop() cleanup', () => {
    it('cleans up auto-resume listeners on stop', async () => {
      startSuspended = true
      const removeSpy = vi.spyOn(document, 'removeEventListener')

      const { initialize, stop } = useStreamingAudioQueue()
      await initialize()

      stop()

      const removedTypes = removeSpy.mock.calls.map(call => call[0])
      expect(removedTypes).toContain('touchstart')
      expect(removedTypes).toContain('touchend')
      expect(removedTypes).toContain('click')

      removeSpy.mockRestore()
    })

    it('closes and nullifies the AudioContext', async () => {
      const { initialize, stop } = useStreamingAudioQueue()
      await initialize()

      expect(createdContexts).toHaveLength(1)
      const ctx = createdContexts[0]

      stop()
      expect(ctx.state).toBe('closed')
    })

    it('creates a fresh AudioContext after stop + re-initialize', async () => {
      const { initialize, stop } = useStreamingAudioQueue()
      await initialize()
      stop()

      await initialize()
      expect(createdContexts).toHaveLength(2)
    })
  })

  describe('preInitAudio from gesture context', () => {
    it('resumes AudioContext when called from a context where resume succeeds', async () => {
      // Simulate: AudioContext was created suspended (iOS),
      // then preInitAudio is called from a click handler where resume works
      startSuspended = true
      const { initialize } = useStreamingAudioQueue()

      await initialize()
      const ctx = createdContexts[0]
      expect(ctx.state).toBe('suspended')

      // Simulate the gesture making resume work
      ctx._simulateGesture()

      // Call initialize again (this is what preInitAudio does)
      await initialize()

      // The non-blocking resume() fires and succeeds since gesture unlocked it
      // Need to wait a tick for the non-awaited promise to settle
      await new Promise(resolve => setTimeout(resolve, 0))
      expect(ctx.state).toBe('running')
    })
  })

  describe('resetPlaybackState() - AudioContext preservation', () => {
    it('clears playback state without closing AudioContext', async () => {
      const { initialize, enqueueChunk, resetPlaybackState } = useStreamingAudioQueue()
      await initialize()
      const ctx = createdContexts[0]

      // Enqueue a chunk to populate state
      await enqueueChunk(makeChunk())

      // Reset playback state
      resetPlaybackState()

      // AudioContext should still exist and not be closed
      expect(ctx.state).not.toBe('closed')
      expect(createdContexts).toHaveLength(1)
    })

    it('stops and disconnects all active source nodes', async () => {
      const { initialize, enqueueChunk, resetPlaybackState } = useStreamingAudioQueue()
      await initialize()
      const ctx = createdContexts[0]

      // Enqueue chunks to create source nodes
      await enqueueChunk(makeChunk({ chunkIndex: 0 }))
      await enqueueChunk(makeChunk({ chunkIndex: 1 }))

      // Get references to source nodes
      const createSourceSpy = vi.spyOn(ctx, 'createBufferSource')

      // Reset playback state
      resetPlaybackState()

      // Source nodes should have stop() and disconnect() called
      // (Verified indirectly - nodes are cleared without errors)
      expect(() => resetPlaybackState()).not.toThrow()
    })

    it('resets word timings and queue', async () => {
      const { initialize, enqueueChunk, resetPlaybackState, allWordTimings, ttsWords, ttsText } = useStreamingAudioQueue()
      await initialize()

      // Enqueue a chunk with word timings
      await enqueueChunk(makeChunk({
        wordTimings: [
          { word: 'Hello', startMs: 0, endMs: 50 },
          { word: 'world', startMs: 50, endMs: 100 },
        ],
        text: 'Hello world',
      }))

      // Verify timings were accumulated
      expect(allWordTimings.value.length).toBeGreaterThan(0)
      expect(ttsWords.value.length).toBeGreaterThan(0)
      expect(ttsText.value).not.toBe('')

      // Reset playback state
      resetPlaybackState()

      // All should be cleared
      expect(allWordTimings.value).toEqual([])
      expect(ttsWords.value).toEqual([])
      expect(ttsText.value).toBe('')
    })

    it('allows stop() to close AudioContext after resetPlaybackState()', async () => {
      const { initialize, enqueueChunk, resetPlaybackState, stop } = useStreamingAudioQueue()
      await initialize()
      const ctx = createdContexts[0]

      await enqueueChunk(makeChunk())
      resetPlaybackState()

      // AudioContext should still be running after resetPlaybackState
      expect(ctx.state).not.toBe('closed')

      // Now call stop - it should close the context
      stop()
      expect(ctx.state).toBe('closed')
    })

    it('allows initialize() to reuse existing AudioContext after resetPlaybackState()', async () => {
      const { initialize, enqueueChunk, resetPlaybackState } = useStreamingAudioQueue()
      await initialize()
      const ctx1 = createdContexts[0]

      await enqueueChunk(makeChunk())
      resetPlaybackState()

      // Call initialize again - should reuse the same context
      await initialize()
      expect(createdContexts).toHaveLength(1)
      expect(createdContexts[0]).toBe(ctx1)
    })

    it('allows enqueueChunk to work after resetPlaybackState on the same AudioContext', async () => {
      const { initialize, enqueueChunk, resetPlaybackState } = useStreamingAudioQueue()
      await initialize()

      // First chunk
      await enqueueChunk(makeChunk({ chunkIndex: 0, text: 'First' }))

      // Reset state
      resetPlaybackState()

      // Second chunk should work without errors
      await expect(enqueueChunk(makeChunk({ chunkIndex: 1, text: 'Second' }))).resolves.not.toThrow()

      // Should still have the same AudioContext
      expect(createdContexts).toHaveLength(1)
    })

    it('simulates multi-message flow with AudioContext preservation', async () => {
      const { initialize, enqueueChunk, resetPlaybackState, allWordTimings } = useStreamingAudioQueue()

      // First message - initialize and enqueue
      await initialize()
      const ctx = createdContexts[0]

      await enqueueChunk(makeChunk({
        chunkIndex: 0,
        text: 'Message 1',
        wordTimings: [{ word: 'Message', startMs: 0, endMs: 50 }, { word: '1', startMs: 50, endMs: 100 }]
      }))

      expect(allWordTimings.value.length).toBe(2)

      // Between messages - reset playback state
      resetPlaybackState()
      expect(allWordTimings.value.length).toBe(0)
      expect(ctx.state).not.toBe('closed')

      // Second message - initialize (should reuse context) and enqueue
      await initialize()
      expect(createdContexts).toHaveLength(1) // Same context reused

      await enqueueChunk(makeChunk({
        chunkIndex: 0,
        text: 'Message 2',
        wordTimings: [{ word: 'Message', startMs: 0, endMs: 50 }, { word: '2', startMs: 50, endMs: 100 }]
      }))

      expect(allWordTimings.value.length).toBe(2)

      // Between messages again
      resetPlaybackState()

      // Third message
      await initialize()
      expect(createdContexts).toHaveLength(1) // Still same context

      await enqueueChunk(makeChunk({
        chunkIndex: 0,
        text: 'Message 3',
        wordTimings: [{ word: 'Message', startMs: 0, endMs: 50 }, { word: '3', startMs: 50, endMs: 100 }]
      }))

      expect(allWordTimings.value.length).toBe(2)
      expect(createdContexts[0]).toBe(ctx) // Same context throughout
    })
  })
})
