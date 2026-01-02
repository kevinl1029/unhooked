<template>
  <div>
    <h2 class="text-2xl font-bold text-white mb-3">When do you usually reach for nicotine?</h2>
    <p class="text-white-85 mb-6">Select all that apply (optional)</p>

    <div class="grid grid-cols-2 gap-3 mb-8">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="p-3 rounded-xl border-2 transition-all duration-200"
        :class="isSelected(option.value)
          ? 'border-brand-accent bg-brand-accent/10'
          : 'border-brand-border glass hover:border-brand-border-strong'"
        @click="toggleOption(option.value)"
      >
        <div class="flex items-center justify-between">
          <span class="text-white font-medium text-sm">{{ option.label }}</span>
          <div
            class="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ml-2"
            :class="isSelected(option.value)
              ? 'border-brand-accent bg-brand-accent'
              : 'border-brand-border'"
          >
            <svg
              v-if="isSelected(option.value)"
              class="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>
      </button>
    </div>

    <div class="flex gap-3">
      <button
        type="button"
        class="px-8 py-3 rounded-pill font-semibold text-white-85 hover:text-white transition-colors"
        @click="$emit('back')"
      >
        Back
      </button>
      <button
        type="button"
        class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card flex-1 disabled:opacity-50"
        :disabled="isSubmitting"
        @click="$emit('submit')"
      >
        {{ isSubmitting ? 'Starting...' : 'Start My Journey' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
  isSubmitting: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  submit: []
  back: []
}>()

const options = [
  { value: 'morning', label: 'Morning' },
  { value: 'after_meals', label: 'After meals' },
  { value: 'stress', label: 'Stressful moments' },
  { value: 'social', label: 'Social situations' },
  { value: 'boredom', label: 'Boredom' },
  { value: 'driving', label: 'Driving' },
  { value: 'alcohol', label: 'With alcohol' },
  { value: 'work_breaks', label: 'Work breaks' },
]

const isSelected = (value: string) => {
  return props.modelValue.includes(value)
}

const toggleOption = (value: string) => {
  const newValue = isSelected(value)
    ? props.modelValue.filter(v => v !== value)
    : [...props.modelValue, value]
  emit('update:modelValue', newValue)
}
</script>
