<script setup lang="ts">
defineProps<{
  onCtaClick?: () => void
}>()

function scrollToSection(sectionId: string) {
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <section class="section hero">
    <div class="container">
      <div class="hero-content">
        <span class="hero-eyebrow">You're closer than you think</span>
        <h1 class="hero-title">Become someone who <em>doesn't want</em> nicotine anymore</h1>
        <p class="hero-subtitle">Imagine walking past your vape and feeling... nothing. That's where this goes.</p>
        <div class="hero-actions">
          <a href="#pricing" class="btn btn-primary" @click="onCtaClick?.()">
            I'm ready
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </a>
          <p class="price-note"><strong>$199</strong> founding member price · 30-day guarantee</p>
          <a href="#moment" class="secondary-cta" @click.prevent="scrollToSection('moment')">
            Show me how it works
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 5v14M5 12l7 7 7-7"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
