<script setup lang="ts">
import CheckoutButton from './CheckoutButton.vue'

defineProps<{
  visible: boolean
}>()
</script>

<template>
  <div class="sticky-cta" :class="{ 'visible': visible }">
    <CheckoutButton tracking-location="sticky" :block="true">
      <template #default>
        I'm ready
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </template>
      <template #waitlist>
        Get Early Access
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M5 12h14M12 5l7 7-7 7"/>
        </svg>
      </template>
    </CheckoutButton>
  </div>
</template>
