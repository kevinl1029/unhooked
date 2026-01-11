<script setup lang="ts">
/**
 * Check-In Interstitial Modal
 * Shown as an overlay when user has a pending check-in
 * Supports inline voice recording without navigation
 * Dismissal: swipe down on mobile, click outside on desktop (only in ready state)
 */

interface CheckIn {
  id: string
  prompt: string
  type: string
}

const props = defineProps<{
  checkIn: CheckIn
}>()

const emit = defineEmits<{
  dismiss: []
  skip: [id: string]
  respond: [id: string]
  complete: [id: string, conversationId: string | null]
}>()

// Check-in states
type CheckInState = 'ready' | 'recording' | 'processing' | 'speaking' | 'complete'
const state = ref<CheckInState>('ready')

// Toast state
const showToast = ref(false)

// Voice chat - initialized on mount
let voiceChat: ReturnType<typeof useVoiceChat> | null = null

// Audio level for waveform
const audioLevel = ref(0)
let audioLevelFrame: number | null = null

const updateAudioLevel = () => {
  if (voiceChat?.isRecording.value) {
    audioLevel.value = voiceChat.getAudioLevel()
    audioLevelFrame = requestAnimationFrame(updateAudioLevel)
  }
}

onMounted(() => {
  // Initialize voice chat
  voiceChat = useVoiceChat({
    sessionType: 'check_in',
    checkInId: props.checkIn.id,
    checkInPrompt: props.checkIn.prompt,
  })

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

  // Watch AI speaking state (for UI updates only)
  watch(voiceChat.isAISpeaking, (speaking) => {
    if (speaking) {
      state.value = 'speaking'
    }
  })
})

onUnmounted(() => {
  if (audioLevelFrame) {
    cancelAnimationFrame(audioLevelFrame)
  }
})

// Handle backdrop click - only dismiss in ready state
function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget && state.value === 'ready') {
    emit('dismiss')
  }
}

// Handle skip
function handleSkip() {
  emit('skip', props.checkIn.id)
}

// Handle complete (after voice response)
async function handleComplete() {
  state.value = 'complete'

  // Mark check-in as complete
  const responseConversationId = voiceChat?.conversationId.value

  try {
    await $fetch(`/api/check-ins/${props.checkIn.id}/complete`, {
      method: 'POST',
      body: {
        response_conversation_id: responseConversationId || undefined,
      },
    })
  } catch (err) {
    console.error('[check-in-interstitial] Failed to mark complete:', err)
  }

  // Show toast briefly then emit complete
  showToast.value = true
  await new Promise(resolve => setTimeout(resolve, 1500))

  emit('complete', props.checkIn.id, responseConversationId || null)
}

// Handle mic tap
async function handleMicTap() {
  if (!voiceChat) return

  if (voiceChat.isRecording.value) {
    // Stop recording and send - wait for full completion
    const success = await voiceChat.stopRecordingAndSend()
    if (success) {
      await handleComplete()
    }
  } else {
    // Start recording
    await voiceChat.recordAndSend()
  }
}

// Touch handling for swipe down dismissal (only in ready state)
let touchStartY = 0
let currentTranslateY = 0
const modalRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

function handleTouchStart(e: TouchEvent) {
  if (state.value !== 'ready') return
  touchStartY = e.touches[0].clientY
  isDragging.value = true
}

function handleTouchMove(e: TouchEvent) {
  if (!isDragging.value || state.value !== 'ready') return

  const deltaY = e.touches[0].clientY - touchStartY
  if (deltaY > 0) {
    currentTranslateY = deltaY
    if (modalRef.value) {
      modalRef.value.style.transform = `translateY(${deltaY}px)`
    }
  }
}

function handleTouchEnd() {
  if (state.value !== 'ready') {
    isDragging.value = false
    return
  }

  isDragging.value = false

  // If dragged more than 100px, dismiss
  if (currentTranslateY > 100) {
    emit('dismiss')
  } else if (modalRef.value) {
    modalRef.value.style.transform = 'translateY(0)'
  }

  currentTranslateY = 0
}
</script>

<template>
  <Teleport to="body">
    <!-- Toast notification -->
    <Transition name="toast">
      <div
        v-if="showToast"
        class="fixed top-6 left-1/2 -translate-x-1/2 z-[60] glass rounded-pill px-6 py-3 shadow-card border border-brand-border flex items-center gap-3"
      >
        <div class="w-6 h-6 rounded-full bg-brand-accent/20 flex items-center justify-center">
          <svg class="w-4 h-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span class="text-white font-medium">Thanks for sharing</span>
      </div>
    </Transition>

    <div
      class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      @click="handleBackdropClick"
    >
      <div
        ref="modalRef"
        class="w-full md:max-w-md glass rounded-t-3xl md:rounded-card p-8 shadow-card border border-brand-border animate-slide-up"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <!-- Drag handle (mobile only, only in ready state) -->
        <div v-if="state === 'ready'" class="md:hidden flex justify-center mb-4">
          <div class="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        <!-- Content -->
        <div class="text-center mb-6">
          <p class="eyebrow text-white mb-2">QUICK THOUGHT FOR YOU...</p>
        </div>

        <div class="mb-8">
          <p class="text-xl text-white text-center leading-relaxed">{{ checkIn.prompt }}</p>
        </div>

        <!-- Voice response area -->
        <div class="flex flex-col items-center gap-4">
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

          <!-- Mic button (ready or recording) -->
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

          <!-- State labels -->
          <p v-if="state === 'ready'" class="text-white-65 text-sm">Tap to respond</p>
          <p v-else-if="state === 'recording'" class="text-white-65 text-sm">Tap to stop</p>
          <p v-else-if="state === 'processing'" class="text-white-65 text-sm">Processing...</p>
        </div>

        <!-- Skip link (only in ready state) -->
        <div v-if="state === 'ready'" class="mt-6 text-center">
          <button
            @click="handleSkip"
            class="text-white-65 hover:text-white text-sm underline transition"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.animate-slide-up {
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

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
