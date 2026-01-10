<script setup lang="ts">
/**
 * Check-In Interstitial Modal
 * Shown as an overlay when user has a pending check-in
 * Dismissal: swipe down on mobile, click outside on desktop
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
}>()

// Handle backdrop click
function handleBackdropClick(e: MouseEvent) {
  if (e.target === e.currentTarget) {
    emit('dismiss')
  }
}

// Handle skip
function handleSkip() {
  emit('skip', props.checkIn.id)
}

// Handle respond
function handleRespond() {
  emit('respond', props.checkIn.id)
}

// Touch handling for swipe down dismissal
let touchStartY = 0
let currentTranslateY = 0
const modalRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)

function handleTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0].clientY
  isDragging.value = true
}

function handleTouchMove(e: TouchEvent) {
  if (!isDragging.value) return

  const deltaY = e.touches[0].clientY - touchStartY
  if (deltaY > 0) {
    currentTranslateY = deltaY
    if (modalRef.value) {
      modalRef.value.style.transform = `translateY(${deltaY}px)`
    }
  }
}

function handleTouchEnd() {
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
        <!-- Drag handle (mobile only) -->
        <div class="md:hidden flex justify-center mb-4">
          <div class="w-12 h-1 bg-white/30 rounded-full"></div>
        </div>

        <!-- Content -->
        <div class="text-center mb-6">
          <p class="eyebrow text-white mb-2">QUICK THOUGHT FOR YOU...</p>
        </div>

        <div class="mb-8">
          <p class="text-xl text-white text-center leading-relaxed">{{ checkIn.prompt }}</p>
        </div>

        <!-- Voice response button -->
        <div class="flex flex-col items-center gap-4">
          <button
            @click="handleRespond"
            class="w-20 h-20 rounded-full bg-brand-accent/20 flex items-center justify-center hover:bg-brand-accent/30 transition"
          >
            <svg class="w-10 h-10 text-brand-accent" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
            </svg>
          </button>
          <p class="text-white-65 text-sm">Tap to respond</p>
        </div>

        <!-- Skip link -->
        <div class="mt-6 text-center">
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
</style>
