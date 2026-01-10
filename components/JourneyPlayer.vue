<script setup lang="ts">
/**
 * Journey Player Component
 * Displays the reflective journey with sequential audio playback
 * and word-by-word transcript sync
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
const audioElement = ref<HTMLAudioElement | null>(null)
const preloadedSegments = ref<Map<string, JourneySegment>>(new Map())
const hasPreloaded = ref(false)
const playbackError = ref<string | null>(null)

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

// Play current segment
async function playCurrentSegment() {
  const segment = getSegmentData(currentSegment.value)

  if (segment.audio_unavailable || !segment.audio_url) {
    // Text-only fallback - show for a calculated duration then advance
    const textDuration = Math.max(segment.text.split(' ').length * 300, 3000)
    await new Promise(resolve => setTimeout(resolve, textDuration))
    advanceToNextSegment()
    return
  }

  // Play audio
  if (audioElement.value) {
    audioElement.value.src = segment.audio_url
    audioElement.value.play()
  }
}

// Start playback
async function play() {
  if (!canPlay.value) {
    await preloadAllSegments()
  }

  if (!canPlay.value) return

  isPlaying.value = true
  playCurrentSegment()
}

// Pause playback
function pause() {
  isPlaying.value = false
  if (audioElement.value) {
    audioElement.value.pause()
  }
}

// Toggle play/pause
function togglePlay() {
  if (isPlaying.value) {
    pause()
  } else {
    play()
  }
}

// Advance to next segment
function advanceToNextSegment() {
  if (currentSegmentIndex.value < totalSegments.value - 1) {
    currentSegmentIndex.value++
    currentWordIndex.value = -1

    // Brief silence between segments (0.5-1s)
    setTimeout(() => {
      if (isPlaying.value) {
        playCurrentSegment()
      }
    }, 750)
  } else {
    // Journey complete
    isPlaying.value = false
    emit('complete')
  }
}

// Handle audio time update for word-by-word sync
function onTimeUpdate() {
  if (!audioElement.value) return

  const segment = getSegmentData(currentSegment.value)
  if (!segment.word_timings || segment.word_timings.length === 0) return

  const currentTime = audioElement.value.currentTime * 1000 // Convert to ms

  // Find current word
  const wordIndex = segment.word_timings.findIndex(
    (timing, index) => {
      const nextTiming = segment.word_timings![index + 1]
      return currentTime >= timing.start && (!nextTiming || currentTime < nextTiming.start)
    }
  )

  if (wordIndex !== -1) {
    currentWordIndex.value = wordIndex
  }
}

// Handle audio ended
function onAudioEnded() {
  advanceToNextSegment()
}

// Reset to beginning
function reset() {
  currentSegmentIndex.value = 0
  currentWordIndex.value = -1
  isPlaying.value = false
  if (audioElement.value) {
    audioElement.value.pause()
    audioElement.value.currentTime = 0
  }
}

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
    <!-- Hidden audio element -->
    <audio
      ref="audioElement"
      @timeupdate="onTimeUpdate"
      @ended="onAudioEnded"
    />

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
