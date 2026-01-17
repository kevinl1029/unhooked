<template>
  <div class="checkout-page">
    <div class="checkout-card">

      <!-- Loading state -->
      <div v-if="loading" class="py-8">
        <div class="animate-spin w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full mx-auto"></div>
        <p class="text-white-65 mt-4">Confirming your purchase...</p>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="py-8">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p class="text-white-65 mb-6">{{ error }}</p>
        <NuxtLink to="/" class="text-brand-accent hover:underline">
          Return to home
        </NuxtLink>
      </div>

      <!-- Success state -->
      <div v-else class="py-4">
        <!-- SVG checkmark icon -->
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-accent/20 flex items-center justify-center">
          <svg class="w-8 h-8 text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 class="text-3xl font-bold text-white mb-2">You're in.</h1>

        <p class="text-xl text-white-85 mb-8">
          Welcome to the founding member group<span v-if="customerName">, {{ customerFirstName }}</span>.
        </p>

        <div class="next-steps-box">
          <h2 class="text-white font-semibold mb-4">What happens next:</h2>

          <ol class="space-y-3 text-white-65">
            <li class="flex gap-3">
              <span class="text-brand-accent font-bold">1.</span>
              <span>A receipt has been sent to <strong class="text-white">{{ customerEmail }}</strong></span>
            </li>
            <li class="flex gap-3">
              <span class="text-brand-accent font-bold">2.</span>
              <span>You'll get a personal welcome email from me within 24 hours</span>
            </li>
            <li class="flex gap-3">
              <span class="text-brand-accent font-bold">3.</span>
              <span>When Unhooked launches (April 2026), you'll be first to get access</span>
            </li>
          </ol>
        </div>

        <div class="text-white-65 text-sm mb-8">
          <p>Questions? Reach me directly at</p>
          <a href="mailto:kevin@getunhooked.app" class="text-brand-accent hover:underline">
            kevin@getunhooked.app
          </a>
        </div>

        <p class="text-white-65 italic mb-6">— Kevin</p>

        <NuxtLink
          to="/"
          class="inline-block text-white-65 hover:text-white transition-colors"
        >
          ← Back to home
        </NuxtLink>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
})

useHead({
  title: "You're In — Unhooked",
})

const route = useRoute()
const loading = ref(true)
const error = ref<string | null>(null)
const customerEmail = ref('')
const customerName = ref('')

const customerFirstName = computed(() => {
  return customerName.value?.split(' ')[0] || ''
})

onMounted(async () => {
  const sessionId = route.query.session_id as string

  if (!sessionId) {
    error.value = 'No session ID found'
    loading.value = false
    return
  }

  try {
    // Fetch session details from our API
    const data = await $fetch('/api/checkout/session', {
      params: { session_id: sessionId }
    })

    customerEmail.value = data.email || ''
    customerName.value = data.name || ''
    loading.value = false

  } catch (err: any) {
    console.error('Failed to fetch session:', err)
    error.value = 'Unable to confirm your purchase. Please check your email for confirmation.'
    loading.value = false
  }
})
</script>
