<template>
  <div class="glass rounded-card p-8 shadow-card border border-brand-border text-center">
    <h2 class="text-2xl font-semibold text-white mb-3">Need Support?</h2>
    <p class="text-white-65 mb-6">Reconnect with what you've already discovered</p>

    <button
      class="btn-primary text-white px-6 py-3 rounded-pill font-semibold shadow-card inline-flex items-center justify-center gap-2"
      @click="handleGetSupport"
    >
      <!-- MessageCircle icon -->
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      <span>Get Support Now</span>
    </button>
  </div>
</template>

<script setup lang="ts">
function handleGetSupport() {
  navigateTo('/support')
}
</script>
