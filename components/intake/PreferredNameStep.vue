<template>
  <div>
    <h2 class="text-2xl font-bold text-white mb-3">What should we call you?</h2>
    <p class="text-white-85 mb-6">So your coach can address you personally</p>

    <div class="mb-8">
      <input
        type="text"
        :value="modelValue"
        placeholder="Your first name or nickname"
        maxlength="50"
        class="w-full px-4 py-3 rounded-pill glass-input border border-brand-border text-white placeholder-white-65 focus:outline-none focus:border-brand-accent transition-colors"
        @input="handleInput"
      >
    </div>

    <button
      type="button"
      class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card w-full"
      @click="$emit('next')"
    >
      Next
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  next: []
}>()

const handleInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>
