<template>
  <div class="flex items-center justify-center min-h-screen">
    <div v-if="error" class="text-red-500">{{ error }}</div>
    <div v-else class="text-white">Authenticating...</div>
  </div>
</template>

<script setup lang="ts">
/**
 * Test-only login page for E2E tests
 *
 * This page is used by E2E tests to authenticate via the test auth endpoint.
 * It handles the full auth flow client-side including setting the session.
 *
 * Usage: /test-login?email=xxx&password=xxx&redirect=/dashboard
 */

// Block in production
if (process.env.NODE_ENV === 'production') {
  throw createError({ statusCode: 404, message: 'Not found' })
}

const route = useRoute()
const supabase = useSupabaseClient()
const error = ref('')

onMounted(async () => {
  const email = route.query.email as string
  const password = route.query.password as string
  const redirectTo = (route.query.redirect as string) || '/dashboard'

  if (!email || !password) {
    error.value = 'Missing email or password query params'
    return
  }

  try {
    // Sign in directly with the Supabase client
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      error.value = authError.message
      return
    }

    if (data.session) {
      // Session is set automatically by the Supabase client
      // Now redirect to the desired page
      await navigateTo(redirectTo)
    } else {
      error.value = 'No session returned'
    }
  } catch (e: any) {
    error.value = e.message || 'Unknown error'
  }
})
</script>
