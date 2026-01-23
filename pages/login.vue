<template>
  <div class="max-w-md mx-auto py-16 animate-fade-in-up">
    <div class="glass rounded-card p-8 shadow-card border border-brand-border">
      <h1 class="text-2xl font-bold text-white mb-2 text-center">Welcome Back</h1>
      <p class="text-white-65 text-center mb-2">
        No password needed — just enter your email
      </p>
      <p class="text-white-65 text-center mb-8 text-sm">
        We'll send you a secure sign-in link
      </p>

      <!-- Success State -->
      <div v-if="submitted" class="text-center">
        <div class="mb-4">
          <svg class="w-16 h-16 mx-auto text-brand-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 class="text-xl font-semibold text-white mb-2">Check your email</h2>
        <p class="text-white-65 mb-6">
          We sent a sign-in link to<br>
          <span class="text-white font-medium">{{ email }}</span>
        </p>
        <button
          @click="resetForm"
          class="text-white-65 hover:text-white transition text-sm"
        >
          Use a different email
        </button>
      </div>

      <!-- Form State -->
      <form v-else @submit.prevent="handleSubmit">
        <div class="mb-6">
          <label for="email" class="block text-white-85 text-sm mb-2">
            Email address
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            placeholder="you@example.com"
            class="glass-input w-full px-4 py-3 rounded-pill text-white placeholder-white-65 border border-brand-border focus:border-brand-border-strong focus:outline-none transition"
          />
        </div>

        <div v-if="error" class="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50">
          <p class="text-red-200 text-sm">{{ error }}</p>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="btn-primary w-full text-white px-6 py-3 rounded-pill font-semibold shadow-card disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading">Sending...</span>
          <span v-else>Send sign-in link</span>
        </button>
      </form>

      <p class="text-white-65 text-sm text-center mt-6">
        Don't have an account? The link will create one for you.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { appAccessEnabled } = useAppMode()
const { signInWithEmail, user } = useAuth()

const email = ref('')
const loading = ref(false)
const submitted = ref(false)
const error = ref('')

// Redirect to landing if app access is disabled (validation or disabled mode)
if (!appAccessEnabled) {
  navigateTo('/')
}

// Redirect if already logged in
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/dashboard')
  }
}, { immediate: true })

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    await signInWithEmail(email.value)
    submitted.value = true
  } catch (e: any) {
    error.value = e.message || 'Something went wrong. Please try again.'
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  submitted.value = false
  email.value = ''
  error.value = ''
}
</script>
