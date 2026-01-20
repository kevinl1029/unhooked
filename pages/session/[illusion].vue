<template>
  <div class="mobile-safe-container flex flex-col">
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
      <h1 class="text-2xl md:text-3xl font-bold text-white text-right">{{ illusionName }}</h1>
    </div>

    <div class="flex-1 flex flex-col space-y-6 min-h-0">
      <div class="flex-1 min-h-0">
        <!-- Voice Session View (default) -->
        <VoiceSessionView
          v-if="!isTranscriptView && !useTextMode"
          :illusion-number="illusionNumber"
          :read-only="sessionComplete"
          :existing-conversation-id="existingConversationId"
          :existing-messages="existingMessages"
          @session-complete="handleVoiceSessionComplete"
          @error="handleError"
        />

        <!-- Text-based Chat (transcript view or fallback) -->
        <ChatWindow
          v-else
          :messages="displayMessages"
          :is-loading="isLoading"
          :error="error"
          :show-new-chat="false"
          :read-only="sessionComplete || isTranscriptView"
          @send="handleSend"
        />
      </div>

      <SessionCompleteCard
        v-if="sessionComplete"
        class="flex-shrink-0"
        :next-illusion="nextIllusion"
        @continue="handleContinue"
        @dashboard="handleDashboard"
        @finish="handleFinish"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '~/server/utils/llm/types'
import { ILLUSION_NAMES, getIllusionOpening } from '~/server/utils/prompts'

type ClientMessage = Message

definePageMeta({
  middleware: 'auth',
  layout: false
})

const route = useRoute()
const router = useRouter()
const { completeSession, fetchProgress } = useProgress()

const illusionNumber = computed(() => parseInt(route.params.illusion as string))
const illusionName = computed(() => ILLUSION_NAMES[illusionNumber.value] || 'Unknown Illusion')
const isTranscriptView = computed(() => route.query.view === 'transcript')
const useTextMode = computed(() => route.query.mode === 'text')

const messages = ref<ClientMessage[]>([])
const conversationId = ref<string | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const sessionComplete = ref(false)
const nextIllusion = ref<number | null>(null)

// For voice session view
const existingConversationId = ref<string | null>(null)
const existingMessages = ref<ClientMessage[]>([])

const displayMessages = computed(() => {
  return messages.value.map(msg => ({
    ...msg,
    content: msg.content.replace('[SESSION_COMPLETE]', '').trim()
  }))
})

onMounted(async () => {
  // Voice session view handles its own initialization
  // Only initialize for transcript view or text mode
  if (isTranscriptView.value) {
    await loadTranscript()
  } else if (useTextMode.value) {
    await initializeSession()
  }
  // Otherwise, VoiceSessionView component handles initialization
})

async function initializeSession() {
  try {
    isLoading.value = true

    // Check if there's an existing incomplete conversation for this illusion
    const { data: existingConversations } = await useFetch('/api/conversations', {
      query: { illusionNumber: illusionNumber.value }
    })

    if (existingConversations.value && existingConversations.value.length > 0) {
      // Find the most recent incomplete conversation
      const incompleteConv = existingConversations.value.find((c: any) => !c.session_completed)

      if (incompleteConv) {
        // Load existing conversation
        conversationId.value = incompleteConv.id

        const { data: conversationData } = await useFetch(`/api/conversations/${incompleteConv.id}`)

        if (conversationData.value) {
          messages.value = (conversationData.value.messages || []) as ClientMessage[]
          return
        }
      }
    }

    // No existing conversation - let the AI start the conversation
    // Simply initialize with empty messages and trigger the AI to speak first
    conversationId.value = null
    messages.value = []

    // Trigger the AI to send the opening message
    await sendOpeningMessage()
  } catch (err: any) {
    console.error('Error initializing session:', err)
    error.value = 'Failed to start session. Please refresh the page.'
  } finally {
    isLoading.value = false
  }
}

async function sendOpeningMessage() {
  try {
    isLoading.value = true

    // Send empty messages array to trigger AI to speak first
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [], // Empty array - no user message to start
        illusionNumber: illusionNumber.value,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error('Failed to get opening message')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    const assistantMessageIndex = messages.value.length
    messages.value.push({
      role: 'assistant',
      content: ''
    })

    let buffer = ''
    let streamEndedWithError = false

    while (reader && !streamEndedWithError) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = JSON.parse(line.slice(6))

        if (data.error) {
          if (reader) {
            await reader.cancel()
          }
          handleStreamError({
            message: data.error,
            status: data.status,
            assistantIndex: assistantMessageIndex
          })
          streamEndedWithError = true
          break
        }

        if (data.token) {
          messages.value[assistantMessageIndex].content += data.token
        }

        if (data.conversationId && !conversationId.value) {
          conversationId.value = data.conversationId
        }
      }
    }
  } catch (err: any) {
    console.error('Error getting opening message:', err)
    error.value = 'Failed to start conversation. Please try again.'
  } finally {
    isLoading.value = false
  }
}

async function loadTranscript() {
  try {
    isLoading.value = true

    const { data: conversations } = await useFetch('/api/conversations', {
      query: { illusionNumber: illusionNumber.value }
    })

    if (conversations.value && conversations.value.length > 0) {
      const completedConversations = conversations.value.filter((c: any) => c.session_completed)

      if (completedConversations.length > 0) {
        const mostRecent = completedConversations[0]
        conversationId.value = mostRecent.id

        const { data: conversationData } = await useFetch(`/api/conversations/${mostRecent.id}`)

        if (conversationData.value) {
          messages.value = (conversationData.value.messages || []) as ClientMessage[]
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
  if (isTranscriptView.value) return

  error.value = null

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
        illusionNumber: illusionNumber.value,
        stream: true
      })
    })

    if (!response.ok) {
      throw new Error('Failed to send message')
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    const assistantMessageIndex = messages.value.length
    messages.value.push({
      role: 'assistant',
      content: ''
    })

    let buffer = ''
    let sessionCompleteDetected = false
    let streamEndedWithError = false

    while (reader && !streamEndedWithError) {
      const { done, value } = await reader.read()

      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = JSON.parse(line.slice(6))

        if (data.error) {
          if (reader) {
            await reader.cancel()
          }
          handleStreamError({
            message: data.error,
            status: data.status,
            assistantIndex: assistantMessageIndex
          })
          streamEndedWithError = true
          break
        }

        if (data.token) {
          messages.value[assistantMessageIndex].content += data.token
        }

        if (data.conversationId && !conversationId.value) {
          conversationId.value = data.conversationId
        }

        if (data.done && data.sessionComplete) {
          sessionCompleteDetected = true
        }
      }
    }

    if (streamEndedWithError) return

    if (sessionCompleteDetected) {
      await handleSessionComplete()
    }
  } catch (err: any) {
    console.error('Error sending message:', err)
    error.value = 'Failed to send message. Please try again.'
    messages.value.pop()
  } finally {
    isLoading.value = false
  }
}

async function handleSessionComplete() {
  if (!conversationId.value) return

  try {
    const result = await completeSession(conversationId.value, illusionNumber.value)
    nextIllusion.value = result.nextIllusion ?? null
    sessionComplete.value = true
    await fetchProgress()
  } catch (err) {
    console.error('Error completing session:', err)
  }
}

// Voice session handlers
async function handleVoiceSessionComplete(nextIllusionNum: number | null) {
  console.log('[Session Page] handleVoiceSessionComplete received', {
    nextIllusionNum,
    currentSessionComplete: sessionComplete.value
  })
  nextIllusion.value = nextIllusionNum
  sessionComplete.value = true
  console.log('[Session Page] sessionComplete set to true, fetching progress...')
  await fetchProgress()
  console.log('[Session Page] Progress fetched, SessionCompleteCard should now render')
}

function handleError(message: string) {
  error.value = message
}

async function handleContinue(nextIllusionNumber: number) {
  // Reset state
  messages.value = []
  conversationId.value = null
  sessionComplete.value = false
  nextIllusion.value = null

  // Navigate to next session
  await router.push(`/session/${nextIllusionNumber}`)

  // Initialize the new session
  await initializeSession()
}

function handleDashboard() {
  router.push('/dashboard')
}

function handleFinish() {
  router.push('/ceremony')
}

function handleStreamError({
  message,
  status,
  assistantIndex
}: {
  message: string
  status?: number
  assistantIndex?: number
}) {
  error.value = getFriendlyErrorMessage(message, status)

  if (typeof assistantIndex === 'number') {
    removeAssistantPlaceholder(assistantIndex)
  }
}

function removeAssistantPlaceholder(index: number) {
  const placeholder = messages.value[index]
  if (placeholder && placeholder.role === 'assistant') {
    messages.value.splice(index, 1)
  }
}

function getFriendlyErrorMessage(message?: string, status?: number) {
  const normalized = message?.toLowerCase() || ''
  if (status === 429 || normalized.includes('quota') || normalized.includes('too many requests')) {
    return 'Our AI coach hit the Gemini daily quota limit. Please wait a bit or update the API plan.'
  }
  return message || 'The AI coach is temporarily unavailable. Please try again shortly.'
}
</script>
