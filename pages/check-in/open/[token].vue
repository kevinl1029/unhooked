<script setup lang="ts">
/**
 * Check-in open page (via magic link)
 * Validates the token and redirects to the check-in page with prompt in query
 */

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const token = route.params.token as string

// States
type PageState = 'loading' | 'error'
const state = ref<PageState>('loading')
const errorMessage = ref('')

onMounted(async () => {
  try {
    const response = await $fetch(`/api/check-ins/open/${token}`)

    // Handle redirect response (expired token -> most recent pending)
    if (response.redirect) {
      await navigateTo(response.redirect_to)
      return
    }

    // Redirect to check-in page with prompt in query (avoids redundant display)
    const checkInId = response.check_in?.id
    const prompt = response.prompt
    if (checkInId && prompt) {
      await navigateTo(`/check-in/${checkInId}?prompt=${encodeURIComponent(prompt)}`)
    } else if (checkInId) {
      await navigateTo(`/check-in/${checkInId}`)
    } else {
      throw new Error('Invalid check-in response')
    }
  } catch (err: any) {
    errorMessage.value = err.data?.message || 'This check-in is no longer available.'
    state.value = 'error'
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <!-- Loading state -->
    <div v-if="state === 'loading'" class="text-center">
      <div class="animate-pulse">
        <div class="w-16 h-16 rounded-full bg-brand-glass mx-auto mb-4"></div>
        <p class="text-white-65">Loading check-in...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="state === 'error'" class="glass rounded-card p-8 shadow-card border border-brand-border max-w-md text-center">
      <h1 class="text-xl font-semibold text-white mb-4">Check-in Unavailable</h1>
      <p class="text-white-65 mb-6">{{ errorMessage }}</p>
      <NuxtLink
        to="/dashboard"
        class="btn-primary inline-block text-white px-6 py-3 rounded-pill font-semibold shadow-card"
      >
        Return to Dashboard
      </NuxtLink>
    </div>
  </div>
</template>
