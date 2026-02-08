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
      <h1 class="text-xl md:text-2xl font-semibold text-white text-right truncate">
        {{ sessionHeader || 'Loading...' }}
      </h1>
    </div>

    <!-- Session view -->
    <div class="flex-1 flex flex-col space-y-6 min-h-0">
      <div class="flex-1 min-h-0">
        <!-- Session complete card -->
        <div v-if="sessionComplete" class="flex items-center justify-center h-full px-4">
          <SessionCompleteCard
            heading="Session Complete"
            subtext="You've strengthened what you already know."
            @dashboard="router.push('/dashboard')"
          />
        </div>

        <VoiceSessionView
          v-else-if="conversationId"
          :existing-conversation-id="conversationId"
          :illusion-key="illusionKey"
          session-type="reinforcement"
          :anchor-moment="anchorMoment"
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

const route = useRoute()
const router = useRouter()

// Route params
const illusionKey = computed(() => route.params.illusion as string)
const momentId = computed(() => route.query.moment_id as string | undefined)

// Session state
const conversationId = ref<string | null>(null)
const sessionHeader = ref<string>('')
const anchorMoment = ref<{ id: string; transcript: string } | null>(null)
const errorMessage = ref<string | null>(null)
const showErrorToast = ref(false)
const toastMessage = ref('')
const sessionComplete = ref(false)

// Illusion display names
const ILLUSION_NAMES: Record<string, string> = {
  stress_relief: 'Stress Relief',
  pleasure: 'Pleasure',
  willpower: 'Willpower',
  focus: 'Focus',
  identity: 'Identity',
}

// Initialize session on mount
onMounted(async () => {
  try {
    // Start reinforcement session
    const payload: {
      illusion_key: string
      moment_id?: string
    } = {
      illusion_key: illusionKey.value,
    }

    if (momentId.value) {
      payload.moment_id = momentId.value
    }

    const response = await $fetch<{
      conversation_id: string
      session_type: string
      illusion_key?: string
      anchor_moment?: {
        id: string
        transcript: string
      }
    }>('/api/reinforcement/start', {
      method: 'POST',
      body: payload,
    })

    conversationId.value = response.conversation_id

    // Store anchor moment for passing to session
    if (response.anchor_moment) {
      anchorMoment.value = response.anchor_moment
    }

    // Set session header
    if (response.anchor_moment?.transcript) {
      // Abridged moment quote (truncate ~60 chars)
      const quote = response.anchor_moment.transcript
      sessionHeader.value = quote.length <= 60 ? quote : quote.substring(0, 60) + '...'
    } else {
      // Illusion display name
      sessionHeader.value = ILLUSION_NAMES[illusionKey.value] || illusionKey.value
    }
  } catch (err: any) {
    console.error('Failed to start reinforcement session:', err)

    // Handle errors with toast and redirect
    let message = 'Failed to start session'
    if (err.statusCode === 400) {
      message = 'Illusion not completed yet'
    } else if (err.statusCode === 401) {
      message = 'Please sign in to continue'
    } else if (err.statusCode === 403) {
      message = 'Complete all illusions to access this session'
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

function handleSessionComplete() {
  // Session assessment (conviction scoring, user_story updates) is handled server-side
  // by handleSessionComplete() in chat.post.ts when [SESSION_COMPLETE] is detected.
  // No client-side assessment call needed - this avoids duplicate assessments.
  // See: docs/specs/reinforcement-sessions-spec.md > Technical Design > Session Completion Architecture

  // Show completion card
  sessionComplete.value = true
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
