<script setup lang="ts">
defineProps<{
  visible: boolean
  onCtaClick?: () => void
}>()
</script>

<template>
  <div class="sticky-cta" :class="{ 'visible': visible }">
    <!-- This will be replaced with CheckoutButton in PR2 -->
    <button class="btn btn-primary btn-block" @click="onCtaClick?.()">
      I'm ready
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
    </button>
  </div>
</template>
