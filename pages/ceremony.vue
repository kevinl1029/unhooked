<template>
  <div class="min-h-screen p-4">
    <div class="max-w-2xl mx-auto">
      <!-- Initial status check loading -->
      <div v-if="isCheckingStatus" class="glass rounded-card p-8 shadow-card border border-brand-border text-center animate-fade-in-up">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-accent border-t-transparent mb-4" />
        <p class="text-white-65">Loading your ceremony progress...</p>
      </div>

      <!-- Loading overlay -->
      <div v-else-if="isLoading" class="fixed inset-0 bg-brand-bg-dark/80 flex items-center justify-center z-50">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-accent border-t-transparent" />
          <p class="mt-4 text-white-65">{{ loadingMessage }}</p>
        </div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="glass rounded-card p-8 shadow-card border border-brand-border text-center animate-fade-in-up">
        <div class="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-white mb-2">Something went wrong</h2>
        <p class="text-white-65 mb-6">{{ error }}</p>
        <button
          class="btn-primary text-white px-6 py-3 rounded-pill font-semibold"
          @click="retryCurrentStep"
        >
          Try Again
        </button>
      </div>

      <!-- Not Ready State -->
      <div v-else-if="currentStep === 'not_ready'" class="animate-fade-in-up">
        <div class="glass rounded-card p-8 md:p-12 shadow-card border border-brand-border text-center">
          <!-- Warning icon -->
          <div class="w-24 h-24 rounded-full bg-yellow-500/20 border-2 border-yellow-500 flex items-center justify-center mx-auto mb-6">
            <svg class="w-12 h-12 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 class="text-3xl font-bold text-white mb-4">Not Quite Ready Yet</h1>

          <p class="text-white-85 text-lg mb-6">
            {{ notReadyReason }}
          </p>

          <!-- Progress indicators -->
          <div class="bg-brand-glass rounded-card p-6 mb-8 border border-brand-border text-left">
            <h3 class="text-white font-semibold mb-4">Your Progress</h3>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-white-85">Illusions Completed</span>
                <span :class="illusionsCompleted >= 5 ? 'text-green-400' : 'text-yellow-400'">
                  {{ illusionsCompleted }} / 5
                </span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-white-85">Captured Moments</span>
                <span :class="totalMoments >= 3 ? 'text-green-400' : 'text-yellow-400'">
                  {{ totalMoments }} / 3 minimum
                </span>
              </div>
            </div>
          </div>

          <NuxtLink
            to="/dashboard"
            class="btn-primary text-white px-8 py-4 rounded-pill font-semibold shadow-card inline-block text-lg"
          >
            Return to Dashboard
          </NuxtLink>
        </div>
      </div>

      <!-- Step 1: Intro - Already Quit Question -->
      <div v-else-if="currentStep === 'intro'" class="animate-fade-in-up">
        <div class="glass rounded-card p-8 md:p-12 shadow-card border border-brand-border text-center">
          <!-- Celebration icon -->
          <div class="w-24 h-24 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center mx-auto mb-6">
            <svg class="w-12 h-12 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>

          <h1 class="text-4xl font-bold text-white mb-4">The Final Step</h1>

          <p class="text-white-85 text-lg mb-8">
            You've completed all 5 sessions and seen through the illusions that kept you hooked.
            Now it's time to celebrate your freedom.
          </p>

          <!-- Already quit question -->
          <div class="bg-brand-glass rounded-card p-6 mb-8 border border-brand-border">
            <p class="text-white mb-4">Before we begin, one quick question:</p>
            <p class="text-xl font-semibold text-white mb-6">Are you still using nicotine, or have you already stopped?</p>

            <div class="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                class="px-6 py-3 rounded-pill font-semibold transition"
                :class="alreadyQuit === false ? 'btn-primary text-white' : 'bg-brand-glass text-white-85 border border-brand-border hover:bg-brand-glass-input'"
                @click="alreadyQuit = false"
              >
                Still using
              </button>
              <button
                class="px-6 py-3 rounded-pill font-semibold transition"
                :class="alreadyQuit === true ? 'btn-primary text-white' : 'bg-brand-glass text-white-85 border border-brand-border hover:bg-brand-glass-input'"
                @click="alreadyQuit = true"
              >
                Already stopped
              </button>
            </div>
          </div>

          <button
            class="btn-primary text-white px-8 py-4 rounded-pill font-semibold shadow-card text-lg disabled:opacity-50"
            :disabled="alreadyQuit === null"
            @click="startCeremony"
          >
            Begin Ceremony
          </button>

          <p class="text-white-65 text-sm mt-4">This will take about 15 minutes</p>
        </div>
      </div>

      <!-- Step 2: Generating Journey -->
      <div v-else-if="currentStep === 'generating'" class="animate-fade-in-up">
        <div class="glass rounded-card p-8 md:p-12 shadow-card border border-brand-border text-center">
          <div class="inline-block animate-spin rounded-full h-16 w-16 border-4 border-brand-accent border-t-transparent mb-6" />
          <h2 class="text-2xl font-bold text-white mb-4">Creating Your Journey</h2>
          <p class="text-white-65">
            We're weaving together the most powerful moments from your sessions...
          </p>
        </div>
      </div>

      <!-- Step 3: Play Journey -->
      <div v-else-if="currentStep === 'journey'" class="animate-fade-in-up space-y-6">
        <div class="glass rounded-card p-6 md:p-8 shadow-card border border-brand-border">
          <h2 class="text-2xl font-bold text-white mb-2 text-center">Your Journey</h2>
          <p class="text-white-65 text-center mb-6">
            Listen to the story of your transformation
          </p>

          <JourneyPlayer
            v-if="journeySegments.length > 0"
            ref="journeyPlayerRef"
            :segments="journeySegments"
            @complete="onJourneyComplete"
            @error="onJourneyError"
          />
        </div>

        <!-- Skip/Continue button -->
        <div class="text-center">
          <button
            v-if="!journeyCompleted"
            class="text-white-65 hover:text-white transition text-sm underline"
            @click="skipJourney"
          >
            Skip for now
          </button>
          <button
            v-else
            class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card"
            @click="goToRecording"
          >
            Continue to Recording
          </button>
        </div>
      </div>

      <!-- Step 4: Final Recording -->
      <div v-else-if="currentStep === 'recording'" class="animate-fade-in-up space-y-6">
        <div class="glass rounded-card p-6 md:p-8 shadow-card border border-brand-border">
          <h2 class="text-2xl font-bold text-white mb-2 text-center">Your Message</h2>
          <p class="text-white-65 text-center mb-6">
            Record a message to your future self. What would you want to remember if you're ever tempted again?
          </p>

          <!-- Recording states -->
          <div class="space-y-6">
            <!-- Not recorded yet -->
            <div v-if="recordingState === 'idle'" class="text-center">
              <button
                class="w-20 h-20 rounded-full bg-brand-accent flex items-center justify-center mx-auto mb-4 hover:scale-105 transition shadow-card"
                @click="startRecording"
              >
                <svg class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
              <p class="text-white-65">Tap to start recording</p>
            </div>

            <!-- Recording in progress -->
            <div v-else-if="recordingState === 'recording'" class="text-center">
              <div class="relative">
                <button
                  class="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4 animate-pulse hover:scale-105 transition shadow-card"
                  @click="stopRecording"
                >
                  <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
                <!-- Audio level indicator -->
                <div class="absolute -inset-4 rounded-full border-4 border-brand-accent/30 animate-ping pointer-events-none" />
              </div>
              <p class="text-white">Recording... Tap to stop</p>
              <p class="text-white-65 text-sm mt-2">{{ formatRecordingTime(recordingDuration) }}</p>
            </div>

            <!-- Preview mode -->
            <div v-else-if="recordingState === 'preview'" class="space-y-4">
              <div class="bg-brand-glass rounded-card p-4 border border-brand-border">
                <p class="text-white-65 text-sm mb-3">Listen to your message:</p>
                <audio
                  ref="previewAudioRef"
                  :src="previewAudioUrl"
                  controls
                  class="w-full"
                />
              </div>

              <div class="flex flex-col sm:flex-row gap-3">
                <button
                  class="flex-1 px-6 py-3 rounded-pill font-semibold border border-brand-border bg-brand-glass text-white hover:bg-brand-glass-input transition"
                  @click="reRecord"
                >
                  Try Again
                </button>
                <button
                  class="flex-1 btn-primary text-white px-6 py-3 rounded-pill font-semibold"
                  @click="saveRecording"
                >
                  Keep This Recording
                </button>
              </div>
            </div>

            <!-- Saving -->
            <div v-else-if="recordingState === 'saving'" class="text-center">
              <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-accent border-t-transparent mb-4" />
              <p class="text-white-65">Saving your message...</p>
            </div>

            <!-- Saved -->
            <div v-else-if="recordingState === 'saved'" class="text-center">
              <div class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p class="text-white mb-4">Message saved!</p>
              <button
                class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card"
                @click="goToCheatSheet"
              >
                Continue
              </button>
            </div>
          </div>
        </div>

        <!-- Permission error -->
        <div v-if="microphoneError" class="glass rounded-card p-4 border border-red-500/50 text-center">
          <p class="text-red-400 text-sm">{{ microphoneError }}</p>
          <p class="text-white-65 text-sm mt-2">Please allow microphone access to record your message.</p>
        </div>
      </div>

      <!-- Step 5: Cheat Sheet -->
      <div v-else-if="currentStep === 'cheatsheet'" class="animate-fade-in-up space-y-6">
        <div class="glass rounded-card p-6 md:p-8 shadow-card border border-brand-border">
          <h2 class="text-2xl font-bold text-white mb-2 text-center">Your Toolkit</h2>
          <p class="text-white-65 text-center mb-6">
            Quick reference for the illusions you've seen through
          </p>

          <!-- Loading cheat sheet -->
          <div v-if="loadingCheatSheet" class="text-center py-8">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-accent border-t-transparent" />
          </div>

          <!-- Cheat sheet entries -->
          <div v-else-if="cheatSheetEntries.length > 0" class="space-y-4">
            <div
              v-for="entry in cheatSheetEntries"
              :key="entry.illusionKey"
              class="bg-brand-glass rounded-lg p-4 border border-brand-border"
            >
              <h3 class="font-semibold text-white mb-2">{{ entry.name }}</h3>
              <div class="text-sm space-y-2">
                <p>
                  <span class="text-white-65">Illusion:</span>
                  <span class="text-white-85 italic"> "{{ entry.illusion }}"</span>
                </p>
                <p>
                  <span class="text-white-65">Truth:</span>
                  <span class="text-white"> {{ entry.truth }}</span>
                </p>
                <p v-if="entry.userInsight" class="pt-2 border-t border-brand-border mt-2">
                  <span class="text-brand-accent">Your insight:</span>
                  <span class="text-white-85"> "{{ entry.userInsight }}"</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="text-center">
          <button
            class="btn-primary text-white px-8 py-4 rounded-pill font-semibold shadow-card text-lg"
            @click="completeCeremony"
          >
            Complete Ceremony
          </button>
        </div>
      </div>

      <!-- Step 6: Complete -->
      <div v-else-if="currentStep === 'complete'" class="animate-fade-in-up">
        <div class="glass rounded-card p-8 md:p-12 shadow-card border border-brand-border text-center">
          <!-- Success icon -->
          <div class="w-24 h-24 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center mx-auto mb-6">
            <svg class="w-12 h-12 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 class="text-4xl font-bold text-white mb-4">You're Unhooked</h1>

          <p class="text-white-85 text-lg mb-8">
            Congratulations on completing your journey. You've seen through the illusions
            and reclaimed your freedom from nicotine.
          </p>

          <NuxtLink
            to="/dashboard"
            class="btn-primary text-white px-8 py-4 rounded-pill font-semibold shadow-card inline-block text-lg"
          >
            Go to Dashboard
          </NuxtLink>

          <p class="text-white-65 text-sm mt-6">
            Your journey, recording, and toolkit are saved and available on your dashboard.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

interface JourneySegment {
  id: string
  type: 'narration' | 'user_moment'
  text: string
  transcript: string
  duration_ms?: number
  moment_id?: string
}

interface CheatSheetEntry {
  illusionKey: string
  name: string
  illusion: string
  truth: string
  userInsight?: string
}

type CeremonyStep = 'intro' | 'not_ready' | 'generating' | 'journey' | 'recording' | 'cheatsheet' | 'complete'
type RecordingState = 'idle' | 'recording' | 'preview' | 'saving' | 'saved'

// State
const currentStep = ref<CeremonyStep>('intro')
const alreadyQuit = ref<boolean | null>(null)
const isLoading = ref(false)
const loadingMessage = ref('')
const error = ref<string | null>(null)
const isCheckingStatus = ref(true) // Track initial status check loading
const readinessError = ref<string | null>(null) // Store readiness check errors

// Readiness state
const notReadyReason = ref<string | null>(null)
const illusionsCompleted = ref<number>(0)
const totalMoments = ref<number>(0)

// Journey state
const journeySegments = ref<JourneySegment[]>([])
const journeyCompleted = ref(false)
const journeyPlayerRef = ref<{ play: () => void; reset: () => void } | null>(null)

// Recording state
const recordingState = ref<RecordingState>('idle')
const recordingDuration = ref(0)
const previewAudioUrl = ref('')
const previewAudioBlob = ref<Blob | null>(null)
const previewAudioRef = ref<HTMLAudioElement | null>(null)
const microphoneError = ref<string | null>(null)
let recordingInterval: ReturnType<typeof setInterval> | null = null

// Audio recorder
const {
  start: startAudioRecording,
  stop: stopAudioRecording,
  error: recorderError,
} = useAudioRecorder()

// Cheat sheet state
const loadingCheatSheet = ref(false)
const cheatSheetEntries = ref<CheatSheetEntry[]>([])

// Check for existing journey on mount
onMounted(async () => {
  await checkExistingProgress()
})

// Watch recorder error
watch(recorderError, (err: string | null) => {
  if (err) {
    microphoneError.value = err
  }
})

// Check if user has existing ceremony progress and readiness
async function checkExistingProgress() {
  isCheckingStatus.value = true
  readinessError.value = null

  try {
    // First check ceremony preparation/readiness
    const prepareResponse = await $fetch<{
      ready: boolean
      ceremony_completed: boolean
      illusions_completed: string[]
      total_moments: number
    }>('/api/ceremony/prepare')

    // If ceremony is already completed, redirect to dashboard
    if (prepareResponse.ceremony_completed) {
      await navigateTo('/dashboard')
      return
    }

    // Store readiness data
    illusionsCompleted.value = prepareResponse.illusions_completed.length
    totalMoments.value = prepareResponse.total_moments

    // If not ready, show not ready state
    if (!prepareResponse.ready) {
      if (prepareResponse.total_moments < 3) {
        notReadyReason.value = 'You need at least 3 captured moments to begin the ceremony.'
      } else if (prepareResponse.illusions_completed.length < 5) {
        notReadyReason.value = 'Complete all 5 illusion sessions before the ceremony.'
      } else {
        notReadyReason.value = 'You are not yet ready for the ceremony.'
      }
      currentStep.value = 'not_ready'
      return
    }

    // Check for existing journey artifact
    const { status, fetchStatus } = useUserStatus()
    await fetchStatus()

    // If already has journey artifact, load it and skip to journey playback
    if (status.value?.artifacts?.reflective_journey) {
      await loadExistingJourney()
    }
  } catch (err: any) {
    console.error('Error checking ceremony progress:', err)
    readinessError.value = err.data?.message || 'Failed to check ceremony readiness'
    // Allow continuing to intro even if readiness check fails
  } finally {
    isCheckingStatus.value = false
  }
}

// Load existing journey
async function loadExistingJourney() {
  try {
    const response = await $fetch<{
      playlist: { segments: JourneySegment[] }
    }>('/api/ceremony/journey')

    if (response.playlist.segments.length > 0) {
      journeySegments.value = response.playlist.segments
      currentStep.value = 'journey'
    }
  } catch (err) {
    // No existing journey, continue with intro
  }
}

// Start the ceremony
async function startCeremony() {
  if (alreadyQuit.value === null) return

  currentStep.value = 'generating'
  error.value = null

  try {
    const response = await $fetch<{
      journey_text: string
      playlist: { segments: JourneySegment[] }
      artifact_id: string
      selected_moment_count: number
    }>('/api/ceremony/generate-journey', {
      method: 'POST',
      body: {}
    })

    journeySegments.value = response.playlist.segments
    currentStep.value = 'journey'
  } catch (err: any) {
    console.error('Failed to generate journey:', err)
    error.value = err.data?.message || 'Unable to create your journey. Please try again.'
    currentStep.value = 'intro'
  }
}

// Journey events
function onJourneyComplete() {
  journeyCompleted.value = true
}

function onJourneyError(errorMsg: string) {
  console.error('Journey playback error:', errorMsg)
  // Allow continuing even if audio fails
  journeyCompleted.value = true
}

function skipJourney() {
  journeyCompleted.value = true
  goToRecording()
}

function goToRecording() {
  currentStep.value = 'recording'
  recordingState.value = 'idle'
}

// Recording functions
async function startRecording() {
  microphoneError.value = null
  recordingDuration.value = 0

  const started = await startAudioRecording()
  if (!started) {
    microphoneError.value = recorderError.value || 'Failed to start recording'
    return
  }

  recordingState.value = 'recording'

  // Start duration counter
  recordingInterval = setInterval(() => {
    recordingDuration.value++
  }, 1000)
}

async function stopRecording() {
  if (recordingInterval) {
    clearInterval(recordingInterval)
    recordingInterval = null
  }

  const blob = await stopAudioRecording()
  if (!blob) {
    microphoneError.value = 'Failed to capture recording'
    recordingState.value = 'idle'
    return
  }

  previewAudioBlob.value = blob
  previewAudioUrl.value = URL.createObjectURL(blob)
  recordingState.value = 'preview'
}

function reRecord() {
  // Clean up previous preview
  if (previewAudioUrl.value) {
    URL.revokeObjectURL(previewAudioUrl.value)
  }
  previewAudioBlob.value = null
  previewAudioUrl.value = ''
  recordingDuration.value = 0
  recordingState.value = 'idle'
}

async function saveRecording() {
  if (!previewAudioBlob.value) return

  recordingState.value = 'saving'

  try {
    const formData = new FormData()
    formData.append('audio', previewAudioBlob.value, 'final-recording.webm')
    formData.append('transcript', '') // Transcript would come from STT in production
    formData.append('is_preview', 'false')

    await $fetch('/api/ceremony/save-final-recording', {
      method: 'POST',
      body: formData,
    })

    recordingState.value = 'saved'
  } catch (err: any) {
    console.error('Failed to save recording:', err)
    error.value = err.data?.message || 'Failed to save your recording. Please try again.'
    recordingState.value = 'preview'
  }
}

function goToCheatSheet() {
  currentStep.value = 'cheatsheet'
  loadCheatSheet()
}

// Load cheat sheet
async function loadCheatSheet() {
  loadingCheatSheet.value = true

  try {
    const response = await $fetch<{
      cheat_sheet: {
        entries: CheatSheetEntry[]
      }
    }>('/api/ceremony/cheat-sheet')

    cheatSheetEntries.value = response.cheat_sheet.entries
  } catch (err: any) {
    console.error('Failed to load cheat sheet:', err)
    // Continue anyway, cheat sheet is not critical
  } finally {
    loadingCheatSheet.value = false
  }
}

// Complete ceremony
async function completeCeremony() {
  isLoading.value = true
  loadingMessage.value = 'Completing your ceremony...'

  try {
    await $fetch('/api/ceremony/complete', {
      method: 'POST',
      body: {
        already_quit: alreadyQuit.value || false
      }
    })

    currentStep.value = 'complete'
  } catch (err: any) {
    console.error('Failed to complete ceremony:', err)
    error.value = err.data?.message || 'Unable to complete ceremony. Your progress has been saved.'
  } finally {
    isLoading.value = false
  }
}

// Retry current step
function retryCurrentStep() {
  error.value = null

  switch (currentStep.value) {
    case 'generating':
      startCeremony()
      break
    case 'journey':
      journeyPlayerRef.value?.reset()
      break
    case 'recording':
      recordingState.value = 'idle'
      break
    case 'cheatsheet':
      loadCheatSheet()
      break
    case 'complete':
      completeCeremony()
      break
    default:
      // Reset to intro for intro step
      currentStep.value = 'intro'
  }
}

// Format recording time
function formatRecordingTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Cleanup on unmount
onUnmounted(() => {
  if (recordingInterval) {
    clearInterval(recordingInterval)
  }
  if (previewAudioUrl.value) {
    URL.revokeObjectURL(previewAudioUrl.value)
  }
})
</script>
