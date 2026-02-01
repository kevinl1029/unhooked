<script setup lang="ts">
// The @nuxtjs/supabase module disables SSR for this route so the PKCE
// code exchange can happen client-side via createBrowserClient.
// We watch for the session to appear, then redirect.

const user = useSupabaseUser()

// If the user is already authenticated (exchange completed during plugin init),
// redirect immediately.
if (user.value) {
  await navigateTo('/dashboard', { replace: true })
}

// Otherwise wait for the auth state to update after the PKCE exchange.
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/dashboard', { replace: true })
  }
})

// Safety timeout: if the exchange never completes, send back to login.
const timeout = setTimeout(() => {
  if (!user.value) {
    navigateTo('/login', { replace: true })
  }
}, 5000)

onBeforeUnmount(() => clearTimeout(timeout))
</script>

<template>
  <div class="flex items-center justify-center min-h-screen">
    <p class="text-white-85">Signing you in...</p>
  </div>
</template>
