<script setup lang="ts">
import CheckoutButton from './CheckoutButton.vue'

const config = useRuntimeConfig()
const appEnabled = computed(() => config.public.appEnabled)

const { utmParams } = useUtmTracking()

const email = ref('')
const isSubmitting = ref(false)
const submitState = ref<'idle' | 'success' | 'error'>('idle')
const errorMessage = ref('')

async function handleEmailSubmit(e: Event) {
  e.preventDefault()

  if (!email.value.trim() || isSubmitting.value) return

  isSubmitting.value = true
  submitState.value = 'idle'
  errorMessage.value = ''

  try {
    await $fetch('/api/subscribe', {
      method: 'POST',
      body: {
        email: email.value.trim(),
        source: appEnabled.value ? 'landing_page_nurture' : 'landing_page_waitlist',
        ...utmParams.value
      }
    })

    submitState.value = 'success'
    email.value = ''

  } catch (err: unknown) {
    submitState.value = 'error'
    // Use specific error messages from API, or fallback
    const fetchError = err as { data?: { statusMessage?: string } }
    errorMessage.value = fetchError.data?.statusMessage || 'Something went wrong. Please try again.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="section final-cta-section fade-in">
    <div class="container content-container">
      <!-- Path A: Ready Now (or waitlist if app disabled) -->
      <div v-if="appEnabled" class="final-cta-primary">
        <h2 class="final-cta-headline">Ready to become someone who doesn't want it anymore?</h2>
        <CheckoutButton :large="true">
          Become a founding member — $199
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </CheckoutButton>
        <p class="final-cta-subtext">30-day guarantee · Founding member pricing until launch</p>
      </div>

      <!-- Waitlist Section (shown as primary when app disabled, secondary when enabled) -->
      <div class="final-cta-secondary">
        <h3 v-if="appEnabled" class="email-headline">Not ready yet?</h3>
        <h2 v-else class="final-cta-headline">Be the first to know when we launch</h2>
        <p class="email-body">
          {{ appEnabled
            ? "Get one email that might change how you see nicotine. No spam. Just a taste of what we do."
            : "Join the waitlist for early access and founding member pricing."
          }}
        </p>

        <!-- Success State - Form transforms to success message -->
        <div v-if="submitState === 'success'" class="email-success">
          <div class="email-success-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <p class="email-success-message">Check your inbox</p>
        </div>

        <!-- Form State -->
        <form v-else class="email-form" @submit="handleEmailSubmit">
          <input
            type="email"
            v-model="email"
            placeholder="Your email"
            class="email-input"
            :disabled="isSubmitting"
            required
          />
          <button
            type="submit"
            class="btn btn-secondary"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">Sending...</span>
            <span v-else>{{ appEnabled ? 'Send it to me' : 'Join the Waitlist' }}</span>
          </button>
        </form>

        <!-- Error Message -->
        <p v-if="submitState === 'error'" class="email-error">
          {{ errorMessage }}
        </p>
      </div>
    </div>
  </section>
</template>
