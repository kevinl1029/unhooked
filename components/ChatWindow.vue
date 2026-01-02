<template>
  <div class="flex flex-col h-[calc(100vh-12rem)] md:h-[calc(100vh-8rem)] glass rounded-card border border-brand-border overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-brand-border">
      <h2 class="text-white font-semibold">Chat</h2>
      <button
        v-if="showNewChat"
        @click="$emit('newChat')"
        class="text-white-65 hover:text-white text-sm transition"
      >
        New chat
      </button>
    </div>

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

    <!-- Error message -->
    <div v-if="error" class="px-4 py-2 bg-red-500/20 border-t border-red-500/50">
      <p class="text-red-200 text-sm">{{ error }}</p>
    </div>

    <!-- Input -->
    <div v-if="!readOnly" class="p-4 border-t border-brand-border">
      <ChatInput
        :disabled="isLoading"
        @submit="$emit('send', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '~/server/utils/llm/types'

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

// Auto-scroll to bottom when new messages arrive
watch(
  () => props.messages.length,
  () => {
    nextTick(() => {
      if (messagesContainer.value) {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
    })
  }
)
</script>
