<template>
  <div class="glass rounded-card p-6 shadow-card border border-brand-border">
    <!-- Header -->
    <div class="mb-4">
      <h2 class="text-xl font-semibold text-white mb-1">Your Journey</h2>
      <p class="text-white-65 text-sm">All 5 illusions dismantled</p>
    </div>

    <!-- Chip row -->
    <div class="flex flex-wrap gap-3">
      <button
        v-for="illusion in illusions"
        :key="illusion.key"
        class="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-input border border-brand-border text-white-85 hover:text-white hover:scale-105 transition-all duration-200"
        @click="handleRevisit(illusion.key)"
      >
        <!-- Checkmark circle with gradient -->
        <div class="w-5 h-5 rounded-full btn-primary flex items-center justify-center flex-shrink-0">
          <!-- Check icon -->
          <svg class="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <!-- Illusion name -->
        <span class="text-sm font-medium">{{ illusion.name }}</span>

        <!-- RefreshCw icon -->
        <svg class="w-3.5 h-3.5 text-white-65" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Illusion {
  key: string
  name: string
  daysSince: number
}

defineProps<{
  illusions: Illusion[]
}>()

function handleRevisit(illusionKey: string) {
  navigateTo(`/reinforcement/${illusionKey}`)
}
</script>
