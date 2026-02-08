<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <!-- Loading state -->
    <div v-if="isCheckingStatus" class="max-w-2xl w-full">
      <div class="glass rounded-card p-8 shadow-card border border-brand-border text-center animate-fade-in-up">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-accent border-t-transparent mb-4" />
        <p class="text-white-65">Loading...</p>
      </div>
    </div>

    <!-- Pre-ceremony screen -->
    <div v-else-if="ceremonyPhase === 'pre-ceremony'" class="max-w-2xl w-full">
      <div class="glass rounded-card p-8 md:p-12 shadow-card border border-brand-border text-center animate-fade-in-up">
        <!-- Celebration icon -->
        <div class="w-24 h-24 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>

        <p class="eyebrow text-white mb-4">YOUR FINAL SESSION</p>

        <h1 class="text-4xl md:text-5xl font-bold text-white mb-8">The Ceremony</h1>

        <div class="text-left space-y-4 mb-8 max-w-md mx-auto">
          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-brand-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
              <svg class="w-4 h-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p class="text-white-85 text-lg">Set aside 15 minutes.</p>
          </div>

          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-brand-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
              <svg class="w-4 h-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p class="text-white-85 text-lg">Find a quiet space.</p>
          </div>

          <div class="flex items-start gap-3">
            <div class="w-6 h-6 rounded-full bg-brand-accent/20 flex items-center justify-center flex-shrink-0 mt-1">
              <svg class="w-4 h-4 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p class="text-white-85 text-lg">
              If you still have your {{ productDisplayText }} around, have it nearby.
            </p>
          </div>
        </div>

        <p class="text-white-65 text-lg mb-8 italic">
          This is a moment worth being present for.
        </p>

        <button
          class="btn-primary text-white px-8 py-4 rounded-pill font-semibold shadow-card text-lg"
          @click="beginCeremony"
        >
          Begin Ceremony
        </button>
      </div>
    </div>

    <!-- Conversation phase -->
    <div v-else-if="ceremonyPhase === 'conversation' || ceremonyPhase === 'recording'" class="w-full h-screen flex flex-col">
      <SessionView
        ref="sessionViewRef"
        session-type="ceremony"
        :existing-conversation-id="conversationId"
        @recording-prompt="handleRecordingPrompt"
        @session-complete="handleSessionComplete"
      />

      <!-- Inline recording component (slides in when phase === 'recording') -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        leave-active-class="transition-all duration-300 ease-in"
        enter-from-class="opacity-0 translate-y-8"
        enter-to-class="opacity-100 translate-y-0"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-8"
      >
        <div v-if="ceremonyPhase === 'recording'" class="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-brand-bg-dark via-brand-bg-dark/95 to-transparent pointer-events-none">
          <div class="pointer-events-auto max-w-2xl mx-auto">
            <CeremonyRecordingInline
              @audio-saved="handleRecordingSaved"
              @text-saved="handleTextSaved"
              @error="handleRecordingError"
            />
          </div>
        </div>
      </Transition>
    </div>

    <!-- Completing/transitioning phase -->
    <div
      v-else-if="ceremonyPhase === 'completing' || ceremonyPhase === 'transitioning'"
      class="max-w-2xl w-full transition-opacity duration-1000"
      :class="{ 'opacity-0': ceremonyPhase === 'transitioning' && !prefersReducedMotion }"
    >
      <div class="glass rounded-card p-8 shadow-card border border-brand-border text-center animate-fade-in-up">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-accent border-t-transparent mb-4" />
        <p class="text-white-85 text-lg mb-2">{{ ceremonyPhase === 'completing' ? 'Completing ceremony...' : 'Transitioning to your dashboard...' }}</p>
        <p class="text-white-65 text-sm">{{ ariaAnnouncement }}</p>
      </div>
    </div>

    <!-- Error phase -->
    <div v-else-if="ceremonyPhase === 'error'" class="max-w-2xl w-full">
      <div class="glass rounded-card p-8 md:p-12 shadow-card border border-brand-border text-center animate-fade-in-up">
        <div class="w-24 h-24 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 class="text-2xl font-bold text-white mb-4">Something went wrong</h2>
        <p class="text-white-85 mb-8">{{ error || 'Your ceremony will be ready when you come back.' }}</p>

        <button
          class="btn-primary text-white px-8 py-4 rounded-pill font-semibold shadow-card text-lg"
          @click="handleLeave"
        >
          Return to Dashboard
        </button>
      </div>
    </div>

    <!-- Exit dialog -->
    <CeremonyExitDialog
      :open="showExitDialog"
      @leave="handleLeave"
      @stay="handleStay"
    />

    <!-- ARIA live region for announcements -->
    <div aria-live="polite" aria-atomic="true" class="sr-only">
      {{ ariaAnnouncement }}
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'ceremony'
})

// Lazy-load CeremonyRecordingInline component (only loaded when Part 6 is reached)
const CeremonyRecordingInline = defineAsyncComponent(
  () => import('~/components/CeremonyRecordingInline.vue')
)

// Ceremony orchestration
const {
  ceremonyPhase,
  conversationId,
  isRecording,
  showExitDialog,
  error,
  ariaAnnouncement,
  startCeremony,
  handleRecordingPrompt,
  handleRecordingSaved,
  handleTextSaved,
  handleSessionComplete,
  handleEscapeKey: toggleExitDialog,
  handleLeave,
  handleStay,
} = useCeremony()

// Local state for pre-ceremony screen
const isCheckingStatus = ref(true)
const productType = ref<string | null>(null)

// Template ref for SessionView (to call pause/resume methods)
const sessionViewRef = ref<{ pause: () => void; resume: () => void } | null>(null)

// Check if user prefers reduced motion
const prefersReducedMotion = ref(false)

// Computed product display text
const productDisplayText = computed(() => {
  if (!productType.value) {
    return 'nicotine products'
  }

  // Convert product_types array to friendly display text
  const productTypes = Array.isArray(productType.value) ? productType.value : [productType.value]

  // Map common product types to friendly names
  const friendlyNames: Record<string, string> = {
    'vape': 'vape',
    'cigarettes': 'cigarettes',
    'cigars': 'cigars',
    'chewing_tobacco': 'chewing tobacco',
    'nicotine_gum': 'nicotine gum',
    'nicotine_patches': 'nicotine patches',
    'pouches': 'pouches',
    'snus': 'snus'
  }

  const names = productTypes.map(p => friendlyNames[p] || p)

  if (names.length === 1) {
    return names[0]
  } else if (names.length === 2) {
    return `${names[0]} or ${names[1]}`
  } else {
    return 'nicotine products'
  }
})

// Check status and redirect if needed
onMounted(async () => {
  await checkCeremonyEligibility()

  // Add Escape key listener for exit dialog
  document.addEventListener('keydown', handleEscapeKeyPress)

  // Check prefers-reduced-motion
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

async function checkCeremonyEligibility() {
  try {
    // Fetch user progress to check program_status
    const { data: progress, error: progressError } = await useFetch('/api/progress')

    if (progressError.value) {
      console.error('Error fetching progress:', progressError.value)
      // On error, stay on page - user might be eligible
      isCheckingStatus.value = false
      return
    }

    const programStatus = progress.value?.program_status

    // If already completed, redirect to dashboard
    if (programStatus === 'completed') {
      await navigateTo('/dashboard', { replace: true })
      return
    }

    // If not ceremony_ready, redirect to dashboard
    if (programStatus !== 'ceremony_ready') {
      await navigateTo('/dashboard', { replace: true })
      return
    }

    // Fetch product type from user intake
    const { data: intake } = await useFetch('/api/intake')
    if (intake.value?.product_types) {
      productType.value = intake.value.product_types
    }

    // User is ceremony_ready - show pre-ceremony screen
    isCheckingStatus.value = false
  } catch (err) {
    console.error('Error checking ceremony eligibility:', err)
    // On error, show pre-ceremony screen (graceful degradation)
    isCheckingStatus.value = false
  }
}

// Begin ceremony - calls useCeremony().startCeremony()
async function beginCeremony() {
  await startCeremony()
}

// Handle recording prompt - pause SessionView and transition to recording phase
function handleRecordingPromptEvent() {
  // Pause the SessionView (disables input)
  if (sessionViewRef.value) {
    sessionViewRef.value.pause()
  }

  // Transition to recording phase (shows CeremonyRecordingInline)
  handleRecordingPrompt()
}

// Handle recording saved - resume SessionView and transition back to conversation
function handleRecordingSavedEvent(path?: string) {
  // Resume the SessionView (re-enables input)
  if (sessionViewRef.value) {
    sessionViewRef.value.resume()
  }

  // Transition back to conversation phase
  handleRecordingSaved(path)
}

// Handle text saved - resume SessionView and transition back to conversation
function handleTextSavedEvent(text: string) {
  // Resume the SessionView (re-enables input)
  if (sessionViewRef.value) {
    sessionViewRef.value.resume()
  }

  // Transition back to conversation phase
  handleTextSaved(text)
}

// Handle recording error - just log it (recording component handles UI)
function handleRecordingError(message: string) {
  console.error('[ceremony] Recording error:', message)
}

// Handle Escape key press
function handleEscapeKeyPress(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    toggleExitDialog()
  }
}

// Cleanup on unmount
onUnmounted(() => {
  document.removeEventListener('keydown', handleEscapeKeyPress)
})
</script>
