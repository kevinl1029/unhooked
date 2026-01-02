<template>
  <div class="glass rounded-card p-8 shadow-card border border-brand-border max-w-2xl mx-auto text-center animate-fade-in-up">
    <!-- Checkmark icon -->
    <div class="w-20 h-20 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center mx-auto mb-6">
      <svg class="w-10 h-10 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
      </svg>
    </div>

    <h2 class="text-3xl font-bold text-white mb-3">Session Complete</h2>
    <p class="text-white-85 text-lg mb-8">
      Great work. Take a moment to let this settle.
    </p>

    <div class="flex flex-col sm:flex-row gap-3 justify-center">
      <button
        v-if="nextMyth"
        type="button"
        class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card"
        @click="$emit('continue', nextMyth)"
      >
        Continue to Next Session
      </button>
      <button
        v-else
        type="button"
        class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card"
        @click="$emit('finish')"
      >
        Complete the Program
      </button>
      <button
        type="button"
        class="px-8 py-3 rounded-pill font-semibold text-white-85 hover:text-white transition-colors border border-brand-border hover:border-brand-border-strong"
        @click="$emit('dashboard')"
      >
        Return to Dashboard
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  nextMyth: number | null
}>()

defineEmits<{
  continue: [mythNumber: number]
  dashboard: []
  finish: []
}>()
</script>
