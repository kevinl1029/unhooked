<script setup lang="ts">
/**
 * Journey Player Component
 * Displays the reflective journey with sequential audio playback
 * and word-by-word transcript sync
 *
 * Uses Web Audio API for iOS Safari compatibility - all segments are
 * scheduled from the initial user gesture to avoid autoplay restrictions.
 */

interface WordTiming {
  word: string
  start: number
  end: number
}

interface JourneySegment {
  id: string
  type: 'narration' | 'user_moment'
  text: string
  transcript: string
  duration_ms?: number
  moment_id?: string
  audio_url?: string
  word_timings?: WordTiming[]
  audio_unavailable?: boolean
}

interface Props {
  segments: JourneySegment[]
  autoPreload?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  autoPreload: true,
})

const emit = defineEmits<{
  complete: []
  error: [error: string]
}>()

// State
const currentSegmentIndex = ref(0)
const isPlaying = ref(false)
const isLoading = ref(false)
const currentWordIndex = ref(-1)
const preloadedSegments = ref<Map<string, JourneySegment>>(new Map())
const hasPreloaded = ref(false)
const playbackError = ref<string | null>(null)

// Web Audio API state
let audioContext: AudioContext | null = null
let scheduledNodes: AudioBufferSourceNode[] = []
let playbackStartTime = 0
let wordTrackingInterval: ReturnType<typeof setInterval> | null = null
let segmentStartTimes: number[] = [] // Cumulative start times for each segment in seconds

// Computed
const currentSegment = computed(() => props.segments[currentSegmentIndex.value])
const totalSegments = computed(() => props.segments.length)
const progress = computed(() => {
  if (totalSegments.value === 0) return 0
  return ((currentSegmentIndex.value + 1) / totalSegments.value) * 100
})
const canPlay = computed(() => hasPreloaded.value && props.segments.length > 0)

// Preload all segments (eager preload)
async function preloadAllSegments() {
  if (hasPreloaded.value || props.segments.length === 0) return

  isLoading.value = true
  playbackError.value = null

  try {
    const loadPromises = props.segments.map(async (segment) => {
      if (preloadedSegments.value.has(segment.id)) return

      try {
        const response = await $fetch<{
          audio_url?: string
          duration_ms?: number
          word_timings?: WordTiming[]
          audio_unavailable?: boolean
          text?: string
        }>(`/api/ceremony/journey/${segment.id}/audio`)

        const preloaded: JourneySegment = {
          ...segment,
          audio_url: response.audio_url,
          duration_ms: response.duration_ms,
          word_timings: response.word_timings,
          audio_unavailable: response.audio_unavailable,
        }

        preloadedSegments.value.set(segment.id, preloaded)
      } catch (error) {
        console.error(`[JourneyPlayer] Failed to preload segment ${segment.id}:`, error)
        // Mark as unavailable but don't fail completely
        preloadedSegments.value.set(segment.id, {
          ...segment,
          audio_unavailable: true,
        })
      }
    })

    await Promise.all(loadPromises)
    hasPreloaded.value = true
  } catch (error) {
    playbackError.value = 'Failed to load journey audio'
    emit('error', playbackError.value)
  } finally {
    isLoading.value = false
  }
}

// Get preloaded segment data
function getSegmentData(segment: JourneySegment): JourneySegment {
  return preloadedSegments.value.get(segment.id) || segment
}

// Fetch and decode audio buffer for a segment
async function fetchAndDecodeAudio(audioUrl: string): Promise<AudioBuffer> {
  if (!audioContext) {
    throw new Error('AudioContext not initialized')
  }

  const response = await fetch(audioUrl)
  const arrayBuffer = await response.arrayBuffer()
  return audioContext.decodeAudioData(arrayBuffer)
}

// Start word timing tracking
function startWordTracking() {
  if (wordTrackingInterval) return

  wordTrackingInterval = setInterval(() => {
    if (!audioContext || !isPlaying.value) return

    const elapsedSec = audioContext.currentTime - playbackStartTime

    // Find which segment we're in
    let segmentIdx = 0
    for (let i = 0; i < segmentStartTimes.length; i++) {
      if (elapsedSec >= segmentStartTimes[i]) {
        segmentIdx = i
      } else {
        break
      }
    }

    // Update current segment if changed
    if (segmentIdx !== currentSegmentIndex.value) {
      currentSegmentIndex.value = segmentIdx
      currentWordIndex.value = -1
    }

    // Track word highlighting within current segment
    const segment = getSegmentData(props.segments[segmentIdx])
    if (!segment.word_timings || segment.word_timings.length === 0) return

    const segmentElapsedMs = (elapsedSec - segmentStartTimes[segmentIdx]) * 1000

    // Find current word
    let foundIndex = -1
    for (let i = 0; i < segment.word_timings.length; i++) {
      const timing = segment.word_timings[i]
      if (segmentElapsedMs >= timing.start) {
        foundIndex = i
      } else {
        break
      }
    }

    if (foundIndex >= 0 && foundIndex !== currentWordIndex.value) {
      currentWordIndex.value = foundIndex
    }
  }, 50)
}

// Stop word timing tracking
function stopWordTracking() {
  if (wordTrackingInterval) {
    clearInterval(wordTrackingInterval)
    wordTrackingInterval = null
  }
}

// Schedule all segments for playback from user gesture
async function scheduleAllSegments() {
  if (!audioContext) {
    audioContext = new AudioContext()
  }

  // Resume context if suspended (iOS Safari)
  if (audioContext.state === 'suspended') {
    await audioContext.resume()
  }

  let scheduleTime = audioContext.currentTime
  segmentStartTimes = []
  const GAP_DURATION_SEC = 0.75 // 750ms gap between segments

  for (let i = 0; i < props.segments.length; i++) {
    const segment = getSegmentData(props.segments[i])

    // Record segment start time
    segmentStartTimes.push(scheduleTime)

    if (segment.audio_unavailable || !segment.audio_url) {
      // Text-only fallback - calculate duration and advance
      const textDuration = Math.max(segment.text.split(' ').length * 300, 3000)
      scheduleTime += textDuration / 1000 + GAP_DURATION_SEC
      continue
    }

    try {
      // Fetch and decode audio
      const audioBuffer = await fetchAndDecodeAudio(segment.audio_url)

      // Create and schedule source node
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.start(scheduleTime)

      scheduledNodes.push(source)

      // Handle completion
      if (i === props.segments.length - 1) {
        // Last segment - emit complete when done
        source.onended = () => {
          isPlaying.value = false
          stopWordTracking()
          currentSegmentIndex.value = props.segments.length - 1
          emit('complete')
        }
      }

      // Advance schedule time (add gap between segments)
      scheduleTime += audioBuffer.duration + GAP_DURATION_SEC
    } catch (error) {
      console.error(`[JourneyPlayer] Failed to schedule segment ${segment.id}:`, error)
      // Continue with next segment on error
      scheduleTime += GAP_DURATION_SEC
    }
  }

  playbackStartTime = audioContext.currentTime
}

// Start playback
async function play() {
  if (!canPlay.value) {
    await preloadAllSegments()
  }

  if (!canPlay.value) return

  try {
    // Schedule all segments from this user gesture
    await scheduleAllSegments()

    isPlaying.value = true
    startWordTracking()
  } catch (error) {
    console.error('[JourneyPlayer] Playback failed:', error)
    playbackError.value = 'Failed to start playback'
    emit('error', playbackError.value)
  }
}

// Pause playback
async function pause() {
  isPlaying.value = false
  stopWordTracking()

  if (audioContext && audioContext.state === 'running') {
    await audioContext.suspend()
  }
}

// Resume playback
async function resume() {
  if (!audioContext) return

  if (audioContext.state === 'suspended') {
    await audioContext.resume()
    isPlaying.value = true
    startWordTracking()
  }
}

// Toggle play/pause
async function togglePlay() {
  if (isPlaying.value) {
    await pause()
  } else if (audioContext && scheduledNodes.length > 0) {
    // Resume if already scheduled
    await resume()
  } else {
    // Start fresh
    await play()
  }
}

// Reset to beginning
function reset() {
  currentSegmentIndex.value = 0
  currentWordIndex.value = -1
  isPlaying.value = false
  stopWordTracking()

  // Stop all scheduled nodes
  for (const node of scheduledNodes) {
    try {
      node.stop()
      node.disconnect()
    } catch {
      // Ignore errors if already stopped
    }
  }
  scheduledNodes = []

  // Close and reset audio context
  if (audioContext) {
    audioContext.close()
    audioContext = null
  }

  segmentStartTimes = []
}

// Cleanup on unmount
onUnmounted(() => {
  reset()
})

// Auto-preload on mount
onMounted(() => {
  if (props.autoPreload) {
    preloadAllSegments()
  }
})

// Expose methods
defineExpose({
  play,
  pause,
  togglePlay,
  reset,
  preloadAllSegments,
})
</script>

<template>
  <div class="journey-player">
    <!-- Loading state -->
    <div v-if="isLoading" class="text-center py-8">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-accent border-t-transparent" />
      <p class="mt-4 text-white-65">Loading your journey...</p>
    </div>

    <!-- Error state -->
    <div v-else-if="playbackError" class="text-center py-8">
      <p class="text-red-400">{{ playbackError }}</p>
      <button
        class="mt-4 px-4 py-2 bg-brand-glass rounded-lg text-white"
        @click="preloadAllSegments"
      >
        Try Again
      </button>
    </div>

    <!-- Player UI -->
    <div v-else class="space-y-6">
      <!-- Progress bar -->
      <div class="h-1 bg-brand-glass rounded-full overflow-hidden">
        <div
          class="h-full bg-brand-accent transition-all duration-300"
          :style="{ width: `${progress}%` }"
        />
      </div>

      <!-- Segment indicator -->
      <div class="text-center text-white-65 text-sm">
        {{ currentSegmentIndex + 1 }} of {{ totalSegments }}
      </div>

      <!-- Transcript display with word highlighting -->
      <div
        v-if="currentSegment"
        class="p-6 bg-brand-glass rounded-card min-h-[200px]"
      >
        <div
          v-if="currentSegment.type === 'user_moment'"
          class="text-xs text-brand-accent uppercase tracking-wider mb-2"
        >
          Your words
        </div>

        <p class="text-lg text-white leading-relaxed">
          <template v-if="getSegmentData(currentSegment).word_timings?.length">
            <span
              v-for="(timing, index) in getSegmentData(currentSegment).word_timings"
              :key="index"
              :class="[
                'transition-colors duration-150',
                index === currentWordIndex ? 'text-brand-accent font-medium' : 'text-white',
                index < currentWordIndex ? 'text-white-85' : ''
              ]"
            >
              {{ timing.word }}{{ ' ' }}
            </span>
          </template>
          <template v-else>
            {{ currentSegment.text }}
          </template>
        </p>
      </div>

      <!-- Controls -->
      <div class="flex justify-center items-center gap-4">
        <button
          class="p-4 rounded-full bg-brand-accent text-white shadow-card hover:scale-105 transition-transform disabled:opacity-50"
          :disabled="!canPlay"
          @click="togglePlay"
        >
          <svg
            v-if="isPlaying"
            class="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
          <svg
            v-else
            class="w-8 h-8"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
