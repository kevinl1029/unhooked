<script setup lang="ts">
import CheckoutButton from './CheckoutButton.vue'
</script>

<template>
  <section id="pricing" class="section pricing-section fade-in">
    <div class="container">
      <div class="pricing-card">
        <span class="founding-badge">Founding Member</span>
        <h3 class="pricing-title">Freedom from nicotine</h3>

        <div class="price">
          <div class="price-amount"><sup>$</sup>199</div>
        </div>
        <p class="value-anchor">Less than a month of vaping, to never want it again.</p>

        <p class="pricing-description">The complete program: conversations, check-ins, your final session, and follow-up support for the first 90 days.</p>

        <CheckoutButton class="pricing-checkout-btn">
          Become a founding member
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </CheckoutButton>

        <p class="guarantee">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          30-day money-back guarantee. If you don't feel the shift, email us. Full refund, no questions.
        </p>

        <p class="launch-note">Launching April 2026 — founding member pricing available until public launch.</p>
      </div>
    </div>
  </section>
</template>
