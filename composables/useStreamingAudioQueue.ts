/**
 * Streaming Audio Queue Composable
 *
 * Manages Web Audio API for gapless playback of streaming audio chunks.
 * Queues AudioBufferSourceNodes and schedules them for continuous playback.
 */

import type { AudioChunk, WordTiming } from '~/server/utils/tts/types'

interface QueuedChunk {
  chunk: AudioChunk
  audioBuffer: AudioBuffer
  scheduledTime: number
}

interface StreamingAudioQueueOptions {
  onComplete?: () => void
  onPlaybackStart?: () => void // Called when first audio chunk starts playing
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
  let playbackStartTime = 0 // When first chunk started (audioContext.currentTime)
  let activeSourceNodes: AudioBufferSourceNode[] = [] // Track active source nodes for cleanup
  let playbackStarted = false // Track if we've started playback

  // Buffer for out-of-order chunk handling
  // We wait for chunks to arrive in order before scheduling them
  let nextExpectedChunkIndex = 0
  let pendingChunks: Map<number, { chunk: AudioChunk; audioBuffer: AudioBuffer }> = new Map()
  let nextScheduleTime = 0 // Track when next chunk should be scheduled

  // Word timing tracking
  const allWordTimings = ref<WordTiming[]>([])
  const currentWordIndex = ref(-1)
  let wordTrackingInterval: ReturnType<typeof setInterval> | null = null

  // Words derived from TTS timings (for display sync)
  const ttsWords = computed(() => allWordTimings.value.map(t => t.word))

  // Full text derived from TTS words (for final message content after streaming)
  const ttsText = computed(() => ttsWords.value.join(' '))

  // Track if we received a completion marker while audio is still playing
  let pendingCompletion = false
  // Track how many chunks have finished playing
  let chunksFinishedPlaying = 0

  /**
   * Decode base64 WAV to AudioBuffer
   */
  const decodeWavToAudioBuffer = async (base64: string, contentType: string): Promise<AudioBuffer> => {
    if (!audioContext) {
      throw new Error('AudioContext not initialized')
    }

    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Decode audio data
    return audioContext.decodeAudioData(bytes.buffer)
  }

  /**
   * Initialize the audio context (must be called from user gesture)
   */
  const initialize = async () => {
    if (!audioContext) {
      audioContext = new AudioContext()
    }

    // Resume if suspended (happens after page load without user gesture)
    if (audioContext.state === 'suspended') {
      try {
        // Add a timeout to prevent infinite waiting if resume doesn't complete
        // (can happen in automated tests or if user gesture context is lost)
        const resumePromise = audioContext.resume()
        const timeoutPromise = new Promise<void>((_, reject) => {
          setTimeout(() => reject(new Error('AudioContext resume timed out')), 5000)
        })
        await Promise.race([resumePromise, timeoutPromise])
      } catch (e) {
        console.warn('[streaming-audio] Failed to resume AudioContext:', e)
        // Continue anyway - the context may resume when audio is scheduled
      }
    }

    return audioContext
  }

  /**
   * Schedule a chunk for playback (internal helper)
   * Only called when we have the next expected chunk ready
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

    // Schedule this chunk at the next available time
    const scheduledTime = nextScheduleTime

    console.log('[streaming-audio] Scheduling chunk %d at %.3fs (duration: %dms)',
      chunk.chunkIndex, scheduledTime, chunk.durationMs)

    // Create and schedule the source node
    const source = audioContext!.createBufferSource()
    source.buffer = audioBuffer
    source.connect(audioContext!.destination)
    source.start(scheduledTime)

    // Track this source node for cleanup
    activeSourceNodes.push(source)

    // Update next schedule time for gapless playback
    nextScheduleTime = scheduledTime + audioBuffer.duration

    // Track when this chunk ends
    source.onended = () => {
      // Remove from active list
      const idx = activeSourceNodes.indexOf(source)
      if (idx >= 0) {
        activeSourceNodes.splice(idx, 1)
      }
      // Increment finished count
      chunksFinishedPlaying++

      // Update current chunk index
      currentChunkIndex.value = chunk.chunkIndex

      // Check if this is the last queued chunk
      const isLastQueuedChunk = chunksFinishedPlaying >= queuedChunks.length

      // Check if this was marked as last, OR if we have a pending completion and this is the last queued chunk
      if (chunk.isLast || (pendingCompletion && isLastQueuedChunk)) {
        isPlaying.value = false
        stopWordTracking()
        pendingCompletion = false
        options.onComplete?.()
      }
    }

    // Add word timings (already in correct order since we schedule in order)
    const adjustedTimings = chunk.wordTimings.map(t => ({
      word: t.word,
      startMs: t.startMs + chunk.cumulativeOffsetMs,
      endMs: t.endMs + chunk.cumulativeOffsetMs
    }))
    allWordTimings.value.push(...adjustedTimings)

    // Track this chunk
    queuedChunks.push({
      chunk,
      audioBuffer,
      scheduledTime
    })
  }

  /**
   * Process any pending chunks that are now ready to be scheduled
   */
  const processPendingChunks = () => {
    // Schedule chunks in order as they become available
    while (pendingChunks.has(nextExpectedChunkIndex)) {
      const pending = pendingChunks.get(nextExpectedChunkIndex)!
      pendingChunks.delete(nextExpectedChunkIndex)
      console.log('[streaming-audio] Processing buffered chunk %d', pending.chunk.chunkIndex)
      scheduleChunk(pending.chunk, pending.audioBuffer)
      nextExpectedChunkIndex++
    }

    // Update waiting state
    if (pendingChunks.size === 0) {
      isWaitingForChunks.value = false
    }
  }

  // Queue for serializing chunk processing to avoid race conditions
  let processingQueue: Promise<void> = Promise.resolve()

  /**
   * Enqueue an audio chunk for playback
   * Chunks may arrive out of order; we buffer and schedule them in correct order
   */
  const enqueueChunk = async (chunk: AudioChunk) => {
    // Handle empty "final marker" chunk - just signals completion without audio
    if (chunk.isLast && !chunk.audioBase64) {
      // Check if all queued audio has already finished playing
      const allAudioFinished = queuedChunks.length > 0 &&
        chunksFinishedPlaying >= queuedChunks.length

      if (allAudioFinished || queuedChunks.length === 0) {
        // All audio done or no audio was ever queued - trigger completion immediately
        isPlaying.value = false
        stopWordTracking()
        options.onComplete?.()
      } else {
        // Audio still playing - mark for completion when it finishes
        pendingCompletion = true
      }
      return
    }

    // Serialize chunk processing to avoid race conditions from async decode
    // Without this, chunk 6 could finish decoding before chunk 5 and get scheduled out of order
    processingQueue = processingQueue.then(async () => {
      try {
        // Initialize on first chunk
        if (!audioContext) {
          await initialize()
        }

        // Resume if suspended
        if (audioContext!.state === 'suspended') {
          await audioContext!.resume()
        }

        // Decode the audio
        const audioBuffer = await decodeWavToAudioBuffer(chunk.audioBase64, chunk.contentType)

        console.log('[streaming-audio] Received chunk %d (expected: %d, offset: %dms, pending: [%s])',
          chunk.chunkIndex, nextExpectedChunkIndex, chunk.cumulativeOffsetMs,
          Array.from(pendingChunks.keys()).join(','))

        // Check if this is the chunk we're waiting for
        if (chunk.chunkIndex === nextExpectedChunkIndex) {
          // Schedule this chunk immediately
          scheduleChunk(chunk, audioBuffer)
          nextExpectedChunkIndex++

          // Check if any pending chunks can now be scheduled
          processPendingChunks()
        } else if (chunk.chunkIndex > nextExpectedChunkIndex) {
          // This chunk arrived early - buffer it
          console.log('[streaming-audio] Buffering chunk %d (waiting for chunk %d, buffer size: %d)',
            chunk.chunkIndex, nextExpectedChunkIndex, pendingChunks.size + 1)
          pendingChunks.set(chunk.chunkIndex, { chunk, audioBuffer })
          isWaitingForChunks.value = true
        } else {
          // This chunk is older than expected (shouldn't happen normally)
          console.warn('[streaming-audio] Received old chunk %d (expected: %d), scheduling anyway',
            chunk.chunkIndex, nextExpectedChunkIndex)
          scheduleChunk(chunk, audioBuffer)
        }

        error.value = null
      } catch (err) {
        console.error('[streaming-audio] Failed to enqueue chunk:', err)
        error.value = err instanceof Error ? err.message : 'Failed to play audio'
      }
    })

    // Wait for this chunk to be processed before returning
    await processingQueue
  }

  /**
   * Start word timing tracking
   */
  const startWordTracking = () => {
    if (wordTrackingInterval) return

    wordTrackingInterval = setInterval(() => {
      if (!audioContext || !isPlaying.value) return

      // Calculate current playback time in ms
      const elapsedSec = audioContext.currentTime - playbackStartTime
      const currentTimeMs = elapsedSec * 1000

      // Find current word based on timing
      for (let i = allWordTimings.value.length - 1; i >= 0; i--) {
        if (currentTimeMs >= allWordTimings.value[i].startMs) {
          currentWordIndex.value = i
          break
        }
      }
    }, 50) // Update every 50ms
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
   * @param triggerComplete - Whether to trigger onComplete callback (default: false for reset, true for user-initiated stop)
   */
  const stop = (triggerComplete = false) => {
    const wasPlaying = isPlaying.value

    // Stop all active source nodes first
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
    nextExpectedChunkIndex = 0
    pendingChunks = new Map()
    nextScheduleTime = 0
    processingQueue = Promise.resolve()
    queuedChunks = []
    allWordTimings.value = []
    error.value = null
    pendingCompletion = false
    chunksFinishedPlaying = 0

    // Trigger complete callback if requested and we were playing
    if (triggerComplete && wasPlaying) {
      options.onComplete?.()
    }
  }

  /**
   * Pause playback (suspend audio context)
   */
  const pause = async () => {
    if (audioContext && audioContext.state === 'running') {
      await audioContext.suspend()
    }
  }

  /**
   * Resume playback (resume audio context)
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

  // Cleanup on unmount
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
