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
}

export const useStreamingAudioQueue = (options: StreamingAudioQueueOptions = {}) => {
  // State
  const isPlaying = ref(false)
  const isWaitingForChunks = ref(false)
  const currentChunkIndex = ref(-1)
  const error = ref<string | null>(null)

  // Internal state
  let audioContext: AudioContext | null = null
  let nextPlayTime = 0
  let queuedChunks: QueuedChunk[] = []
  let playbackStartTime = 0 // When first chunk started (audioContext.currentTime)

  // Word timing tracking
  const allWordTimings = ref<WordTiming[]>([])
  const currentWordIndex = ref(-1)
  let wordTrackingInterval: ReturnType<typeof setInterval> | null = null

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
      await audioContext.resume()
    }

    return audioContext
  }

  /**
   * Enqueue an audio chunk for playback
   */
  const enqueueChunk = async (chunk: AudioChunk) => {
    try {
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

      // Calculate scheduled time
      let scheduledTime: number
      if (!isPlaying.value) {
        // First chunk - start immediately
        nextPlayTime = audioContext!.currentTime
        playbackStartTime = nextPlayTime
        scheduledTime = nextPlayTime
        isPlaying.value = true
        isWaitingForChunks.value = false
        startWordTracking()
      } else {
        // Subsequent chunk - schedule after previous
        scheduledTime = nextPlayTime
      }

      // Create and schedule the source node
      const source = audioContext!.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext!.destination)
      source.start(scheduledTime)

      // Track when this chunk ends
      source.onended = () => {
        // Increment finished count
        chunksFinishedPlaying++

        // Update current chunk index
        const chunkIdx = queuedChunks.findIndex(qc => qc.scheduledTime === scheduledTime)
        if (chunkIdx >= 0) {
          currentChunkIndex.value = queuedChunks[chunkIdx].chunk.chunkIndex
        }

        // Check if this is the last queued chunk
        const isLastQueuedChunk = chunksFinishedPlaying >= queuedChunks.length

        // Check if this was marked as last, OR if we have a pending completion and this is the last queued chunk
        if (chunk.isLast || (pendingCompletion && isLastQueuedChunk)) {
          isPlaying.value = false
          stopWordTracking()
          pendingCompletion = false
          // Notify that audio playback is complete
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

      // Track this chunk
      queuedChunks.push({
        chunk,
        audioBuffer,
        scheduledTime
      })

      // Update next play time for gapless scheduling
      nextPlayTime = scheduledTime + audioBuffer.duration

      error.value = null
    } catch (err) {
      console.error('[streaming-audio] Failed to enqueue chunk:', err)
      error.value = err instanceof Error ? err.message : 'Failed to play audio'
    }
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
   */
  const stop = () => {
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }

    stopWordTracking()

    isPlaying.value = false
    isWaitingForChunks.value = false
    currentChunkIndex.value = -1
    currentWordIndex.value = -1
    nextPlayTime = 0
    playbackStartTime = 0
    queuedChunks = []
    allWordTimings.value = []
    error.value = null
    pendingCompletion = false
    chunksFinishedPlaying = 0
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
