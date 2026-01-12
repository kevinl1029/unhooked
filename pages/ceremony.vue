<template>
  <div class="min-h-screen p-4 flex items-center justify-center">
    <div class="max-w-2xl mx-auto">
      <div class="glass rounded-card p-8 md:p-12 shadow-card border border-brand-border text-center animate-fade-in-up">
        <!-- Celebration icon -->
        <div class="w-24 h-24 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>

        <h1 class="text-4xl font-bold text-white mb-4">The Final Step</h1>

        <p class="text-white-85 text-lg mb-6">
          You've completed all 5 sessions and seen through the illusions that kept you hooked.
        </p>

        <p class="text-white-65 mb-8">
          The final ceremony conversation is coming soon. This will be a reflective conversation
          to solidify your freedom and celebrate your breakthrough.
        </p>

        <NuxtLink
          to="/dashboard"
          class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card inline-block"
        >
          Return to Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})
</script>
