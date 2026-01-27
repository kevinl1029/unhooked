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
      <h1 class="text-xl md:text-2xl font-semibold text-white text-right line-clamp-2">
        {{ sessionHeader || 'Loading...' }}
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

const route = useRoute()
const router = useRouter()

// Route params
const illusionKey = computed(() => route.params.illusion as string)
const momentId = computed(() => route.query.moment_id as string | undefined)

// Session state
const conversationId = ref<string | null>(null)
const sessionHeader = ref<string>('')
const errorMessage = ref<string | null>(null)

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
        quote: string
      }
    }>('/api/reinforcement/start', {
      method: 'POST',
      body: payload,
    })

    conversationId.value = response.conversation_id

    // Set session header
    if (response.anchor_moment?.quote) {
      // Abridged moment quote (truncate ~60 chars)
      const quote = response.anchor_moment.quote
      sessionHeader.value = quote.length <= 60 ? quote : quote.substring(0, 60) + '...'
    } else {
      // Illusion display name
      sessionHeader.value = ILLUSION_NAMES[illusionKey.value] || illusionKey.value
    }
  } catch (err: any) {
    console.error('Failed to start reinforcement session:', err)

    // Handle errors with redirect and toast
    let message = 'Failed to start session'
    if (err.statusCode === 400) {
      message = 'Illusion not completed yet'
    } else if (err.statusCode === 401) {
      message = 'Please sign in to continue'
    } else if (err.statusCode === 403) {
      message = 'Complete all illusions to access this session'
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
  // Call assessment API for reinforcement session
  if (!conversationId.value) {
    router.push('/dashboard')
    return
  }

  try {
    await $fetch('/api/reinforcement/assess', {
      method: 'POST',
      body: {
        conversation_id: conversationId.value,
        illusion_key: illusionKey.value,
      },
    })
  } catch (err) {
    // Gracefully handle assessment failure - session still completes
    console.error('Assessment failed (session still complete):', err)
  }

  // Navigate back to dashboard
  router.push('/dashboard')
}

function handleError(err: any) {
  console.error('Session error:', err)
  errorMessage.value = 'An error occurred during the session'
}
</script>
