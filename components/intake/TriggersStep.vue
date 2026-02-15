<template>
  <div>
    <h2 class="text-2xl font-bold text-white mb-3">When do you usually reach for nicotine?</h2>
    <p class="text-white-85 mb-6">Select all that apply (optional)</p>

    <div class="grid grid-cols-2 gap-3 mb-4">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :class="[
          'p-3 min-h-[3.75rem] rounded-xl border-2 transition-all duration-200',
          option.value === 'other' ? 'col-span-2' : '',
          isSelected(option.value)
            ? 'border-brand-accent bg-brand-accent/10'
            : 'border-brand-border glass hover:border-brand-border-strong'
        ]"
        @click="toggleOption(option.value)"
      >
        <div class="flex items-center justify-between">
          <span class="text-white font-medium text-sm text-left flex-1">{{ option.label }}</span>
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

    <!-- Custom trigger text input (slides down when Other is selected) -->
    <div
      v-show="isSelected('other')"
      aria-live="polite"
      class="overflow-hidden transition-all duration-300 ease-out mb-6"
      :style="{
        maxHeight: isSelected('other') ? '200px' : '0',
        opacity: isSelected('other') ? '1' : '0'
      }"
    >
      <input
        ref="otherTextInput"
        v-model="customTriggerText"
        type="text"
        maxlength="100"
        placeholder="Describe your trigger..."
        class="w-full px-6 py-3 rounded-pill glass-input border border-brand-border text-white placeholder-white-65 focus:outline-none focus:border-brand-border-strong transition-colors"
      />
    </div>

    <div class="flex gap-3">
      <button
        type="button"
        class="px-6 py-2 md:px-8 md:py-3 rounded-pill font-semibold text-white-85 hover:text-white transition-colors"
        @click="$emit('back')"
      >
        Back
      </button>
      <div class="flex-1 flex flex-col gap-2">
        <button
          type="button"
          class="btn-primary text-white px-6 py-2 md:px-8 md:py-3 rounded-pill font-semibold shadow-card w-full disabled:opacity-50"
          :disabled="isSubmitDisabled"
          @click="handleSubmit"
        >
          {{ isSubmitting ? 'Starting...' : 'Start My Journey' }}
        </button>
        <p v-if="isSubmitDisabled && !isSubmitting" class="text-white-65 text-xs text-center">
          Please describe your trigger or deselect Other.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'

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
  { value: 'other', label: 'Other' },
]

// Local state for custom trigger text (preserved across toggles)
const customTriggerText = ref('')
const otherTextInput = ref<HTMLInputElement | null>(null)

const isSelected = (value: string) => {
  return props.modelValue.includes(value)
}

const toggleOption = (value: string) => {
  const newValue = isSelected(value)
    ? props.modelValue.filter(v => v !== value)
    : [...props.modelValue, value]
  emit('update:modelValue', newValue)
}

// Auto-focus the text input when Other is selected
watch(() => isSelected('other'), async (isOtherSelected) => {
  if (isOtherSelected) {
    await nextTick()
    otherTextInput.value?.focus()
  }
})

// Disable submit when Other is selected but text is empty/whitespace-only
const isSubmitDisabled = computed(() => {
  if (props.isSubmitting) return true
  if (isSelected('other')) {
    return !customTriggerText.value.trim()
  }
  return false
})

// On submit: replace 'other' with 'custom:{trimmed text}'
const handleSubmit = () => {
  if (isSubmitDisabled.value) return

  let triggersToSubmit = [...props.modelValue]

  // If Other is selected, replace with custom: prefixed entry
  if (isSelected('other')) {
    const trimmedText = customTriggerText.value.trim()
    if (trimmedText) {
      // Remove 'other' from the array
      triggersToSubmit = triggersToSubmit.filter(t => t !== 'other')

      // Double-prefix escape: if text starts with 'custom:', store as 'custom:custom:{text}'
      const customEntry = trimmedText.startsWith('custom:')
        ? `custom:${trimmedText}`
        : `custom:${trimmedText}`

      triggersToSubmit.push(customEntry)
    }
  }

  // Update modelValue with the final triggers (including custom: entry)
  emit('update:modelValue', triggersToSubmit)

  // Emit submit
  emit('submit')
}

// On mount: if existing triggers contain custom: entry, select Other and extract text
onMounted(() => {
  const customTrigger = props.modelValue.find(t => t.startsWith('custom:'))
  if (customTrigger) {
    // Extract text after 'custom:' prefix
    customTriggerText.value = customTrigger.substring(7) // 'custom:'.length = 7

    // Replace custom: entry with 'other' in modelValue
    const triggersWithoutCustom = props.modelValue.filter(t => !t.startsWith('custom:'))
    emit('update:modelValue', [...triggersWithoutCustom, 'other'])
  }
})
</script>
