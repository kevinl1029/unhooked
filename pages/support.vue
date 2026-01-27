<template>
  <div class="mobile-safe-container flex flex-col">
    <!-- Header -->
    <div class="px-3 py-3 md:px-4 md:py-4 flex-shrink-0 flex items-center justify-between gap-4">
      <NuxtLink
        to="/dashboard"
        class="text-white-65 hover:text-white text-sm transition inline-flex items-center gap-2 flex-shrink-0"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Exit
      </NuxtLink>
      <h1 class="text-xl md:text-2xl font-semibold text-white text-right">
        Reinforcement
      </h1>
    </div>

    <!-- Session view -->
    <div class="flex-1 flex flex-col space-y-6 min-h-0">
      <div class="flex-1 min-h-0">
        <VoiceSessionView
          v-if="conversationId"
          :existing-conversation-id="conversationId"
          :illusion-number="0"
          :read-only="false"
          @session-complete="handleSessionComplete"
          @error="handleError"
        />

        <!-- Loading/Error state -->
        <div v-else class="flex flex-col items-center justify-center h-full gap-4 px-4">
          <div :class="errorMessage ? 'text-red-400' : 'text-white-65'">
            {{ errorMessage || 'Starting session...' }}
          </div>
          <button
            v-if="errorMessage"
            @click="router.push('/dashboard')"
            class="px-4 py-2 bg-brand-glass rounded-pill text-white text-sm hover:bg-brand-glass/80 transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>

    <!-- Error Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="showErrorToast"
          class="fixed top-6 left-1/2 -translate-x-1/2 z-50 glass rounded-pill px-6 py-3 shadow-card border border-red-500/50 flex items-center gap-3"
        >
          <div class="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <span class="text-white font-medium">{{ toastMessage }}</span>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: false
})

const router = useRouter()

// Session state
const conversationId = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const showErrorToast = ref(false)
const toastMessage = ref('')

// Initialize session on mount
onMounted(async () => {
  try {
    // Start generic boost session
    const response = await $fetch<{
      conversation_id: string
      session_type: string
    }>('/api/reinforcement/start', {
      method: 'POST',
      body: {
        reason: 'generic_boost',
      },
    })

    conversationId.value = response.conversation_id
  } catch (err: any) {
    console.error('Failed to start support session:', err)

    // Handle errors with toast and redirect
    let message = 'Failed to start session'
    if (err.statusCode === 401) {
      message = 'Please sign in to continue'
    } else if (err.statusCode === 403) {
      message = 'Complete all 5 illusions to access support sessions'
    }

    // Show error in loading state
    errorMessage.value = message

    // Show toast notification
    toastMessage.value = message
    showErrorToast.value = true

    // Auto-hide toast and redirect after 3 seconds
    setTimeout(() => {
      showErrorToast.value = false
      router.push('/dashboard')
    }, 3000)
  }
})

async function handleSessionComplete() {
  // For boost sessions, we would parse the AI response to identify illusions
  // However, the current boost prompt doesn't include structured markers
  // So we gracefully skip assessment for now
  // TODO: Update BOOST_MODE_OVERLAY to include structured illusion identification

  if (conversationId.value) {
    try {
      // Attempt to call assessment if we had illusion identification logic
      // For now, log that boost session completed without assessment
      console.log('Boost session completed (assessment requires illusion identification)')
    } catch (err) {
      console.error('Boost session completion error:', err)
    }
  }

  // Navigate back to dashboard
  router.push('/dashboard')
}

function handleError(err: any) {
  console.error('Session error:', err)
  errorMessage.value = 'An error occurred during the session'
}
</script>

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
