<script setup lang="ts">
import LandingHero from '~/components/landing/LandingHero.vue'
import LandingMoment from '~/components/landing/LandingMoment.vue'
import LandingReason from '~/components/landing/LandingReason.vue'
import LandingHowItWorks from '~/components/landing/LandingHowItWorks.vue'
import LandingWhoFor from '~/components/landing/LandingWhoFor.vue'
import LandingFounder from '~/components/landing/LandingFounder.vue'
import LandingPricing from '~/components/landing/LandingPricing.vue'
import LandingFAQ from '~/components/landing/LandingFAQ.vue'
import LandingFinalCTA from '~/components/landing/LandingFinalCTA.vue'
import LandingFooter from '~/components/landing/LandingFooter.vue'
import LandingStickyCTA from '~/components/landing/LandingStickyCTA.vue'
import LandingDivider from '~/components/landing/LandingDivider.vue'

// Page meta for SEO
useHead({
  title: 'Unhooked — Freedom from Nicotine',
  meta: [
    { name: 'description', content: 'Permanently remove your desire for nicotine — without willpower, substitutes, or lifelong resistance.' }
  ]
})

// Use a blank layout for landing page (no app header)
definePageMeta({
  layout: false,
})

const showStickyCta = ref(false)

// Analytics
const { trackEvent } = useAnalytics()
const { initSectionTracking } = useSectionTracking()

// Scroll-triggered animations and sticky CTA visibility
onMounted(() => {
  // Fade-in animation observer
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible')
      }
    })
  }, observerOptions)

  document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el)
  })

  // Sequential stacked line animation
  const stackedObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const lines = entry.target.querySelectorAll('.stacked-line')
        lines.forEach((line, index) => {
          setTimeout(() => {
            line.classList.add('visible')
          }, index * 350)
        })
        stackedObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.3 })

  document.querySelectorAll('.stacked-lines').forEach(el => {
    stackedObserver.observe(el)
  })

  // Smart sticky CTA behavior - hide when hero, pricing, or final CTA visible
  const heroSection = document.querySelector('.hero')
  const pricingSection = document.querySelector('.pricing-section')
  const finalCtaSection = document.querySelector('.final-cta-section')

  const ctaObserverOptions = {
    threshold: 0.2,
    rootMargin: '0px'
  }

  let heroVisible = false
  let pricingVisible = false
  let finalCtaVisible = false

  const updateStickyCta = () => {
    showStickyCta.value = !heroVisible && !pricingVisible && !finalCtaVisible
  }

  const ctaObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.target.classList.contains('hero')) {
        heroVisible = entry.isIntersecting
      }
      if (entry.target.classList.contains('pricing-section')) {
        pricingVisible = entry.isIntersecting
      }
      if (entry.target.classList.contains('final-cta-section')) {
        finalCtaVisible = entry.isIntersecting
      }
    })
    updateStickyCta()
  }, ctaObserverOptions)

  if (heroSection) ctaObserver.observe(heroSection)
  if (pricingSection) ctaObserver.observe(pricingSection)
  if (finalCtaSection) ctaObserver.observe(finalCtaSection)

  // Initialize section view tracking for analytics
  const cleanupSectionTracking = initSectionTracking()

  // Scroll depth tracking
  const scrollThresholds = [25, 50, 75, 100]
  const scrollTracked = new Set<number>()

  function handleScroll() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
    if (scrollHeight <= 0) return

    const scrollPercent = Math.round((window.scrollY / scrollHeight) * 100)

    scrollThresholds.forEach((threshold) => {
      if (scrollPercent >= threshold && !scrollTracked.has(threshold)) {
        scrollTracked.add(threshold)
        trackEvent(`Scroll: ${threshold}%`)
      }
    })
  }

  window.addEventListener('scroll', handleScroll, { passive: true })

  // Cleanup on unmount
  onUnmounted(() => {
    cleanupSectionTracking?.()
    window.removeEventListener('scroll', handleScroll)
  })
})
</script>

<template>
  <main class="landing-page">
    <LandingHero />

    <LandingMoment />
    <LandingDivider />

    <LandingReason />
    <LandingDivider />

    <LandingHowItWorks />
    <LandingDivider />

    <LandingWhoFor />
    <LandingDivider />

    <LandingFounder />

    <LandingPricing />

    <LandingFAQ />

    <LandingFinalCTA />

    <LandingFooter />

    <LandingStickyCTA :visible="showStickyCta" />
  </main>
</template>
