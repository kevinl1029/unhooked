<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <div v-if="!started" class="glass rounded-card p-8 md:p-12 shadow-card border border-brand-border max-w-2xl mx-auto text-center animate-fade-in-up">
      <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">Welcome to Unhooked</h1>
      <p class="text-white-85 text-lg mb-3">
        You're about to start a journey that will change how you see nicotine forever.
      </p>
      <p class="text-white-65 mb-8">
        This isn't about willpower or struggle. It's about seeing through the illusions that keep you hooked.
        We'll guide you through 5 focused conversations that will help you break free—not by resisting cravings,
        but by eliminating them.
      </p>
      <p class="text-white-85 mb-8">
        First, let's learn a bit about you so we can personalize your experience.
      </p>
      <button
        type="button"
        class="btn-primary text-white px-10 py-4 rounded-pill font-semibold shadow-card text-lg"
        @click="started = true"
      >
        Let's Go
      </button>
    </div>

    <IntakeForm v-else @complete="handleComplete" />
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

const router = useRouter()
const started = ref(false)

const handleComplete = () => {
  router.push('/dashboard')
}
</script>
