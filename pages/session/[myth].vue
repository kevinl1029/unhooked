<template>
  <div class="h-screen flex flex-col">
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
      <h1 class="text-2xl md:text-3xl font-bold text-white text-right">{{ mythName }}</h1>
    </div>

    <div class="flex-1 flex flex-col space-y-6 min-h-0">
      <div class="flex-1 min-h-0">
        <ChatWindow
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
        :next-myth="nextMyth"
        @continue="handleContinue"
        @dashboard="handleDashboard"
        @finish="handleFinish"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '~/server/utils/llm/types'
import { MYTH_NAMES } from '~/server/utils/prompts'

type ClientMessage = Message & { hidden?: boolean }

definePageMeta({
  middleware: 'auth',
  layout: false
})

const route = useRoute()
const router = useRouter()
const { completeSession, fetchProgress } = useProgress()

const mythNumber = computed(() => parseInt(route.params.myth as string))
const mythName = computed(() => MYTH_NAMES[mythNumber.value] || 'Unknown Myth')
const isTranscriptView = computed(() => route.query.view === 'transcript')

const messages = ref<ClientMessage[]>([])
const conversationId = ref<string | null>(null)
const isLoading = ref(false)
const error = ref<string | null>(null)
const sessionComplete = ref(false)
const nextMyth = ref<number | null>(null)

const displayMessages = computed(() => {
  return messages.value
    .filter(msg => !msg.hidden)
    .map(msg => ({
      ...msg,
      content: msg.content.replace('[SESSION_COMPLETE]', '').trim()
    }))
})

onMounted(async () => {
  if (isTranscriptView.value) {
    await loadTranscript()
  } else {
    await sendInitialGreeting()
  }
})

async function sendInitialGreeting() {
  isLoading.value = true
  error.value = null
  const seedMessage = 'Hi'

  if (!messages.value.some(msg => msg.hidden && msg.role === 'user')) {
    messages.value.push({
      role: 'user',
      content: seedMessage,
      hidden: true
    })
  }

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
      throw new Error('Failed to start conversation')
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
            assistantIndex: assistantMessageIndex,
            resetSeedMessage: true
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

    if (streamEndedWithError) return
  } catch (err: any) {
    console.error('Error starting conversation:', err)
    error.value = 'Failed to start conversation. Please refresh the page.'
    messages.value = messages.value.filter(msg => !msg.hidden)
  } finally {
    isLoading.value = false
  }
}

async function loadTranscript() {
  try {
    isLoading.value = true

    const { data: conversations } = await useFetch('/api/conversations', {
      query: { mythNumber: mythNumber.value }
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
        mythNumber: mythNumber.value,
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
    const result = await completeSession(conversationId.value, mythNumber.value)
    nextMyth.value = result.nextMyth
    sessionComplete.value = true
    await fetchProgress()
  } catch (err) {
    console.error('Error completing session:', err)
  }
}

function handleContinue(nextMythNumber: number) {
  router.push(`/session/${nextMythNumber}`)
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

function handleStreamError({
  message,
  status,
  assistantIndex,
  resetSeedMessage = false
}: {
  message: string
  status?: number
  assistantIndex?: number
  resetSeedMessage?: boolean
}) {
  error.value = getFriendlyErrorMessage(message, status)

  if (typeof assistantIndex === 'number') {
    removeAssistantPlaceholder(assistantIndex)
  }

  if (resetSeedMessage) {
    messages.value = messages.value.filter(msg => !msg.hidden)
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
