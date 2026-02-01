<script setup lang="ts">
// The magic link redirects here with auth tokens in the URL hash/query.
// We need to wait for the Supabase client to process them and establish
// the session before redirecting. Safari is especially strict about timing.
const user = useSupabaseUser()

// If user is already resolved (fast path), redirect immediately
if (user.value) {
  await navigateTo('/dashboard', { replace: true })
}

// Otherwise wait for the auth state to resolve
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/dashboard', { replace: true })
  }
})

// Safety timeout — if auth doesn't resolve, send to login
const timeout = setTimeout(() => {
  if (!user.value) {
    navigateTo('/login', { replace: true })
  }
}, 5000)

onBeforeUnmount(() => clearTimeout(timeout))
</script>

<template>
  <div class="flex items-center justify-center min-h-[50vh]">
    <p class="text-white-65">Signing you in...</p>
  </div>
</template>
