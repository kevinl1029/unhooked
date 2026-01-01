<template>
  <div
    class="flex gap-4 p-4"
    :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[80%] rounded-2xl px-4 py-3"
      :class="
        message.role === 'user'
          ? 'bg-brand-accent text-white rounded-br-sm'
          : 'glass border border-brand-border text-white rounded-bl-sm'
      "
    >
      <p class="whitespace-pre-wrap">{{ message.content }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '~/server/utils/llm/types'

defineProps<{
  message: Message
}>()
</script>
