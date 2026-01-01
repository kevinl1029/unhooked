<template>
  <div class="min-h-screen flex items-center justify-center">
    <div class="glass rounded-card p-8 shadow-card border border-brand-border text-center">
      <div class="animate-pulse">
        <p class="text-white text-lg">Signing you in...</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { user } = useAuth()

// Watch for user to be set, then redirect to dashboard
watch(user, (newUser) => {
  if (newUser) {
    navigateTo('/dashboard')
  }
}, { immediate: true })

// Fallback redirect after a few seconds
onMounted(() => {
  setTimeout(() => {
    if (user.value) {
      navigateTo('/dashboard')
    }
  }, 2000)
})
</script>
