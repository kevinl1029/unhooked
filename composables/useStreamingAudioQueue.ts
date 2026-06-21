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
  let wordTrackingRaf: number | null = null

  // Absolute AudioContext start time (seconds) for each word, index-aligned with
  // allWordTimings. This is the ground-truth clock the highlight loop reads — each
  // word is anchored to the actual time its audio buffer is scheduled to play.
  let wordStartTimes: number[] = []

  // Words derived from TTS timings (for display sync)
  const ttsWords = computed(() => allWordTimings.value.map(t => t.word))

  // Full text derived from TTS words
  const ttsText = computed(() => ttsWords.value.join(' '))

  // Track completion state
  let pendingCompletion = false
  let chunksFinishedPlaying = 0

  // Serialize chunk processing to maintain order during async decode
  let processingQueue: Promise<void> = Promise.resolve()

  // Auto-resume listener cleanup for iOS Safari
  let autoResumeCleanup: (() => void) | null = null

  /**
   * Register document-level listeners to auto-resume a suspended AudioContext
   * on the user's first interaction. Required for iOS Safari which suspends
   * AudioContext created outside a user gesture.
   */
  const registerAutoResume = () => {
    if (typeof document === 'undefined') return

    const handler = () => {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume()
      }
      cleanupAutoResume()
    }

    const cleanupAutoResume = () => {
      document.removeEventListener('touchstart', handler)
      document.removeEventListener('touchend', handler)
      document.removeEventListener('click', handler)
      autoResumeCleanup = null
    }

    document.addEventListener('touchstart', handler, { once: true, passive: true })
    document.addEventListener('touchend', handler, { once: true, passive: true })
    document.addEventListener('click', handler, { once: true })

    autoResumeCleanup = cleanupAutoResume
  }

  // Onset detection: scan the decoded buffer for the first audible sample so we can
  // cancel the leading silence that MP3 decoders prepend ("encoder/decoder priming").
  // InWorld's word timestamps start at the real speech onset, so without this the
  // highlight runs slightly ahead of the audio.
  const ONSET_THRESHOLD = 0.01 // ~ -40 dBFS
  const ONSET_MAX_SEARCH_SEC = 0.3 // don't mistake a genuinely soft sentence start for priming

  // Opt-in highlight-timing diagnostics (off unless localStorage.debugTiming === '1').
  const isTimingDebugEnabled = (): boolean => {
    try {
      return typeof window !== 'undefined' && window.localStorage?.getItem('debugTiming') === '1'
    } catch {
      return false
    }
  }

  /**
   * Return the time (seconds) of the first audible sample in the buffer, or 0 if
   * none is found within the search window (or the buffer is empty/unavailable).
   */
  const detectOnsetSec = (audioBuffer: AudioBuffer): number => {
    if (!audioBuffer || audioBuffer.numberOfChannels < 1) return 0

    let data: Float32Array
    try {
      data = audioBuffer.getChannelData(0)
    } catch {
      return 0
    }
    if (!data || data.length === 0) return 0

    const sampleRate = audioBuffer.sampleRate || 48000
    const maxSamples = Math.min(data.length, Math.floor(ONSET_MAX_SEARCH_SEC * sampleRate))
    for (let i = 0; i < maxSamples; i++) {
      if (Math.abs(data[i]) > ONSET_THRESHOLD) {
        return i / sampleRate
      }
    }
    return 0
  }

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
   * Initialize the audio context.
   * Call from a user gesture handler (click/touch) to ensure iOS Safari
   * allows audio playback. If called outside a gesture, the context will
   * start suspended and auto-resume on the user's next interaction.
   * Reuses existing AudioContext when one already exists and is not closed.
   */
  const initialize = async () => {
    if (!audioContext || audioContext.state === 'closed') {
      audioContext = new AudioContext()

      // On iOS Safari, AudioContext created outside a user gesture starts suspended.
      // Register document-level listeners so the first user interaction resumes it.
      if (audioContext.state === 'suspended') {
        registerAutoResume()
      }
    }

    // Attempt to resume — succeeds immediately when called from a user gesture,
    // otherwise the auto-resume listener will handle it on next interaction.
    // IMPORTANT: Do NOT await this — on iOS without a gesture the promise
    // never resolves, which would block the entire SSE processing pipeline.
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {
        // Expected on iOS without user gesture — auto-resume listener will handle it
      })
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
      playbackStarted = true
      playbackStartTime = currentTime
      nextScheduleTime = currentTime
      isPlaying.value = true
      isWaitingForChunks.value = false
      startWordTracking()
      options.onPlaybackStart?.()
    }

    // Add inter-sentence pause for natural pacing.
    // In sentence-batch mode each chunk is a full sentence (chunk.text is non-empty).
    // In true-streaming mode only the first sub-chunk of each sentence has text.
    // We insert a gap before every new sentence except the very first one.
    // 400ms matches the SSML/TTS industry default for inter-sentence pauses
    // and falls within the 350-600ms range perceived as natural in speech.
    const INTER_SENTENCE_GAP_SEC = 0.4
    const isNewSentence = chunk.text && chunk.text.length > 0
    if (isNewSentence && queuedChunks.length > 0) {
      nextScheduleTime += INTER_SENTENCE_GAP_SEC
    }

    // If the scheduled time is in the past, audio will start immediately
    // (Web Audio API clamps start time to currentTime). Move our schedule anchor
    // to now so word timings reflect the actual playback position.
    if (playbackStarted && nextScheduleTime < currentTime) {
      nextScheduleTime = currentTime
    }

    const scheduledTime = nextScheduleTime

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

    // ---- Word highlight scheduling --------------------------------------
    // Anchor each word to the ACTUAL AudioContext time this buffer plays at
    // (scheduledTime). This is ground truth: no parallel cumulative counter that
    // can drift out of sync with the Web Audio schedule across gaps/underruns.
    const actualDurationMs = audioBuffer.duration * 1000

    // Provider timing semantics:
    // - InWorld (audio/mpeg): ACCURATE timings, absolute from this chunk's audio start.
    // - Groq/others (audio/wav): RELATIVE, ESTIMATED timings starting at 0 per chunk.
    const isInWorldProvider = chunk.contentType === 'audio/mpeg'

    const wordStartSecForChunk: number[] = []
    const adjustedTimings: WordTiming[] = []

    if (chunk.wordTimings.length > 0) {
      const firstWordStartMs = chunk.wordTimings[0].startMs

      if (isInWorldProvider) {
        // InWorld timings are accurate; just position them on the playback clock.
        // Subtracting firstWordStartMs normalizes each chunk to its own buffer
        // (handles both sentence-batch and per-chunk true-streaming). onsetSec
        // cancels the leading silence MP3 decoding prepends to each buffer.
        const onsetSec = detectOnsetSec(audioBuffer)
        for (const t of chunk.wordTimings) {
          const absStartSec = scheduledTime + onsetSec + (t.startMs - firstWordStartMs) / 1000
          const absEndSec = scheduledTime + onsetSec + (t.endMs - firstWordStartMs) / 1000
          wordStartSecForChunk.push(absStartSec)
          adjustedTimings.push({
            word: t.word,
            startMs: Math.round((absStartSec - playbackStartTime) * 1000),
            endMs: Math.round((absEndSec - playbackStartTime) * 1000)
          })
        }

        // Opt-in alignment diagnostics: localStorage.setItem('debugTiming','1')
        if (isTimingDebugEnabled()) {
          console.debug('[streaming-audio] sentence anchor', {
            text: chunk.text?.slice(0, 40),
            scheduledTime: +scheduledTime.toFixed(3),
            onsetMs: Math.round(onsetSec * 1000),
            firstWordStartMs,
            durationMs: Math.round(actualDurationMs),
            words: wordStartSecForChunk.length
          })
        }
      } else {
        // Estimated timings may not match the real audio duration — scale them to
        // the decoded buffer length, then anchor to this buffer's schedule time.
        const lastWordEndMs = chunk.wordTimings[chunk.wordTimings.length - 1].endMs
        const scaleFactor = lastWordEndMs > 0 ? actualDurationMs / lastWordEndMs : 1
        for (const t of chunk.wordTimings) {
          const absStartSec = scheduledTime + (t.startMs * scaleFactor) / 1000
          const absEndSec = scheduledTime + (t.endMs * scaleFactor) / 1000
          wordStartSecForChunk.push(absStartSec)
          adjustedTimings.push({
            word: t.word,
            startMs: Math.round((absStartSec - playbackStartTime) * 1000),
            endMs: Math.round((absEndSec - playbackStartTime) * 1000)
          })
        }
      }
    }

    wordStartTimes.push(...wordStartSecForChunk)
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

        // Non-blocking resume: on iOS Safari without a gesture this promise
        // would hang forever, blocking the entire SSE processing pipeline.
        // Chunks scheduled on a suspended context will play once it resumes.
        if (audioContext!.state === 'suspended') {
          audioContext!.resume().catch(() => {})
        }

        const audioBuffer = await decodeWavToAudioBuffer(chunk.audioBase64)
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
   * Find the word for the current playback position and update the highlight.
   * Reads the AudioContext clock directly and compares against each word's
   * absolute scheduled start time (ground truth) — no elapsed-time bookkeeping.
   */
  const updateCurrentWord = () => {
    if (!audioContext || !isPlaying.value) return

    const now = audioContext.currentTime

    // Forward search for the last word whose start time we've reached.
    let foundIndex = -1
    for (let i = 0; i < wordStartTimes.length; i++) {
      if (now >= wordStartTimes[i]) {
        foundIndex = i
      } else {
        break
      }
    }

    if (foundIndex >= 0 && foundIndex !== currentWordIndex.value) {
      currentWordIndex.value = foundIndex
    }
  }

  /**
   * Start word timing tracking.
   * Uses requestAnimationFrame (~16ms) for tight, smooth sync, falling back to a
   * 50ms interval in environments without rAF (e.g. SSR/tests).
   */
  const startWordTracking = () => {
    if (wordTrackingRaf !== null || wordTrackingInterval !== null) return

    if (typeof requestAnimationFrame !== 'undefined') {
      const loop = () => {
        if (!isPlaying.value) {
          wordTrackingRaf = null
          return
        }
        updateCurrentWord()
        wordTrackingRaf = requestAnimationFrame(loop)
      }
      wordTrackingRaf = requestAnimationFrame(loop)
    } else {
      wordTrackingInterval = setInterval(updateCurrentWord, 50)
    }
  }

  /**
   * Stop word timing tracking
   */
  const stopWordTracking = () => {
    if (wordTrackingRaf !== null) {
      if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(wordTrackingRaf)
      }
      wordTrackingRaf = null
    }
    if (wordTrackingInterval) {
      clearInterval(wordTrackingInterval)
      wordTrackingInterval = null
    }
  }

  /**
   * Reset all playback state WITHOUT closing the AudioContext.
   * Preserves the AudioContext for the next streaming session to avoid
   * recreating it outside a user gesture context (critical for iOS Safari).
   */
  const resetPlaybackState = () => {
    // Stop and disconnect all active source nodes
    for (const source of activeSourceNodes) {
      try {
        source.stop()
        source.disconnect()
      } catch {
        // Ignore errors if source already stopped
      }
    }
    activeSourceNodes = []

    // Clear word timing tracking
    stopWordTracking()

    // Reset all playback state
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
    wordStartTimes = []
    error.value = null
    pendingCompletion = false
    chunksFinishedPlaying = 0
  }

  /**
   * Stop playback and clear queue.
   * Closes the AudioContext - a new one will be created on next initialize().
   */
  const stop = (triggerComplete = false) => {
    const wasPlaying = isPlaying.value

    // Reset all playback state first
    resetPlaybackState()

    // Clean up auto-resume listeners
    if (autoResumeCleanup) {
      autoResumeCleanup()
    }

    // Close and nullify the AudioContext
    if (audioContext) {
      audioContext.close()
      audioContext = null
    }

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
    reset,
    resetPlaybackState
  }
}
