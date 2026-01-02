<template>
  <div>
    <h2 class="text-2xl font-bold text-white mb-3">What nicotine products do you use?</h2>
    <p class="text-white-85 mb-6">Select all that apply</p>

    <div class="space-y-3 mb-8">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="w-full p-4 rounded-xl border-2 transition-all duration-200 text-left"
        :class="isSelected(option.value)
          ? 'border-brand-accent bg-brand-accent/10'
          : 'border-brand-border glass hover:border-brand-border-strong'"
        @click="toggleOption(option.value)"
      >
        <div class="flex items-center justify-between">
          <span class="text-white font-medium">{{ option.label }}</span>
          <div
            class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
            :class="isSelected(option.value)
              ? 'border-brand-accent bg-brand-accent'
              : 'border-brand-border'"
          >
            <svg
              v-if="isSelected(option.value)"
              class="w-4 h-4 text-white"
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

    <button
      type="button"
      class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card w-full disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="!canContinue"
      @click="handleNext"
    >
      Continue
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
  next: []
}>()

const options = [
  { value: 'vape', label: 'Vape / E-cigarette' },
  { value: 'cigarettes', label: 'Cigarettes' },
  { value: 'pouches', label: 'Nicotine pouches (Zyn, etc.)' },
  { value: 'chew', label: 'Chewing tobacco' },
  { value: 'other', label: 'Other' },
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

const canContinue = computed(() => props.modelValue.length > 0)

const handleNext = () => {
  if (canContinue.value) {
    emit('next')
  }
}
</script>
