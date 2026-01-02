<template>
  <div>
    <h2 class="text-2xl font-bold text-white mb-3">Tell us about your history</h2>
    <p class="text-white-85 mb-6">This helps us personalize your experience (all optional)</p>

    <!-- Years using -->
    <div class="mb-6">
      <label class="block text-white font-medium mb-3">How many years have you been using nicotine?</label>
      <input
        type="number"
        :value="yearsUsing"
        placeholder="e.g., 5"
        class="w-full px-4 py-3 rounded-pill glass-input border border-brand-border text-white placeholder-white-65 focus:outline-none focus:border-brand-accent transition-colors"
        min="0"
        max="100"
        @input="updateYearsUsing"
      >
    </div>

    <!-- Previous quit attempts -->
    <div class="mb-6">
      <label class="block text-white font-medium mb-3">How many times have you tried to quit before?</label>
      <div class="grid grid-cols-4 gap-3">
        <button
          v-for="option in attemptOptions"
          :key="option.value"
          type="button"
          class="p-3 rounded-xl border-2 transition-all duration-200"
          :class="previousAttempts === option.value
            ? 'border-brand-accent bg-brand-accent/10'
            : 'border-brand-border glass hover:border-brand-border-strong'"
          @click="$emit('update:previousAttempts', option.value)"
        >
          <span class="text-white font-medium">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <!-- Longest quit duration (conditional) -->
    <div v-if="previousAttempts !== undefined && previousAttempts > 0" class="mb-8">
      <label class="block text-white font-medium mb-3">What was your longest time without nicotine?</label>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        <button
          v-for="option in durationOptions"
          :key="option.value"
          type="button"
          class="p-3 rounded-xl border-2 transition-all duration-200"
          :class="longestQuitDuration === option.value
            ? 'border-brand-accent bg-brand-accent/10'
            : 'border-brand-border glass hover:border-brand-border-strong'"
          @click="$emit('update:longestQuitDuration', option.value)"
        >
          <span class="text-white font-medium">{{ option.label }}</span>
        </button>
      </div>
    </div>

    <div v-else class="mb-8" />

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
        class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card flex-1"
        @click="$emit('next')"
      >
        Continue
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  yearsUsing?: number
  previousAttempts?: number
  longestQuitDuration?: string
}>()

const emit = defineEmits<{
  'update:yearsUsing': [value: number | undefined]
  'update:previousAttempts': [value: number | undefined]
  'update:longestQuitDuration': [value: string | undefined]
  next: []
  back: []
}>()

const attemptOptions = [
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3+' },
]

const durationOptions = [
  { value: 'hours', label: 'Hours' },
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'year_plus', label: 'Year+' },
]

const updateYearsUsing = (event: Event) => {
  const target = event.target as HTMLInputElement
  const value = target.value ? parseInt(target.value) : undefined
  emit('update:yearsUsing', value)
}
</script>
