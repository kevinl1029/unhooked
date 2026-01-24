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
  meta: [
    { name: 'description', content: 'Your checkout was cancelled. When you\'re ready to quit nicotine for good, Unhooked will be here.' },
    { name: 'robots', content: 'noindex, nofollow' },
    // Open Graph
    { property: 'og:title', content: 'Checkout Cancelled — Unhooked' },
    { property: 'og:description', content: 'When you\'re ready to quit nicotine for good, Unhooked will be here.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:image', content: 'https://getunhooked.app/og-image.png' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Checkout Cancelled — Unhooked' },
    { name: 'twitter:description', content: 'When you\'re ready to quit nicotine for good, Unhooked will be here.' },
    { name: 'twitter:image', content: 'https://getunhooked.app/og-image.png' },
  ],
})
</script>
