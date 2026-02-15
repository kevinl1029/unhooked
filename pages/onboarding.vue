<template>
  <div class="min-h-screen flex items-center justify-center p-0 md:p-4">
    <div v-if="!started" class="glass rounded-card p-6 md:p-12 shadow-card border border-brand-border max-w-2xl mx-auto text-center animate-fade-in-up">
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
        :disabled="isDataLoading"
        @click="handleStart"
      >
        {{ isDataLoading ? 'Loading...' : "Let's Go" }}
      </button>
    </div>

    <IntakeForm
      v-else
      :prefilled-name="prefilledName"
      :existing-intake="existingIntake"
      @complete="handleComplete"
    />
  </div>
</template>

<script setup lang="ts">
import type { IntakeResponse } from '~/composables/useIntake'

definePageMeta({
  middleware: 'auth'
})

const router = useRouter()
const started = ref(false)
const isDataLoading = ref(false)
const prefilledName = ref('')
const existingIntake = ref<IntakeResponse | null>(null)

// Background data fetching on mount
onMounted(async () => {
  const { getProfile } = useAuth()
  const { fetchIntake, intake } = useIntake()

  // Fetch profile and intake in parallel
  const results = await Promise.allSettled([
    getProfile(),
    fetchIntake()
  ])

  // Extract first name from profile.full_name (first word before space)
  const profileResult = results[0]
  if (profileResult.status === 'fulfilled' && profileResult.value?.full_name) {
    const firstName = profileResult.value.full_name.split(' ')[0]
    prefilledName.value = firstName
  }
  // If profile fetch fails, prefilledName stays empty (no error shown per FR-5.6)

  // Populate existingIntake from the intake ref if fetch succeeds
  if (intake.value) {
    existingIntake.value = intake.value
  }
  // If intake fetch fails, existingIntake stays null (no error shown)
})

const handleStart = async () => {
  // If fetches are still in progress, show brief loading state
  isDataLoading.value = true

  // Brief delay to allow background fetches to complete if they're almost done
  await new Promise(resolve => setTimeout(resolve, 100))

  isDataLoading.value = false
  started.value = true
}

const handleComplete = () => {
  router.push('/dashboard')
}
</script>
