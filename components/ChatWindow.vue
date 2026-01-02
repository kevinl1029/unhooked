<template>
  <div class="flex flex-col h-full overflow-hidden relative">
    <!-- Messages -->
    <div ref="messagesContainer" class="flex-1 overflow-y-auto">
      <div v-if="messages.length === 0" class="h-full flex items-center justify-center">
        <p class="text-white-65">Start a conversation...</p>
      </div>
      <template v-else>
        <ChatMessage
          v-for="(message, index) in messages"
          :key="index"
          :message="message"
        />
      </template>

      <!-- Loading indicator -->
      <div v-if="isLoading" class="flex gap-4 p-4">
        <div class="glass border border-brand-border rounded-2xl rounded-bl-sm px-4 py-3">
          <div class="flex gap-1">
            <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
            <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
            <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
          </div>
        </div>
      </div>
    </div>

    <!-- Jump to latest button -->
    <button
      v-if="isScrolledAway"
      class="absolute bottom-28 right-4 md:right-6 px-4 py-2 rounded-pill glass-input border border-brand-border text-sm text-white flex items-center gap-2 shadow-card backdrop-blur-lg transition"
      @click="scrollToLatest(true)"
    >
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 9l-7 7-7-7" />
      </svg>
      Jump to latest
    </button>

    <!-- Error message -->
    <div v-if="error" class="px-4 py-2 bg-red-500/20 border-t border-red-500/50">
      <p class="text-red-200 text-sm">{{ error }}</p>
    </div>

    <!-- Input -->
    <div
      v-if="!readOnly"
      :class="[
        'px-3 py-3 md:px-4 border-t border-brand-border transition-all duration-200',
        composerMode === 'compact' ? 'py-2 opacity-80' : '',
        composerMode === 'collapsed' ? 'pb-4' : ''
      ]"
    >
      <ChatInput
        ref="chatInputRef"
        :disabled="isLoading"
        :mode="composerMode"
        @submit="$emit('send', $event)"
        @expand="scrollToLatest(true)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '~/server/utils/llm/types'

type ComposerMode = 'default' | 'compact' | 'collapsed'

const props = withDefaults(defineProps<{
  messages: Message[]
  isLoading: boolean
  error: string | null
  showNewChat?: boolean
  readOnly?: boolean
}>(), {
  showNewChat: true,
  readOnly: false
})

defineEmits<{
  send: [message: string]
  newChat: []
}>()

const messagesContainer = ref<HTMLElement>()
const chatInputRef = ref<{ focusTextarea: () => void } | null>(null)
const isScrolledAway = ref(false)

const composerMode = computed<ComposerMode>(() => {
  if (isScrolledAway.value) {
    return 'collapsed'
  }
  if (props.isLoading) {
    return 'compact'
  }
  return 'default'
})

const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
  const el = messagesContainer.value
  if (!el) return
  if (behavior === 'smooth') {
    el.scrollTo({ top: el.scrollHeight, behavior })
  } else {
    el.scrollTop = el.scrollHeight
  }
  isScrolledAway.value = false
}

const scrollToLatest = (focusAfter = false) => {
  scrollToBottom('smooth')
  if (focusAfter) {
    nextTick(() => {
      chatInputRef.value?.focusTextarea()
    })
  }
}

const updateScrollState = () => {
  const el = messagesContainer.value
  if (!el) return
  const threshold = 80
  const distanceFromBottom = el.scrollHeight - (el.scrollTop + el.clientHeight)
  isScrolledAway.value = distanceFromBottom > threshold
}

watchEffect((onCleanup) => {
  const el = messagesContainer.value
  if (!el) return
  const handler = () => updateScrollState()
  el.addEventListener('scroll', handler)
  updateScrollState()

  onCleanup(() => {
    el.removeEventListener('scroll', handler)
  })
})

watch(
  () => props.messages,
  () => {
    nextTick(() => {
      if (!isScrolledAway.value) {
        scrollToBottom()
      }
    })
  },
  { deep: true }
)
</script>
