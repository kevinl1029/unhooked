<template>
  <div>
    <h2 class="text-2xl font-bold text-white mb-3">How often do you use nicotine?</h2>
    <p class="text-white-85 mb-6">Select the option that best describes your usage</p>

    <div class="space-y-3 mb-8">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="w-full p-4 rounded-xl border-2 transition-all duration-200 text-left"
        :class="modelValue === option.value
          ? 'border-brand-accent bg-brand-accent/10'
          : 'border-brand-border glass hover:border-brand-border-strong'"
        @click="selectOption(option.value)"
      >
        <div class="flex items-center justify-between">
          <span class="text-white font-medium">{{ option.label }}</span>
          <div
            class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all"
            :class="modelValue === option.value
              ? 'border-brand-accent bg-brand-accent'
              : 'border-brand-border'"
          >
            <div
              v-if="modelValue === option.value"
              class="w-3 h-3 rounded-full bg-white"
            />
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
        class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="!canContinue"
        @click="handleNext"
      >
        Continue
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  next: []
  back: []
}>()

const options = [
  { value: 'multiple_daily', label: 'Multiple times a day' },
  { value: 'daily', label: 'Once a day' },
  { value: 'several_weekly', label: 'Several times a week' },
  { value: 'occasional', label: 'Occasionally / socially' },
]

const selectOption = (value: string) => {
  emit('update:modelValue', value)
}

const canContinue = computed(() => props.modelValue !== '')

const handleNext = () => {
  if (canContinue.value) {
    emit('next')
  }
}
</script>
