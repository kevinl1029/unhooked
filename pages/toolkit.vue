<script setup lang="ts">
/**
 * Toolkit Page (Myths Cheat Sheet)
 * In-app only view of the myths the user has seen through
 */

definePageMeta({
  middleware: 'auth',
})

interface MythEntry {
  mythKey: string
  name: string
  myth: string
  truth: string
  userInsight?: string
  insightMomentId?: string
}

interface CheatSheetData {
  entries: MythEntry[]
  generatedAt: string
}

const { data, pending, error, refresh } = await useFetch<{
  artifact_id: string
  cheat_sheet: CheatSheetData
  generated_at: string
  is_final: boolean
}>('/api/ceremony/cheat-sheet')

const cheatSheet = computed(() => data.value?.cheat_sheet)
const isFinal = computed(() => data.value?.is_final)
</script>

<template>
  <div class="min-h-screen py-8 px-4">
    <div class="max-w-2xl mx-auto">
      <!-- Header -->
      <div class="mb-8">
        <NuxtLink
          to="/dashboard"
          class="inline-flex items-center text-white-65 hover:text-white transition mb-4"
        >
          <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </NuxtLink>

        <h1 class="text-3xl font-bold text-white mb-2">Your Toolkit</h1>
        <p class="text-white-65">The myths you've seen through</p>
      </div>

      <!-- Loading state -->
      <div v-if="pending" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-accent border-t-transparent" />
        <p class="mt-4 text-white-65">Loading your toolkit...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-12">
        <p class="text-red-400 mb-4">Failed to load toolkit</p>
        <button
          class="px-4 py-2 bg-brand-glass rounded-lg text-white"
          @click="refresh"
        >
          Try Again
        </button>
      </div>

      <!-- Cheat sheet content -->
      <div v-else-if="cheatSheet" class="space-y-6">
        <!-- Myth cards -->
        <div
          v-for="entry in cheatSheet.entries"
          :key="entry.mythKey"
          class="glass rounded-card p-6 border border-brand-border"
        >
          <h2 class="text-xl font-semibold text-white mb-4">
            {{ entry.name }}
          </h2>

          <!-- The Myth -->
          <div class="mb-4">
            <p class="text-xs text-white-65 uppercase tracking-wider mb-1">The Myth</p>
            <p class="text-white-85 italic">"{{ entry.myth }}"</p>
          </div>

          <!-- The Truth -->
          <div class="mb-4">
            <p class="text-xs text-white-65 uppercase tracking-wider mb-1">The Truth</p>
            <p class="text-white">{{ entry.truth }}</p>
          </div>

          <!-- User's Insight (if captured) -->
          <div v-if="entry.userInsight" class="pt-4 border-t border-brand-border">
            <p class="text-xs text-brand-accent uppercase tracking-wider mb-1">Your Insight</p>
            <p class="text-white-85">"{{ entry.userInsight }}"</p>
          </div>
        </div>

        <!-- Footer note -->
        <div v-if="isFinal" class="text-center text-white-65 text-sm pt-4">
          <p>Generated on {{ new Date(cheatSheet.generatedAt).toLocaleDateString() }}</p>
        </div>
        <div v-else class="text-center text-white-65 text-sm pt-4">
          <p>Complete your ceremony to finalize your toolkit</p>
        </div>
      </div>
    </div>
  </div>
</template>
