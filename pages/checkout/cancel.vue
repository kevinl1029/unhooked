<template>
  <div class="checkout-page">
    <div class="checkout-card">

      <h1 class="text-2xl font-bold text-white mb-4">No problem.</h1>

      <p class="text-white-65 mb-8">
        When you're ready to quit for good, we'll be here.
      </p>

      <NuxtLink
        to="/"
        class="btn btn-primary"
      >
        Back to Home
      </NuxtLink>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

useHead({
  title: 'Checkout Cancelled — Unhooked',
})
</script>
