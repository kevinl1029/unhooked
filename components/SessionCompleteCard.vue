<template>
  <div class="glass rounded-card p-8 shadow-card border border-brand-border max-w-2xl mx-auto text-center animate-fade-in-up">
    <!-- Checkmark icon -->
    <div class="w-20 h-20 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center mx-auto mb-6">
      <svg class="w-10 h-10 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <h2 class="text-3xl font-bold text-white mb-3">{{ displayHeading }}</h2>
    <p class="text-white-85 text-lg mb-8">
      {{ displaySubtext }}
    </p>

    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <!-- Primary CTA: Return to Dashboard -->
      <button
        type="button"
        class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card"
        @click="$emit('dashboard')"
      >
        Return to Dashboard
      </button>
      <!-- Secondary CTA: Continue to Next Layer (L1/L2) -->
      <button
        v-if="showContinue"
        type="button"
        class="px-8 py-3 rounded-pill font-semibold text-white-85 hover:text-white transition-colors border border-brand-border hover:border-brand-border-strong"
        @click="$emit('continue-layer')"
      >
        Continue to Next Session
      </button>
      <!-- Secondary CTA: Continue to Next Illusion or Complete (hidden when ceremony tease or showContinue) -->
      <button
        v-else-if="nextIllusion && !ceremonyTease"
        type="button"
        class="px-8 py-3 rounded-pill font-semibold text-white-85 hover:text-white transition-colors border border-brand-border hover:border-brand-border-strong"
        @click="$emit('continue', nextIllusion)"
      >
        Continue to Next Session
      </button>
      <button
        v-else-if="!ceremonyTease && !showContinue"
        type="button"
        class="px-8 py-3 rounded-pill font-semibold text-white-85 hover:text-white transition-colors border border-brand-border hover:border-brand-border-strong"
        @click="$emit('finish')"
      >
        Complete the Program
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    nextIllusion?: number | null
    heading?: string
    subtext?: string
    ceremonyTease?: boolean
    showContinue?: boolean
  }>(),
  {
    nextIllusion: null,
    heading: 'Session Complete',
    subtext: 'Great work. Take a moment to let this settle.',
    ceremonyTease: false,
    showContinue: false,
  }
)

// Override heading and subtext when ceremonyTease is true
const displayHeading = computed(() =>
  props.ceremonyTease ? 'All Five Illusions Dismantled' : props.heading
)
const displaySubtext = computed(() =>
  props.ceremonyTease ? 'Your final ceremony is ready.' : props.subtext
)

defineEmits<{
  continue: [illusionNumber: number]
  'continue-layer': []
  dashboard: []
  finish: []
}>()
</script>
