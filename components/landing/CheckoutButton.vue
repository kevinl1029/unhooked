<template>
  <div class="checkout-button-wrapper" :class="{ 'checkout-button-block': block }">
    <button
      @click="handleClick"
      :disabled="isLoading"
      :class="buttonClasses"
    >
      <template v-if="isLoading">
        <span class="loading-spinner"></span>
        Loading...
      </template>
      <template v-else-if="!appEnabled">
        <slot name="waitlist">Join the Waitlist</slot>
      </template>
      <template v-else>
        <slot>I'm ready</slot>
      </template>
    </button>
    <p v-if="error" class="checkout-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const appEnabled = computed(() => config.public.appEnabled)

const props = defineProps<{
  block?: boolean
  large?: boolean
  full?: boolean
}>()

const buttonClasses = computed(() => [
  'btn',
  'btn-primary',
  { 'btn-block': props.block },
  { 'btn-large': props.large },
  { 'btn-full': props.full },
])

const { utmParams } = useUtmTracking()

const isLoading = ref(false)
const error = ref<string | null>(null)

function handleClick() {
  if (!appEnabled.value) {
    scrollToWaitlist()
  } else {
    handleCheckout()
  }
}

function scrollToWaitlist() {
  const emailForm = document.querySelector('.final-cta-secondary')
  if (emailForm) {
    emailForm.scrollIntoView({ behavior: 'smooth', block: 'center' })
    // Focus the email input after scrolling
    setTimeout(() => {
      const emailInput = emailForm.querySelector('input[type="email"]') as HTMLInputElement
      if (emailInput) {
        emailInput.focus()
      }
    }, 500)
  }
}

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
