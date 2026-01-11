/**
 * Streaming Audio Queue Composable
 *
 * Manages Web Audio API for gapless playback of streaming audio chunks.
 * Queues AudioBufferSourceNodes and schedules them for continuous playback.
 *
 * SIMPLIFIED: Chunks are now guaranteed to arrive in order from the server
 * thanks to the SequentialTTSProcessor. No client-side reordering needed.
 */

import type { AudioChunk, WordTiming } from '~/server/utils/tts/types'

interface QueuedChunk {
  chunk: AudioChunk
  audioBuffer: AudioBuffer
  scheduledTime: number
}

interface StreamingAudioQueueOptions {
  onComplete?: () => void
  onPlaybackStart?: () => void
}

export const useStreamingAudioQueue = (options: StreamingAudioQueueOptions = {}) => {
  // State
  const isPlaying = ref(false)
  const isWaitingForChunks = ref(false)
  const currentChunkIndex = ref(-1)
  const error = ref<string | null>(null)

  // Internal state
  let audioContext: AudioContext | null = null
  let queuedChunks: QueuedChunk[] = []
  let playbackStartTime = 0
  let activeSourceNodes: AudioBufferSourceNode[] = []
  let playbackStarted = false
  let nextScheduleTime = 0

  // Word timing tracking
  const allWordTimings = ref<WordTiming[]>([])
  const currentWordIndex = ref(-1)
  let wordTrackingInterval: ReturnType<typeof setInterval> | null = null

  // Words derived from TTS timings (for display sync)
  const ttsWords = computed(() => allWordTimings.value.map(t => t.word))

  // Full text derived from TTS words
  const ttsText = computed(() => ttsWords.value.join(' '))

  // Track completion state
  let pendingCompletion = false
  let chunksFinishedPlaying = 0

  // Serialize chunk processing to maintain order during async decode
  let processingQueue: Promise<void> = Promise.resolve()

  /**
   * Decode base64 WAV to AudioBuffer
   */
  const decodeWavToAudioBuffer = async (base64: string): Promise<AudioBuffer> => {
    if (!audioContext) {
      throw new Error('AudioContext not initialized')
    }

    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return audioContext.decodeAudioData(bytes.buffer)
  }

  /**
   * Initialize the audio context (must be called from user gesture)
   */
  const initialize = async () => {
    if (!audioContext) {
      audioContext = new AudioContext()
    }

    if (audioContext.state === 'suspended') {
      try {
        const resumePromise = audioContext.resume()
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('AudioContext resume timed out')), 5000)
        })
        await Promise.race([resumePromise, timeoutPromise])
      } catch (e) {
        console.warn('[streaming-audio] Failed to resume AudioContext:', e)
      }
    }

    return audioContext
  }

  /**
   * Schedule a chunk for playback
   */
  const scheduleChunk = (chunk: AudioChunk, audioBuffer: AudioBuffer) => {
    const currentTime = audioContext!.currentTime

    // First chunk starts playback
    if (!playbackStarted) {
      console.log('[streaming-audio] Starting playback with chunk %d', chunk.chunkIndex)
      playbackStarted = true
      playbackStartTime = currentTime
      nextScheduleTime = currentTime
      isPlaying.value = true
      isWaitingForChunks.value = false
      startWordTracking()
      options.onPlaybackStart?.()
    }

    const scheduledTime = nextScheduleTime

    console.log('[streaming-audio] Scheduling chunk %d at %.3fs (duration: %dms)',
      chunk.chunkIndex, scheduledTime, chunk.durationMs)

    // Create and schedule the source node
    const source = audioContext!.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContext!.destination)
    source.start(scheduledTime)

    activeSourceNodes.push(source)
    nextScheduleTime = scheduledTime + audioBuffer.duration

    // Handle chunk completion
    source.onended = () => {
      const idx = activeSourceNodes.indexOf(source)
      if (idx >= 0) {
        activeSourceNodes.splice(idx, 1)
      }
      chunksFinishedPlaying++
      currentChunkIndex.value = chunk.chunkIndex

      const isLastQueuedChunk = chunksFinishedPlaying >= queuedChunks.length

      if (chunk.isLast || (pendingCompletion && isLastQueuedChunk)) {
        isPlaying.value = false
        stopWordTracking()
        pendingCompletion = false
        options.onComplete?.()
      }
    }

    // Add word timings with cumulative offset
    const adjustedTimings = chunk.wordTimings.map(t => ({
      word: t.word,
      startMs: t.startMs + chunk.cumulativeOffsetMs,
      endMs: t.endMs + chunk.cumulativeOffsetMs
    }))
    allWordTimings.value.push(...adjustedTimings)

    queuedChunks.push({
      chunk,
      audioBuffer,
      scheduledTime
    })
  }

  /**
   * Enqueue an audio chunk for playback.
   * Chunks are processed in the order they arrive (guaranteed by server).
   */
  const enqueueChunk = async (chunk: AudioChunk) => {
    // Handle empty "final marker" chunk
    if (chunk.isLast && !chunk.audioBase64) {
      const allAudioFinished = queuedChunks.length > 0 &&
        chunksFinishedPlaying >= queuedChunks.length

      if (allAudioFinished || queuedChunks.length === 0) {
        isPlaying.value = false
        stopWordTracking()
        options.onComplete?.()
      } else {
        pendingCompletion = true
      }
      return
    }

    // Serialize chunk processing to maintain decode order
    processingQueue = processingQueue.then(async () => {
      try {
        if (!audioContext) {
          await initialize()
        }

        if (audioContext!.state === 'suspended') {
          await audioContext!.resume()
        }

        const audioBuffer = await decodeWavToAudioBuffer(chunk.audioBase64)

        console.log('[streaming-audio] Processing chunk %d (offset: %dms)',
          chunk.chunkIndex, chunk.cumulativeOffsetMs)

        // Schedule immediately - chunks arrive in order from server
        scheduleChunk(chunk, audioBuffer)

        error.value = null
      } catch (err) {
        console.error('[streaming-audio] Failed to enqueue chunk:', err)
        error.value = err instanceof Error ? err.message : 'Failed to play audio'
      }
    })

    await processingQueue
  }

  /**
   * Start word timing tracking
   */
  const startWordTracking = () => {
    if (wordTrackingInterval) return

    wordTrackingInterval = setInterval(() => {
      if (!audioContext || !isPlaying.value) return

      const elapsedSec = audioContext.currentTime - playbackStartTime
      const currentTimeMs = elapsedSec * 1000

      // Find the current word based on elapsed time
      for (let i = allWordTimings.value.length - 1; i >= 0; i--) {
        if (currentTimeMs >= allWordTimings.value[i].startMs) {
          currentWordIndex.value = i
          break
        }
      }
    }, 50)
  }

  /**
   * Stop word timing tracking
   */
  const stopWordTracking = () => {
    if (wordTrackingInterval) {
      clearInterval(wordTrackingInterval)
      wordTrackingInterval = null
    }
  }

  /**
   * Stop playback and clear queue
   */
  const stop = (triggerComplete = false) => {
    const wasPlaying = isPlaying.value

    for (const source of activeSourceNodes) {
      try {
        source.stop()
        source.disconnect()
      } catch {
        // Ignore errors if source already stopped
      }
    }
    activeSourceNodes = []

    if (audioContext) {
      audioContext.close()
      audioContext = null
    }

    stopWordTracking()

    isPlaying.value = false
    isWaitingForChunks.value = false
    currentChunkIndex.value = -1
    currentWordIndex.value = -1
    playbackStartTime = 0
    playbackStarted = false
    nextScheduleTime = 0
    processingQueue = Promise.resolve()
    queuedChunks = []
    allWordTimings.value = []
    error.value = null
    pendingCompletion = false
    chunksFinishedPlaying = 0

    if (triggerComplete && wasPlaying) {
      options.onComplete?.()
    }
  }

  /**
   * Pause playback
   */
  const pause = async () => {
    if (audioContext && audioContext.state === 'running') {
      await audioContext.suspend()
    }
  }

  /**
   * Resume playback
   */
  const resume = async () => {
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume()
    }
  }

  /**
   * Reset for new streaming session
   */
  const reset = () => {
    stop()
  }

  onUnmounted(() => {
    stop()
  })

  return {
    // State
    isPlaying: readonly(isPlaying),
    isWaitingForChunks: readonly(isWaitingForChunks),
    currentChunkIndex: readonly(currentChunkIndex),
    currentWordIndex: readonly(currentWordIndex),
    allWordTimings: readonly(allWordTimings),
    ttsWords,
    ttsText,
    error: readonly(error),

    // Methods
    initialize,
    enqueueChunk,
    stop,
    pause,
    resume,
    reset
  }
}
