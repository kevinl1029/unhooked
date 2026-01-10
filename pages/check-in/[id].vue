<script setup lang="ts">
/**
 * Check-in page (direct access by ID)
 * For when user accesses check-in directly from dashboard
 */

definePageMeta({
  middleware: 'auth',
})

const route = useRoute()
const router = useRouter()
const checkInId = route.params.id as string

const supabase = useSupabaseClient()
const user = useSupabaseUser()

// Fetch check-in data
const { data: checkIn, error, pending } = await useAsyncData(`check-in-${checkInId}`, async () => {
  const { data, error } = await supabase
    .from('check_in_schedule')
    .select('*')
    .eq('id', checkInId)
    .eq('user_id', user.value?.id)
    .single()

  if (error) throw error
  return data
})

// Handle skip
async function handleSkip() {
  await $fetch(`/api/check-ins/${checkInId}/skip`, { method: 'POST' })
  await navigateTo('/dashboard')
}

// Handle complete (after voice response)
async function handleComplete(conversationId: string) {
  await $fetch(`/api/check-ins/${checkInId}/complete`, {
    method: 'POST',
    body: { response_conversation_id: conversationId },
  })
  await navigateTo('/dashboard')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center p-4">
    <!-- Loading state -->
    <div v-if="pending" class="text-center">
      <div class="animate-pulse">
        <div class="w-16 h-16 rounded-full bg-brand-glass mx-auto mb-4"></div>
        <p class="text-white-65">Loading check-in...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="glass rounded-card p-8 shadow-card border border-brand-border max-w-md text-center">
      <h1 class="text-xl font-semibold text-white mb-4">Check-in Not Found</h1>
      <p class="text-white-65 mb-6">This check-in doesn't exist or has been completed.</p>
      <NuxtLink
        to="/dashboard"
        class="btn-primary inline-block text-white px-6 py-3 rounded-pill font-semibold shadow-card"
      >
        Return to Dashboard
      </NuxtLink>
    </div>

    <!-- Check-in content -->
    <div v-else-if="checkIn" class="glass rounded-card p-8 shadow-card border border-brand-border max-w-md w-full animate-fade-in-up">
      <div class="text-center mb-8">
        <p class="eyebrow text-white mb-2">CHECK-IN</p>
        <h1 class="text-2xl font-bold text-white mb-4">{{ checkIn.prompt_template }}</h1>
      </div>

      <!-- Voice response area -->
      <div class="flex flex-col items-center gap-6">
        <div class="w-20 h-20 rounded-full bg-brand-accent/20 flex items-center justify-center cursor-pointer hover:bg-brand-accent/30 transition">
          <svg class="w-10 h-10 text-brand-accent" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z"/>
          </svg>
        </div>
        <p class="text-white-65 text-sm">Tap to respond</p>
      </div>

      <!-- Skip link -->
      <div class="mt-8 text-center">
        <button
          @click="handleSkip"
          class="text-white-65 hover:text-white text-sm underline transition"
        >
          Skip for now
        </button>
      </div>
    </div>
  </div>
</template>
