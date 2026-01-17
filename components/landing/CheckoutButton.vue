<template>
  <button
    @click="handleCheckout"
    :disabled="isLoading"
    class="btn btn-primary"
  >
    <template v-if="isLoading">
      <span class="loading-spinner"></span>
      Loading...
    </template>
    <template v-else>
      <slot>I'm ready</slot>
    </template>
  </button>
</template>

<script setup lang="ts">
const { utmParams } = useUtmTracking()

const isLoading = ref(false)
const error = ref<string | null>(null)

async function handleCheckout() {
  isLoading.value = true
  error.value = null

  try {
    const { url } = await $fetch('/api/checkout/create-session', {
      method: 'POST',
      body: utmParams.value,
    })

    if (url) {
      window.location.href = url
    } else {
      throw new Error('No checkout URL returned')
    }
  } catch (err: any) {
    console.error('Checkout error:', err)
    error.value = 'Something went wrong. Please try again.'
    isLoading.value = false
  }
}
</script>
