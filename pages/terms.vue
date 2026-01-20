<script setup lang="ts">
useHead({
  title: 'Terms of Service — Unhooked',
  meta: [
    { name: 'description', content: 'Terms of Service for Unhooked - Read our terms and conditions for using the Unhooked app.' }
  ]
})

definePageMeta({
  layout: false,
})

// Load Termly script on mount
onMounted(() => {
  // Check if script already exists
  if (document.getElementById('termly-jssdk')) return

  const script = document.createElement('script')
  script.id = 'termly-jssdk'
  script.src = 'https://app.termly.io/embed-policy.min.js'
  document.body.appendChild(script)
})
</script>

<template>
  <div class="legal-page min-h-screen">
    <div class="legal-header glass border-b border-brand-border px-4 py-4">
      <div class="max-w-4xl mx-auto flex items-center gap-4">
        <NuxtLink
          to="/"
          class="text-white-65 hover:text-white transition"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </NuxtLink>
        <h1 class="text-xl font-semibold text-white">Terms of Service</h1>
      </div>
    </div>

    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="legal-content bg-white rounded-card p-6 md:p-8 shadow-card">
        <div name="termly-embed" data-id="6952213b-a322-4ac5-8497-98ee19701053"></div>
      </div>
    </div>

    <footer class="legal-footer px-4 py-6 text-center">
      <NuxtLink to="/" class="text-white-65 hover:text-white transition text-sm">
        ← Back to Unhooked
      </NuxtLink>
    </footer>
  </div>
</template>

<style scoped>
.legal-content {
  /* Override Termly's default styles for better readability */
  font-family: system-ui, -apple-system, sans-serif;
}

.legal-content :deep([data-custom-class="body"]),
.legal-content :deep([data-custom-class="body"] *) {
  background: transparent !important;
}

.legal-content :deep([data-custom-class="title"]),
.legal-content :deep([data-custom-class="title"] *) {
  color: #1a1a1a !important;
}

.legal-content :deep([data-custom-class="body_text"]),
.legal-content :deep([data-custom-class="body_text"] *) {
  color: #4a4a4a !important;
}

.legal-content :deep([data-custom-class="link"]),
.legal-content :deep([data-custom-class="link"] *) {
  color: #fc4a1a !important;
}
</style>
