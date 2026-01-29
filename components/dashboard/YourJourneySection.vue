<template>
  <div class="glass rounded-card p-6 shadow-card border border-brand-border">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-xl font-semibold text-white mb-1">Your Journey</h2>
      <p class="text-white-65 text-sm">All 5 illusions dismantled</p>
    </div>

    <!-- Chip row -->
    <div class="flex flex-wrap gap-3">
      <button
        v-for="illusion in illusions"
        :key="illusion.key"
        class="inline-flex items-center gap-2 px-4 py-3 rounded-full border hover:scale-105 transition-all duration-200"
        style="background: rgba(31, 108, 117, 0.5); border-color: rgba(255, 255, 255, 0.2);"
        @click="handleRevisit(illusion.key)"
      >
        <!-- Checkmark circle with gradient - 24px circle -->
        <div
          class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style="background: linear-gradient(135deg, #fc4a1a, #f7b733);"
        >
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <!-- Illusion name and days ago -->
        <div class="flex flex-col items-start">
          <span class="text-sm font-medium text-white">{{ illusion.name }}</span>
          <span class="text-xs text-white-65">{{ formatDaysSince(illusion.daysSince) }}</span>
        </div>

        <!-- RefreshCw icon -->
        <svg class="w-4 h-4 text-white ml-1" style="opacity: 0.7;" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

function formatDaysSince(days: number): string {
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days <= 30) return `${days} days ago`
  return 'Over a month ago'
}

function handleRevisit(illusionKey: string) {
  navigateTo(`/reinforcement/${illusionKey}`)
}
</script>
