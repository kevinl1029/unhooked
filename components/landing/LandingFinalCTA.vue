<script setup lang="ts">
import CheckoutButton from './CheckoutButton.vue'

const config = useRuntimeConfig()
const appEnabled = computed(() => config.public.appEnabled)

const email = ref('')

function handleEmailSubmit(e: Event) {
  e.preventDefault()
  // TODO: Integrate with email service in future PR
  console.log('Email submitted:', email.value)
  alert("Thanks! We'll be in touch.")
  email.value = ''
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
        <form class="email-form" @submit="handleEmailSubmit">
          <input
            type="email"
            v-model="email"
            placeholder="Your email"
            class="email-input"
            required
          />
          <button type="submit" class="btn btn-secondary">
            {{ appEnabled ? 'Send it to me' : 'Join the Waitlist' }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
