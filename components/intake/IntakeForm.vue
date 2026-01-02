<template>
  <div class="glass rounded-card p-8 shadow-card border border-brand-border max-w-2xl mx-auto animate-fade-in-up">
    <!-- Progress indicator -->
    <div class="flex items-center justify-center mb-8 gap-2">
      <div
        v-for="step in 5"
        :key="step"
        class="h-2 rounded-full transition-all duration-300"
        :class="step <= currentStep ? 'w-8 bg-brand-accent' : 'w-2 bg-brand-border'"
      />
    </div>

    <!-- Step components -->
    <IntakeProductTypeStep
      v-if="currentStep === 1"
      v-model="formData.productTypes"
      @next="nextStep"
    />

    <IntakeUsageFrequencyStep
      v-if="currentStep === 2"
      v-model="formData.usageFrequency"
      @next="nextStep"
      @back="prevStep"
    />

    <IntakeQuitHistoryStep
      v-if="currentStep === 3"
      v-model:previous-attempts="formData.previousAttempts"
      v-model:longest-quit-duration="formData.longestQuitDuration"
      v-model:years-using="formData.yearsUsing"
      @next="nextStep"
      @back="prevStep"
    />

    <IntakePrimaryReasonStep
      v-if="currentStep === 4"
      v-model="formData.primaryReason"
      @next="nextStep"
      @back="prevStep"
    />

    <IntakeTriggersStep
      v-if="currentStep === 5"
      v-model="formData.triggers"
      :is-submitting="isSubmitting"
      @submit="handleSubmit"
      @back="prevStep"
    />
  </div>
</template>

<script setup lang="ts">
import type { IntakeData } from '~/composables/useIntake'

const emit = defineEmits<{
  complete: []
}>()

const currentStep = ref(1)
const isSubmitting = ref(false)

const formData = reactive<IntakeData>({
  productTypes: [],
  usageFrequency: '',
  yearsUsing: undefined,
  previousAttempts: undefined,
  longestQuitDuration: undefined,
  primaryReason: '',
  triggers: [],
})

const nextStep = () => {
  if (currentStep.value < 5) {
    currentStep.value++
  }
}

const prevStep = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

const handleSubmit = async () => {
  isSubmitting.value = true

  try {
    const { saveIntake } = useIntake()
    await saveIntake(formData)
    emit('complete')
  } catch (error) {
    console.error('Failed to save intake:', error)
    // Error is handled by the composable
  } finally {
    isSubmitting.value = false
  }
}
</script>
