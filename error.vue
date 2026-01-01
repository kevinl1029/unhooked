<script setup lang="ts">
const props = defineProps({
  error: Object
})

const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center text-white px-4">
    <div class="glass rounded-card p-8 shadow-card border border-brand-border max-w-md w-full text-center">
      <h1 class="text-3xl font-bold mb-4">Something went wrong</h1>
      <p class="text-white-85 mb-6">
        {{ error?.message || 'An unexpected error occurred' }}
      </p>
      <button
        @click="handleError"
        class="btn-primary inline-block text-white px-6 py-3 rounded-pill font-semibold"
      >
        Go back home
      </button>
    </div>
  </div>
</template>
