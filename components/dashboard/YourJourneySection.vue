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
          <Check :size="14" class="text-white" />
        </div>

        <!-- Illusion name -->
        <span class="text-sm font-medium">{{ illusion.name }}</span>

        <!-- Refresh icon -->
        <RefreshCw :size="14" class="text-white-65" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, RefreshCw } from 'lucide-vue-next'

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
