<template>
  <div class="glass rounded-card p-6 md:p-12 shadow-card border border-brand-border max-w-2xl mx-auto animate-fade-in-up">
    <!-- Progress indicator -->
    <div class="flex items-center justify-center mb-8 gap-2">
      <div
        v-for="step in 6"
        :key="step"
        class="h-2 rounded-full transition-all duration-300"
        :class="step <= currentStep ? 'w-8 bg-brand-accent' : 'w-2 bg-brand-border'"
      />
    </div>

    <!-- Step components -->
    <IntakePreferredNameStep
      v-if="currentStep === 1"
      v-model="formData.preferredName"
      @next="nextStep"
    />

    <IntakeProductTypeStep
      v-if="currentStep === 2"
      v-model="formData.productTypes"
      @next="nextStep"
      @back="prevStep"
    />

    <IntakeUsageFrequencyStep
      v-if="currentStep === 3"
      v-model="formData.usageFrequency"
      @next="nextStep"
      @back="prevStep"
    />

    <IntakeQuitHistoryStep
      v-if="currentStep === 4"
      v-model:previous-attempts="formData.previousAttempts"
      v-model:longest-quit-duration="formData.longestQuitDuration"
      v-model:years-using="formData.yearsUsing"
      @next="nextStep"
      @back="prevStep"
    />

    <IntakePrimaryReasonStep
      v-if="currentStep === 5"
      v-model="formData.primaryReason"
      @next="nextStep"
      @back="prevStep"
    />

    <IntakeTriggersStep
      v-if="currentStep === 6"
      v-model="formData.triggers"
      :is-submitting="isSubmitting"
      @submit="handleSubmit"
      @back="prevStep"
    />
  </div>
</template>

<script setup lang="ts">
import type { IntakeData, IntakeResponse } from '~/composables/useIntake'

const props = defineProps<{
  prefilledName?: string
  existingIntake?: IntakeResponse | null
}>()

const emit = defineEmits<{
  complete: []
}>()

const currentStep = ref(1)
const isSubmitting = ref(false)

const formData = reactive<IntakeData>({
  preferredName: '',
  productTypes: [],
  usageFrequency: '',
  yearsUsing: undefined,
  previousAttempts: undefined,
  longestQuitDuration: undefined,
  primaryReason: '',
  triggers: [],
})

// Pre-fill formData on mount from existingIntake or prefilledName
onMounted(() => {
  if (props.existingIntake) {
    // Map snake_case DB fields to camelCase formData fields
    formData.preferredName = props.existingIntake.preferred_name || ''
    formData.productTypes = props.existingIntake.product_types
    formData.usageFrequency = props.existingIntake.usage_frequency
    formData.yearsUsing = props.existingIntake.years_using
    formData.previousAttempts = props.existingIntake.previous_attempts
    formData.longestQuitDuration = props.existingIntake.longest_quit_duration
    formData.primaryReason = props.existingIntake.primary_reason
    formData.triggers = props.existingIntake.triggers || []
  } else if (props.prefilledName) {
    // If no existing intake but prefilledName provided, use it
    formData.preferredName = props.prefilledName
  }
})

const nextStep = () => {
  if (currentStep.value < 6) {
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
