<script setup lang="ts">
/**
 * Support Chat Page
 * Opens a support conversation with full user context
 * Mode: 'struggling' or 'boost'
 */

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()

// Get mode from query param
const mode = computed(() => {
  const m = route.query.mode as string
  return m === 'boost' ? 'boost' : 'struggling'
})

const modeTitle = computed(() => {
  return mode.value === 'boost' ? 'Get a Boost' : "I'm Struggling"
})

const modeSubtitle = computed(() => {
  return mode.value === 'boost'
    ? "Let's reinforce what you've learned"
    : "I'm here to help you through this"
})

// Chat state
const messages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([])
const isLoading = ref(false)
const inputText = ref('')
const chatContainerRef = ref<HTMLElement | null>(null)

// Start conversation on mount
onMounted(async () => {
  await startConversation()
})

async function startConversation() {
  isLoading.value = true

  try {
    // Get initial greeting from support chat endpoint
    const response = await $fetch<{ message: string; conversation_id: string }>('/api/support/chat', {
      method: 'POST',
      body: {
        mode: mode.value,
        message: null, // Initial message triggers greeting
      },
    })

    messages.value.push({
      role: 'assistant',
      content: response.message,
    })
  } catch (err) {
    console.error('Failed to start conversation:', err)
    messages.value.push({
      role: 'assistant',
      content: mode.value === 'boost'
        ? "Hey! Great to see you're checking in. What's on your mind?"
        : "I'm here for you. What's going on?",
    })
  } finally {
    isLoading.value = false
  }
}

async function sendMessage() {
  if (!inputText.value.trim() || isLoading.value) return

  const userMessage = inputText.value.trim()
  inputText.value = ''

  messages.value.push({
    role: 'user',
    content: userMessage,
  })

  scrollToBottom()
  isLoading.value = true

  try {
    const response = await $fetch<{ message: string }>('/api/support/chat', {
      method: 'POST',
      body: {
        mode: mode.value,
        message: userMessage,
      },
    })

    messages.value.push({
      role: 'assistant',
      content: response.message,
    })
  } catch (err) {
    console.error('Failed to send message:', err)
    messages.value.push({
      role: 'assistant',
      content: "I'm sorry, something went wrong. Let's try again.",
    })
  } finally {
    isLoading.value = false
    scrollToBottom()
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
}

function goBack() {
  router.push('/dashboard')
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <!-- Header -->
    <div class="glass border-b border-brand-border px-4 py-4">
      <div class="max-w-2xl mx-auto flex items-center gap-4">
        <button
          class="text-white-65 hover:text-white transition"
          @click="goBack"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-semibold text-white">{{ modeTitle }}</h1>
          <p class="text-sm text-white-65">{{ modeSubtitle }}</p>
        </div>
      </div>
    </div>

    <!-- Chat messages -->
    <div
      ref="chatContainerRef"
      class="flex-1 overflow-y-auto px-4 py-6"
    >
      <div class="max-w-2xl mx-auto space-y-4">
        <div
          v-for="(message, index) in messages"
          :key="index"
          class="flex"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-[80%] rounded-2xl px-4 py-3"
            :class="message.role === 'user'
              ? 'bg-brand-accent text-white'
              : 'bg-brand-glass border border-brand-border text-white'"
          >
            <p class="whitespace-pre-wrap">{{ message.content }}</p>
          </div>
        </div>

        <!-- Loading indicator -->
        <div v-if="isLoading" class="flex justify-start">
          <div class="bg-brand-glass border border-brand-border rounded-2xl px-4 py-3">
            <div class="flex gap-1">
              <div class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 0ms" />
              <div class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 150ms" />
              <div class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 300ms" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input area -->
    <div class="glass border-t border-brand-border px-4 py-4">
      <div class="max-w-2xl mx-auto flex gap-3">
        <textarea
          v-model="inputText"
          placeholder="Type your message..."
          class="flex-1 bg-brand-glass-input border border-brand-border rounded-2xl px-4 py-3 text-white placeholder-white-65 resize-none focus:outline-none focus:border-brand-accent"
          rows="1"
          :disabled="isLoading"
          @keydown="handleKeydown"
        />
        <button
          class="btn-primary px-4 py-3 rounded-full disabled:opacity-50"
          :disabled="!inputText.trim() || isLoading"
          @click="sendMessage"
        >
          <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
