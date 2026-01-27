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

        <!-- Loading state -->
        <div v-else class="flex items-center justify-center h-full">
          <div class="text-white-65">{{ errorMessage || 'Starting session...' }}</div>
        </div>
      </div>
    </div>
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

    // Handle errors with redirect
    let message = 'Failed to start session'
    if (err.statusCode === 401) {
      message = 'Please sign in to continue'
    } else if (err.statusCode === 403) {
      message = 'Complete all 5 illusions to access support sessions'
    }

    errorMessage.value = message
    console.error(message)

    // Redirect to dashboard after delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
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
