<template>
  <div class="glass rounded-card p-8 shadow-card border border-brand-border text-center">
    <h2 class="text-2xl font-semibold text-white mb-3">Need Support?</h2>
    <p class="text-white-65 mb-6">Reconnect with what you've already discovered</p>

    <button
      class="btn-primary text-white px-6 py-3 rounded-pill font-semibold shadow-card inline-flex items-center justify-center gap-2"
      @click="handleGetSupport"
    >
      <MessageCircle :size="20" />
      <span>Get Support Now</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { MessageCircle } from 'lucide-vue-next'

function handleGetSupport() {
  navigateTo('/support')
}
</script>
