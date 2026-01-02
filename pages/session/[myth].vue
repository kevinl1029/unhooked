<template>
  <div class="min-h-screen p-4">
    <!-- Exit link -->
    <div class="mb-4">
      <NuxtLink
        to="/dashboard"
        class="text-white-65 hover:text-white text-sm transition inline-flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Exit session
      </NuxtLink>
    </div>

    <!-- Session header -->
    <div class="mb-6">
      <h1 class="text-3xl md:text-4xl font-bold text-white">{{ mythName }}</h1>
    </div>

    <!-- Session complete card -->
    <SessionCompleteCard
      v-if="sessionComplete"
      :next-myth="nextMyth"
      @continue="handleContinue"
      @dashboard="handleDashboard"
      @finish="handleFinish"
    />

    <!-- Chat interface -->
    <ChatWindow
      v-else
      :messages="displayMessages"
      :is-loading="isLoading"
      :error="error"
      :show-new-chat="false"
      :read-only="isTranscriptView"
      @send="handleSend"
    />
  </div>
</template>

<script setup lang="ts">
import type { Message } from '~/server/utils/llm/types'
import { MYTH_NAMES } from '~/server/utils/prompts'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const { progress, completeSession, fetchProgress } = useProgress()

// Parse myth number from route
const mythNumber = computed(() => parseInt(route.params.myth as string))
const mythName = computed(() => MYTH_NAMES[mythNumber.value] || 'Unknown Myth')

// Check if we're in transcript view mode
const isTranscriptView = computed(() => route.query.view === 'transcript')

// Session state
const messages = ref<Message[]>([])
const conversationId = ref<string | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const sessionComplete = ref(false)
const nextMyth = ref<number | null>(null)

// Strip [SESSION_COMPLETE] token from displayed messages
const displayMessages = computed(() => {
  return messages.value.map(msg => ({
    ...msg,
    content: msg.content.replace('[SESSION_COMPLETE]', '').trim()
  }))
})

// Load transcript if in view mode
onMounted(async () => {
  if (isTranscriptView.value) {
    await loadTranscript()
  }
})

async function loadTranscript() {
  try {
    isLoading.value = true

    // Fetch all conversations for this myth
    const { data: conversations } = await useFetch('/api/conversations', {
      query: { mythNumber: mythNumber.value }
    })

    if (conversations.value && conversations.value.length > 0) {
      // Find most recent completed conversation
      const completedConversations = conversations.value.filter((c: any) => c.session_completed)

      if (completedConversations.length > 0) {
        const mostRecent = completedConversations[0]
        conversationId.value = mostRecent.id

        // Fetch messages for this conversation
        const { data: conversationData } = await useFetch(`/api/conversations/${mostRecent.id}`)

        if (conversationData.value) {
          messages.value = conversationData.value.messages || []
        }
      }
    }
  } catch (err: any) {
    console.error('Error loading transcript:', err)
    error.value = 'Failed to load transcript'
  } finally {
    isLoading.value = false
  }
}

async function handleSend(message: string) {
  if (isTranscriptView.value) return // Should never happen due to readOnly

  error.value = null

  // Add user message to display
  messages.value.push({
    role: 'user',
    content: message
  })

  isLoading.value = true

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: messages.value,
        conversationId: conversationId.value,
        mythNumber: mythNumber.value,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error('Failed to send message')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    let assistantMessage: Message = {
      role: 'assistant',
      content: ''
    }
    messages.value.push(assistantMessage)

    let buffer = ''
    let sessionCompleteDetected = false

    while (reader) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6))

          if (data.token) {
            assistantMessage.content += data.token
          }

          if (data.conversationId && !conversationId.value) {
            conversationId.value = data.conversationId
          }

          if (data.done && data.sessionComplete) {
            sessionCompleteDetected = true
          }
        }
      }
    }

    // Handle session completion
    if (sessionCompleteDetected) {
      await handleSessionComplete()
    }

  } catch (err: any) {
    console.error('Error sending message:', err)
    error.value = 'Failed to send message. Please try again.'
    // Remove the failed assistant message
    messages.value.pop()
  } finally {
    isLoading.value = false
  }
}

async function handleSessionComplete() {
  if (!conversationId.value) return

  try {
    const result = await completeSession(conversationId.value, mythNumber.value)

    nextMyth.value = result.nextMyth
    sessionComplete.value = true

    // Refresh progress
    await fetchProgress()
  } catch (err) {
    console.error('Error completing session:', err)
  }
}

function handleContinue(nextMythNumber: number) {
  router.push(`/session/${nextMythNumber}`)
  // Reset state for new session
  messages.value = []
  conversationId.value = null
  sessionComplete.value = false
  nextMyth.value = null
}

function handleDashboard() {
  router.push('/dashboard')
}

function handleFinish() {
  router.push('/ceremony')
}
</script>
