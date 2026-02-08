<template>
  <div
    class="ceremony-recording-inline glass rounded-card p-6 shadow-card border border-brand-border"
    :class="animationClass"
  >
    <!-- Idle state - Ready to record -->
    <div v-if="state === 'idle'" class="text-center">
      <button
        aria-label="Ready to record"
        class="w-20 h-20 rounded-full bg-brand-accent flex items-center justify-center mx-auto mb-4 hover:scale-105 transition shadow-card"
        @click="startRecording"
      >
        <svg class="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
        </svg>
      </button>
      <p class="text-white-65 mb-2">Tap when you're ready</p>
      <button
        class="text-white-65 hover:text-white transition text-sm underline"
        @click="switchToText"
      >
        or type your message
      </button>
    </div>

    <!-- Recording state - In progress -->
    <div v-else-if="state === 'recording'" class="text-center">
      <div class="relative">
        <button
          aria-label="Recording in progress"
          class="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center mx-auto mb-4 animate-pulse hover:scale-105 transition shadow-card"
          @click="stopRecording"
        >
          <svg class="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
        <div class="absolute -inset-4 rounded-full border-4 border-brand-accent/30 animate-ping pointer-events-none" />
      </div>
      <p class="text-white mb-2">Recording... Tap to stop</p>
      <p class="text-white-65 text-sm">{{ formatTime(elapsedSeconds) }} / 5:00</p>
    </div>

    <!-- Preview state - Playback -->
    <div v-else-if="state === 'preview'" class="space-y-4">
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
          @click="tryAgain"
        >
          Try again
        </button>
        <button
          class="flex-1 btn-primary text-white px-6 py-3 rounded-pill font-semibold"
          @click="keepRecording"
        >
          Keep this recording
        </button>
      </div>
    </div>

    <!-- Saving state - Upload in progress -->
    <div v-else-if="state === 'saving'" class="text-center">
      <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-accent border-t-transparent mb-4" />
      <p class="text-white-65">Saving your message...</p>
    </div>

    <!-- Saved state - Success confirmation -->
    <div v-else-if="state === 'saved'" class="text-center">
      <div
        aria-label="Recording saved"
        class="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
      >
        <svg class="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p class="text-white">Message saved!</p>
    </div>

    <!-- Text input fallback -->
    <div v-else-if="state === 'text'" class="space-y-4">
      <p class="text-white-65 text-sm mb-3">Type your message to your future self:</p>
      <textarea
        ref="textInputRef"
        v-model="textMessage"
        class="w-full bg-brand-glass-input text-white border border-brand-border rounded-card p-4 min-h-[120px] focus:outline-none focus:border-brand-border-strong transition"
        placeholder="What would you want to remember if you're ever tempted again?"
        maxlength="1000"
      />
      <div class="flex justify-between items-center">
        <button
          class="text-white-65 hover:text-white transition text-sm underline"
          @click="backToRecording"
        >
          Record instead
        </button>
        <button
          class="btn-primary text-white px-6 py-3 rounded-pill font-semibold"
          :disabled="!textMessage.trim()"
          @click="saveText"
        >
          Save message
        </button>
      </div>
    </div>

    <!-- Error message -->
    <div v-if="errorMessage" class="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded-card text-center">
      <p class="text-red-400 text-sm">{{ errorMessage }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
type RecordingState = 'idle' | 'recording' | 'preview' | 'saving' | 'saved' | 'text'

const FIVE_MINUTES_MS = 5 * 60 * 1000
const MAX_BLOB_SIZE_MB = 10
const MAX_BLOB_SIZE_BYTES = MAX_BLOB_SIZE_MB * 1024 * 1024
const MAX_RETRY_ATTEMPTS = 3

// State
const state = ref<RecordingState>('idle')
const elapsedSeconds = ref(0)
const previewAudioUrl = ref('')
const previewAudioBlob = ref<Blob | null>(null)
const errorMessage = ref<string | null>(null)
const textMessage = ref('')

// Refs
const previewAudioRef = ref<HTMLAudioElement | null>(null)
const textInputRef = ref<HTMLTextAreaElement | null>(null)

// Audio recorder
const {
  start: startAudioRecording,
  stop: stopAudioRecording,
  error: recorderError,
} = useAudioRecorder()

// Timer
let recordingInterval: ReturnType<typeof setInterval> | null = null
let autoStopTimeout: ReturnType<typeof setTimeout> | null = null

// Emit events
const emit = defineEmits<{
  'audio-saved': [path: string]
  'text-saved': [text: string]
  'error': [message: string]
}>()

// Animation class for slide-in/out
const animationClass = computed(() => {
  const prefersReducedMotion = import.meta.client
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false

  return prefersReducedMotion ? '' : 'animate-fade-in-up'
})

// Watch recorder error
watch(recorderError, (err: string | null) => {
  if (err) {
    errorMessage.value = err
    // Auto-switch to text input if MediaRecorder fails
    if (state.value === 'recording') {
      cleanup()
      state.value = 'text'
      nextTick(() => {
        textInputRef.value?.focus()
      })
    }
  }
})

// Start recording
async function startRecording() {
  errorMessage.value = null
  elapsedSeconds.value = 0

  const started = await startAudioRecording()
  if (!started) {
    errorMessage.value = recorderError.value || 'Failed to start recording'
    // Auto-switch to text input if can't start recording
    state.value = 'text'
    nextTick(() => {
      textInputRef.value?.focus()
    })
    return
  }

  state.value = 'recording'

  // Start elapsed time counter
  recordingInterval = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)

  // Auto-stop at 5 minutes
  autoStopTimeout = setTimeout(() => {
    stopRecording()
  }, FIVE_MINUTES_MS)
}

// Stop recording
async function stopRecording() {
  cleanup()

  const blob = await stopAudioRecording()
  if (!blob) {
    errorMessage.value = 'Failed to capture recording'
    state.value = 'idle'
    return
  }

  // Check blob size
  if (blob.size > MAX_BLOB_SIZE_BYTES) {
    errorMessage.value = `Recording too large (${(blob.size / 1024 / 1024).toFixed(1)}MB). Please record a shorter message.`
    state.value = 'idle'
    return
  }

  previewAudioBlob.value = blob
  previewAudioUrl.value = URL.createObjectURL(blob)
  state.value = 'preview'
}

// Try again - discard and return to idle
function tryAgain() {
  if (previewAudioUrl.value) {
    URL.revokeObjectURL(previewAudioUrl.value)
  }
  previewAudioBlob.value = null
  previewAudioUrl.value = ''
  errorMessage.value = null
  state.value = 'idle'
}

// Keep this recording - trigger upload
async function keepRecording() {
  if (!previewAudioBlob.value) return

  state.value = 'saving'
  errorMessage.value = null

  const uploadSuccess = await uploadRecordingWithRetry(previewAudioBlob.value)

  if (!uploadSuccess) {
    // All retries failed - save to localStorage as fallback
    await saveToLocalStorage(previewAudioBlob.value)
    // Still emit success so ceremony continues
    emit('audio-saved', '') // Empty path indicates pending upload
  }

  state.value = 'saved'
}

// Upload recording with retry logic
async function uploadRecordingWithRetry(blob: Blob): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const formData = new FormData()
      formData.append('audio', blob, 'final-recording.webm')
      formData.append('transcript', '')
      formData.append('is_preview', 'false')

      const response = await $fetch<{ audio_path: string }>('/api/ceremony/save-final-recording', {
        method: 'POST',
        body: formData,
      })

      // Success! Emit the audio path
      emit('audio-saved', response.audio_path)
      return true
    } catch (err: any) {
      console.error(`[CeremonyRecordingInline] Upload attempt ${attempt}/${MAX_RETRY_ATTEMPTS} failed:`, err)

      if (attempt === MAX_RETRY_ATTEMPTS) {
        // All retries exhausted
        return false
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }

  return false
}

// Save to localStorage as fallback
async function saveToLocalStorage(blob: Blob) {
  try {
    const user = useSupabaseUser()
    if (!user.value?.id) {
      console.error('[CeremonyRecordingInline] No user ID for localStorage fallback')
      return
    }

    // Convert blob to base64 data URL
    const reader = new FileReader()
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    const pendingUpload = {
      userId: user.value.id,
      blobDataUrl: dataUrl,
      timestamp: new Date().toISOString(),
      retryCount: 3, // Already tried 3 times
    }

    localStorage.setItem('unhooked:pending-ceremony-upload', JSON.stringify(pendingUpload))
    console.log('[CeremonyRecordingInline] Saved recording to localStorage for retry')
  } catch (err) {
    console.error('[CeremonyRecordingInline] Failed to save to localStorage:', err)
  }
}

// Switch to text input
function switchToText() {
  state.value = 'text'
  errorMessage.value = null
  nextTick(() => {
    textInputRef.value?.focus()
  })
}

// Back to recording from text
function backToRecording() {
  state.value = 'idle'
  textMessage.value = ''
  errorMessage.value = null
}

// Save text message
function saveText() {
  if (!textMessage.value.trim()) return
  emit('text-saved', textMessage.value.trim())
  state.value = 'saved'
}

// Format time as mm:ss
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// Cleanup timers and resources
function cleanup() {
  if (recordingInterval) {
    clearInterval(recordingInterval)
    recordingInterval = null
  }
  if (autoStopTimeout) {
    clearTimeout(autoStopTimeout)
    autoStopTimeout = null
  }
}

// Cleanup on unmount
onUnmounted(() => {
  cleanup()
  if (previewAudioUrl.value) {
    URL.revokeObjectURL(previewAudioUrl.value)
  }
})
</script>

<style scoped>
.ceremony-recording-inline {
  /* Ensure the component has a smooth transition */
  transition: all 0.3s ease-out;
}

/* Respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .ceremony-recording-inline {
    transition: none;
  }
}
</style>
