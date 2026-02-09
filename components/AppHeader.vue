<template>
  <header class="glass border-b border-brand-border">
    <div class="container mx-auto px-4 py-4">
      <nav class="flex items-center justify-between gap-4">
        <NuxtLink to="/" class="text-xl font-bold text-white shrink-0">
          Unhooked
        </NuxtLink>
        <div class="flex flex-col items-end gap-1">
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
                :disabled="isSigningOut"
                class="text-white-65 hover:text-white transition text-sm disabled:opacity-70"
              >
                {{ isSigningOut ? 'Signing out...' : 'Sign out' }}
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
          <p v-if="signOutError" class="text-red-300 text-xs">
            {{ signOutError }}
          </p>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const { signOut } = useAuth()
const isSigningOut = ref(false)
const signOutError = ref('')

const handleSignOut = async () => {
  if (isSigningOut.value) return
  isSigningOut.value = true
  signOutError.value = ''

  try {
    await signOut()
  } catch (error) {
    console.error('Sign out error:', error)
    signOutError.value = 'Sign out had trouble. Redirecting to home...'
    await navigateTo('/', { replace: true })
  } finally {
    isSigningOut.value = false
  }
}
</script>
