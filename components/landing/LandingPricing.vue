<script setup lang="ts">
import CheckoutButton from './CheckoutButton.vue'

const { checkoutEnabled } = useAppMode()
</script>

<template>
  <section id="pricing" class="section pricing-section fade-in">
    <div class="container">
      <div class="pricing-card">
        <span class="founding-badge">{{ checkoutEnabled ? 'Founding Member' : 'Coming Soon' }}</span>
        <h3 class="pricing-title">Freedom from nicotine</h3>

        <div class="price">
          <div class="price-amount"><sup>$</sup>199</div>
        </div>
        <p class="value-anchor">Less than a month of vaping, to never want it again.</p>

        <p class="pricing-description">The complete program: conversations, check-ins, your final session, and follow-up support for the first 90 days.</p>

        <CheckoutButton tracking-location="pricing" :full="true">
          <template #default>
            Become a founding member
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </template>
          <template #waitlist>
            Join the Waitlist
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </template>
        </CheckoutButton>

        <p v-if="checkoutEnabled" class="guarantee">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          30-day money-back guarantee. If you don't feel the shift, email us. Full refund, no questions.
        </p>
        <p v-else class="guarantee">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
          Be the first to know when we launch. Early access for waitlist members.
        </p>

        <p class="launch-note">Launching April 2026 — founding member pricing available until public launch.</p>
      </div>
    </div>
  </section>
</template>
