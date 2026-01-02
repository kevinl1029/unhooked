<template>
  <header class="glass border-b border-brand-border">
    <div class="container mx-auto px-4 py-4">
      <nav class="flex items-center justify-between">
        <NuxtLink to="/" class="text-xl font-bold text-white">
          Unhooked
        </NuxtLink>
        <div class="flex items-center gap-4">
          <template v-if="user">
            <NuxtLink
              to="/dashboard"
              class="text-white-85 hover:text-white transition"
            >
              Dashboard
            </NuxtLink>
            <span class="text-white-65 hidden sm:inline">|</span>
            <span class="text-white-85 text-sm hidden sm:inline">{{ user.email }}</span>
            <button
              @click="handleSignOut"
              class="text-white-65 hover:text-white transition text-sm"
            >
              Sign out
            </button>
          </template>
          <template v-else>
            <NuxtLink
              to="/login"
              class="text-white-85 hover:text-white transition"
            >
              Continue your journey
            </NuxtLink>
          </template>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const { signOut } = useAuth()

const handleSignOut = async () => {
  try {
    await signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }
}
</script>
