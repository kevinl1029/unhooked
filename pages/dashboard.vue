<template>
  <div class="animate-fade-in-up">
    <div class="glass rounded-card p-8 shadow-card border border-brand-border">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-white">Dashboard</h1>
        <button
          @click="handleSignOut"
          class="text-white-65 hover:text-white transition text-sm"
        >
          Sign out
        </button>
      </div>

      <div v-if="user" class="mb-6 p-4 rounded-lg bg-brand-glass border border-brand-border">
        <p class="text-white-65 text-sm mb-1">Signed in as</p>
        <p class="text-white font-medium">{{ user.email }}</p>
      </div>

      <p class="text-white-65">
        Chat interface will go here. LLM integration coming in Phase 1.3.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
// Protect this route - redirect to login if not authenticated
definePageMeta({
  middleware: 'auth'
})

const { user, signOut } = useAuth()

const handleSignOut = async () => {
  try {
    await signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }
}
</script>
