<template>
  <form @submit.prevent="handleSubmit" class="flex gap-3">
    <textarea
      v-model="input"
      placeholder="Type your message..."
      :disabled="disabled"
      rows="1"
      @keydown.enter.exact.prevent="handleSubmit"
      class="glass-input flex-1 px-4 py-3 rounded-pill text-white placeholder-white-65 border border-brand-border focus:border-brand-border-strong focus:outline-none transition disabled:opacity-50 resize-none overflow-hidden"
      @input="autoResize"
      ref="textareaRef"
    />
    <button
      type="submit"
      :disabled="disabled || !input.trim()"
      class="btn-primary px-6 py-3 rounded-pill font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span v-if="disabled">...</span>
      <span v-else>Send</span>
    </button>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  disabled?: boolean
}>()

const emit = defineEmits<{
  submit: [message: string]
}>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

const autoResize = () => {
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
    textareaRef.value.style.height = textareaRef.value.scrollHeight + 'px'
  }
}

const handleSubmit = () => {
  if (input.value.trim() && !props.disabled) {
    emit('submit', input.value)
    input.value = ''
    // Reset textarea height
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
    }
  }
}
</script>
