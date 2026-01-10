<script setup lang="ts">
/**
 * Journey Player Page
 * Plays the user's reflective journey with the JourneyPlayer component
 */

definePageMeta({
  middleware: 'auth',
})

interface JourneySegment {
  id: string
  type: 'narration' | 'user_moment'
  text: string
  transcript: string
  duration_ms?: number
  moment_id?: string
}

interface JourneyData {
  artifact_id: string
  playlist: {
    segments: JourneySegment[]
  }
  journey_text: string
}

const router = useRouter()
const journeyPlayerRef = ref<{ play: () => void } | null>(null)

// Fetch journey data
const { data, pending, error, refresh } = await useFetch<JourneyData>('/api/ceremony/journey')

const segments = computed(() => data.value?.playlist?.segments || [])
const hasSegments = computed(() => segments.value.length > 0)

function handleComplete() {
  // Journey finished - could show a completion state or redirect
  console.log('Journey complete')
}

function handleError(errorMsg: string) {
  console.error('Journey error:', errorMsg)
}

function goBack() {
  router.push('/dashboard')
}
</script>

<template>
  <div class="min-h-screen py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <button
          class="inline-flex items-center text-white-65 hover:text-white transition mb-4"
          @click="goBack"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        <h1 class="text-3xl font-bold text-white mb-2">Your Journey</h1>
        <p class="text-white-65">Listen to your transformation story</p>
      </div>

      <!-- Loading state -->
      <div v-if="pending" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-accent border-t-transparent" />
        <p class="mt-4 text-white-65">Loading your journey...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-400 mb-4">Failed to load journey</p>
        <button
          class="px-4 py-2 bg-brand-glass rounded-lg text-white"
          @click="refresh"
        >
          Try Again
        </button>
      </div>

      <!-- No segments -->
      <div v-else-if="!hasSegments" class="text-center py-12">
        <p class="text-white-65 mb-4">Your journey hasn't been generated yet.</p>
        <NuxtLink
          to="/dashboard"
          class="px-4 py-2 bg-brand-glass rounded-lg text-white inline-block"
        >
          Return to Dashboard
        </NuxtLink>
      </div>

      <!-- Journey Player -->
      <div v-else class="glass rounded-card p-6 border border-brand-border">
        <JourneyPlayer
          ref="journeyPlayerRef"
          :segments="segments"
          :auto-preload="true"
          @complete="handleComplete"
          @error="handleError"
        />
      </div>

      <!-- Journey text (collapsible) -->
      <details v-if="data?.journey_text" class="mt-6">
        <summary class="text-white-65 cursor-pointer hover:text-white transition">
          View full transcript
        </summary>
        <div class="mt-4 p-4 bg-brand-glass rounded-lg text-white-85 whitespace-pre-wrap">
          {{ data.journey_text }}
        </div>
      </details>
    </div>
  </div>
</template>
