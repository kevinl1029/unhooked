<script setup lang="ts">
/**
 * Check-in page (direct access by ID)
 * For when user accesses check-in from dashboard interstitial or magic link
 * Prompt is passed via query param to avoid redundant API fetch
 */

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const checkInId = route.params.id as string
const promptFromQuery = route.query.prompt as string | undefined

// Check-in states
type CheckInState = 'loading' | 'error' | 'ready' | 'recording' | 'processing' | 'speaking' | 'complete'
const state = ref<CheckInState>('loading')
const errorMessage = ref('')

// The prompt - from query or fetched from API as fallback
const prompt = ref<string>('')

// Toast state
const showToast = ref(false)

// Voice chat - will be initialized in onMounted
let voiceChat: ReturnType<typeof useVoiceChat> | null = null
let preInitAudio: (() => Promise<void>) | null = null

// Audio level for waveform
const audioLevel = ref(0)
let audioLevelFrame: number | null = null

const updateAudioLevel = () => {
  if (voiceChat?.isRecording.value) {
    audioLevel.value = voiceChat.getAudioLevel()
    audioLevelFrame = requestAnimationFrame(updateAudioLevel)
  }
}

onMounted(async () => {
  // If prompt came from query (interstitial or magic link flow), use it directly
  if (promptFromQuery) {
    prompt.value = decodeURIComponent(promptFromQuery)
  } else {
    // Fallback: fetch from API (direct URL access edge case)
    try {
      const response = await $fetch<{ check_in: any; prompt: string }>(`/api/check-ins/${checkInId}`)
      prompt.value = response.prompt
    } catch (err: any) {
      errorMessage.value = err.data?.message || 'Check-in not found'
      state.value = 'error'
      return
    }
  }

  // Initialize voice chat once we have the prompt
  voiceChat = useVoiceChat({
    sessionType: 'check_in',
    checkInId: checkInId,
    checkInPrompt: prompt.value,
  })

  // Destructure preInitAudio for use in gesture handlers
  preInitAudio = voiceChat.preInitAudio

  // Set up watchers now that voiceChat is initialized
  // Watch recording state
  watch(voiceChat.isRecording, (recording) => {
    if (recording) {
      state.value = 'recording'
      updateAudioLevel()
    } else {
      if (audioLevelFrame) {
        cancelAnimationFrame(audioLevelFrame)
        audioLevelFrame = null
      }
      audioLevel.value = 0
    }
  })

  // Watch processing/transcribing state
  watch(voiceChat.isProcessing, (processing) => {
    if (processing && state.value === 'recording') {
      state.value = 'processing'
    }
  })

  // Watch AI speaking state (for UI updates only, not for triggering completion)
  watch(voiceChat.isAISpeaking, (speaking) => {
    if (speaking) {
      state.value = 'speaking'
    }
    // Note: We don't trigger handleComplete here anymore - it's called after stopRecordingAndSend completes
  })

  // Ready for user to respond
  state.value = 'ready'
})

// Handle skip
async function handleSkip() {
  await $fetch(`/api/check-ins/${checkInId}/skip`, { method: 'POST' })
  await navigateTo('/dashboard')
}

// Handle complete (after voice response)
async function handleComplete() {
  state.value = 'complete'

  // Mark check-in as complete - always call API, include conversationId if available
  const responseConversationId = voiceChat?.conversationId.value

  try {
    await $fetch(`/api/check-ins/${checkInId}/complete`, {
      method: 'POST',
      body: {
        response_conversation_id: responseConversationId || undefined,
      },
    })
  } catch (err) {
    console.error('[check-in] Failed to mark complete:', err)
    // Still show toast and navigate even if API fails
  }

  // Show toast and navigate
  showToast.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))
  await navigateTo('/dashboard')
}

// Handle mic tap
async function handleMicTap() {
  if (!voiceChat || !preInitAudio) return

  if (voiceChat.isRecording.value) {
    // Pre-initialize audio in user gesture context before stopping recording
    await preInitAudio()
    // Stop recording and send - wait for full completion including AI response
    const success = await voiceChat.stopRecordingAndSend()
    if (success) {
      await handleComplete()
    }
  } else {
    // Pre-initialize audio in user gesture context before starting recording
    await preInitAudio()
    // Start recording
    await voiceChat.recordAndSend()
  }
}

onUnmounted(() => {
  if (audioLevelFrame) {
    cancelAnimationFrame(audioLevelFrame)
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <!-- Toast notification -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="showToast"
          class="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass rounded-pill px-6 py-3 shadow-card border border-brand-border flex items-center gap-3"
        >
          <div class="w-6 h-6 rounded-full bg-brand-accent/20 flex items-center justify-center">
            <svg class="w-4 h-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span class="text-white font-medium">Thanks for sharing</span>
        </div>
      </Transition>
    </Teleport>

    <!-- Loading state -->
    <div v-if="state === 'loading'" class="text-center">
      <div class="animate-pulse">
        <div class="w-16 h-16 rounded-full bg-brand-glass mx-auto mb-4"></div>
        <p class="text-white-65">Loading check-in...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="state === 'error'" class="glass rounded-card p-8 shadow-card border border-brand-border max-w-md text-center">
      <h1 class="text-xl font-semibold text-white mb-4">Check-in Not Found</h1>
      <p class="text-white-65 mb-6">{{ errorMessage || 'This check-in doesn\'t exist or has been completed.' }}</p>
      <NuxtLink
        to="/dashboard"
        class="btn-primary inline-block text-white px-6 py-3 rounded-pill font-semibold shadow-card"
      >
        Return to Dashboard
      </NuxtLink>
    </div>

    <!-- Check-in content -->
    <div v-else-if="prompt" class="glass rounded-card p-8 shadow-card border border-brand-border max-w-md w-full animate-fade-in-up">
      <!-- Prompt display -->
      <div class="text-center mb-8">
        <p class="eyebrow text-white mb-2">CHECK-IN</p>
        <h1 class="text-2xl font-bold text-white">{{ prompt }}</h1>
      </div>

      <!-- Voice response area -->
      <div class="flex flex-col items-center gap-6">
        <!-- Recording waveform -->
        <div v-if="state === 'recording'" class="w-full mb-2">
          <VoiceAudioWaveform
            :is-active="true"
            :audio-level="audioLevel"
            :bar-count="12"
            container-class="h-10"
            active-bar-class="bg-gradient-to-t from-red-500 to-red-400"
          />
        </div>

        <!-- AI Speaking response waveform -->
        <div v-else-if="state === 'speaking'" class="w-full mb-2">
          <VoiceAudioWaveform
            :is-active="true"
            :audio-level="0.6"
            :bar-count="12"
            container-class="h-10"
          />
        </div>

        <!-- Mic button -->
        <button
          v-if="state === 'ready' || state === 'recording'"
          @click="handleMicTap"
          :class="[
            'w-20 h-20 rounded-full flex items-center justify-center transition',
            state === 'recording'
              ? 'bg-red-500/30 border-2 border-red-500 animate-pulse'
              : 'bg-brand-accent/20 hover:bg-brand-accent/30'
          ]"
        >
          <svg
            class="w-10 h-10"
            :class="state === 'recording' ? 'text-red-400' : 'text-brand-accent'"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
          </svg>
        </button>

        <!-- Processing spinner -->
        <div v-else-if="state === 'processing'" class="w-20 h-20 rounded-full bg-brand-glass flex items-center justify-center">
          <div class="w-8 h-8 border-2 border-white-65 border-t-white rounded-full animate-spin"></div>
        </div>

        <!-- Speaking indicator -->
        <div v-else-if="state === 'speaking'" class="text-center">
          <p class="text-white-65 text-sm">Listening...</p>
        </div>

        <p v-if="state === 'ready'" class="text-white-65 text-sm">Tap to respond</p>
        <p v-else-if="state === 'recording'" class="text-white-65 text-sm">Tap to stop</p>
        <p v-else-if="state === 'processing'" class="text-white-65 text-sm">Processing...</p>
      </div>

      <!-- Skip link -->
      <div v-if="state === 'ready'" class="mt-8 text-center">
        <button
          @click="handleSkip"
          class="text-white-65 hover:text-white text-sm underline transition"
        >
          Skip for now
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.toast-enter-active {
  animation: toastIn 0.3s ease-out;
}

.toast-leave-active {
  animation: toastOut 0.3s ease-in;
}

@keyframes toastIn {
  from {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@keyframes toastOut {
  from {
    opacity: 1;
    transform: translate(-50%, 0);
  }
  to {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
}
</style>
