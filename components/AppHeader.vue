<template>
  <header class="glass border-b border-brand-border">
    <div class="container mx-auto px-4 py-4">
      <nav class="flex items-center justify-between">
        <NuxtLink to="/" class="text-xl font-bold text-white">
          Unhooked
        </NuxtLink>
        <div class="space-x-4">
          <template v-if="user">
            <NuxtLink
              to="/dashboard"
              class="text-white-85 hover:text-white transition"
            >
              Dashboard
            </NuxtLink>
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
</script>
