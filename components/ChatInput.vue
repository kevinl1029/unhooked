<template>
  <div class="w-full">
    <button
      v-if="mode === 'collapsed'"
      type="button"
      class="w-full composer-shell px-4 py-3 flex items-center justify-between text-left text-white-85 hover:bg-white/10 transition"
      @click="$emit('expand')"
    >
      <div>
        <p class="text-white font-semibold text-sm">Message your coach</p>
        <p class="text-white-65 text-xs">Jump to the latest reply to continue</p>
      </div>
      <svg
        class="w-4 h-4 text-white-65"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 9l6 6 6-6" />
      </svg>
    </button>

    <form
      v-else
      @submit.prevent="handleSubmit"
      :class="[
        'composer-shell flex items-center gap-3 transition-all duration-200',
        mode === 'compact' ? 'opacity-75 gap-2 py-2' : 'py-2.5',
        'px-4'
      ]"
    >
      <textarea
        v-model="input"
        placeholder="Type your message..."
        :disabled="disabled || mode === 'compact'"
        rows="1"
        @keydown.enter.exact.prevent="handleSubmit"
        :class="[
          'flex-1 bg-transparent text-white placeholder-white-65 focus:outline-none focus:ring-0 transition disabled:opacity-50 resize-none overflow-hidden text-base',
          mode === 'compact' ? 'text-sm' : ''
        ]"
        @input="autoResize"
        ref="textareaRef"
      />
      <button
        type="submit"
        :disabled="disabled || !input.trim()"
        class="btn-primary rounded-full w-12 h-12 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shrink-0"
        aria-label="Send message"
      >
        <svg
          v-if="!disabled"
          class="w-5 h-5 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 12h14" />
          <path d="M12 5l7 7-7 7" />
        </svg>
        <span v-else class="text-white text-sm">...</span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
type ComposerMode = 'default' | 'compact' | 'collapsed'

const props = withDefaults(defineProps<{
  disabled?: boolean
  mode?: ComposerMode
}>(), {
  mode: 'default'
})

const emit = defineEmits<{
  submit: [message: string]
  expand: []
}>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement>()
const MAX_TEXTAREA_HEIGHT = 160

const autoResize = () => {
  if (!textareaRef.value) return
  const textarea = textareaRef.value
  textarea.style.height = 'auto'
  const nextHeight = Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)
  textarea.style.height = `${nextHeight}px`
  textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
}

const handleSubmit = () => {
  if (input.value.trim() && !props.disabled) {
    emit('submit', input.value)
    input.value = ''
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      textareaRef.value.style.overflowY = 'hidden'
    }
  }
}

watch(
  () => props.mode,
  (mode) => {
    if (mode !== 'collapsed') {
      nextTick(() => autoResize())
    }
  }
)

const focusTextarea = () => {
  textareaRef.value?.focus()
}

defineExpose({
  focusTextarea
})
</script>
