<template>
  <div>
    <h2 class="text-2xl font-bold text-white mb-3">What's your main reason for using nicotine?</h2>
    <p class="text-white-85 mb-6">Choose the one that resonates most</p>

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
        <div class="mb-1">
          <span class="text-white font-semibold">{{ option.label }}</span>
        </div>
        <p class="text-white-65 text-sm">{{ option.description }}</p>
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
  {
    value: 'stress',
    label: 'It helps me manage stress',
    description: 'You use nicotine to cope with difficult moments or overwhelming feelings'
  },
  {
    value: 'pleasure',
    label: 'I genuinely enjoy it',
    description: 'You believe nicotine gives you real pleasure or satisfaction'
  },
  {
    value: 'fear',
    label: "I'm afraid quitting will be too hard",
    description: 'The thought of quitting feels overwhelming or impossible'
  },
  {
    value: 'focus',
    label: 'I need it to focus',
    description: 'You rely on nicotine to concentrate, think clearly, or get things done'
  },
  {
    value: 'identity',
    label: "I think I'm just an addictive person",
    description: 'You believe addiction is part of who you are or how you\'re wired'
  },
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
