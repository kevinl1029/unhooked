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
          class="btn-primary w-full text-white px-6 py-3 rounded-pill font-semibold shadow-card disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          <span v-if="loading">Sending...</span>
          <span v-else>Send sign-in link</span>
        </button>

        <!-- Social Sign-on (Staging Only) -->
        <div v-if="isStaging" class="flex items-center gap-4 mt-8 mb-6">
          <div class="h-px bg-white-15 flex-1"></div>
          <span class="text-xs font-medium uppercase tracking-widest text-white-65">Or continue with</span>
          <div class="h-px bg-white-15 flex-1"></div>
        </div>

        <button
          v-if="isStaging"
          type="button"
          @click="handleGoogleSignIn"
          :disabled="loading"
          class="glass w-full text-white px-6 py-3 rounded-pill font-medium border border-brand-border hover:border-brand-border-strong hover:bg-white/5 transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Google
        </button>
      </form>

      <p class="text-white-65 text-sm text-center mt-6">
        Don't have an account? The link will create one for you.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { appAccessEnabled, isStaging } = useAppMode()
const { signInWithEmail, signInWithGoogle, user } = useAuth()

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

const handleGoogleSignIn = async () => {
  loading.value = true
  error.value = ''

  try {
    await signInWithGoogle()
  } catch (e: any) {
    error.value = e.message || 'Something went wrong. Please try again.'
    loading.value = false
  }
}
</script>
