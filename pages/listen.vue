<script setup lang="ts">
useHead({
  title: 'Session Zero — Unhooked',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})

definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="listen-page min-h-screen flex flex-col">
    <!-- Header -->
    <header class="px-4 py-4">
      <div class="max-w-2xl mx-auto">
        <NuxtLink to="/" class="text-xl font-bold text-white hover:text-white-85 transition">
          Unhooked
        </NuxtLink>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div class="max-w-xl w-full text-center">
        <!-- Headline -->
        <h1 class="text-2xl md:text-3xl font-semibold text-white mb-4 animate-fade-in-up">
          Before you decide anything, hear this.
        </h1>

        <!-- Subhead -->
        <p class="text-white-65 text-lg mb-8 animate-fade-in-up" style="animation-delay: 0.1s">
          5 minutes. Headphones help.
        </p>

        <!-- Audio Player -->
        <div class="animate-fade-in-up" style="animation-delay: 0.2s">
          <audio
            controls
            class="w-full max-w-md mx-auto"
            preload="metadata"
          >
            <source src="/audio/session-zero.mp3" type="audio/mpeg">
            Your browser does not support the audio element.
          </audio>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="px-4 py-6 text-center">
      <p class="text-white-65 text-sm">&copy; 2026 Unhooked</p>
    </footer>
  </div>
</template>

<style scoped>
.listen-page {
  background: radial-gradient(circle at top, #104e54 0%, #041f21 100%);
  background-attachment: fixed;
}

/* Custom audio player styling to match brand */
audio {
  filter: invert(1) hue-rotate(180deg);
  border-radius: 9999px;
}

audio::-webkit-media-controls-panel {
  background: rgba(255, 255, 255, 0.1);
}
</style>
