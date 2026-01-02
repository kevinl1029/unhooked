<script setup lang="ts">
definePageMeta({
  middleware: defineNuxtRouteMiddleware(() => {
    // Immediately redirect to dashboard after auth callback
    // Supabase has already handled the token exchange
    return navigateTo('/dashboard', { replace: true })
  })
})
</script>

<template>
  <div></div>
</template>
