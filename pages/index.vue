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

// SEO Schema
const { organizationSchema, websiteSchema, softwareAppSchema } = useSeoSchema()

// FAQ items for schema (must match LandingFAQ.vue)
const faqItems = [
  {
    question: "When does the program start?",
    answer: "Founding members get access in April 2026. You'll be first to know when it's ready."
  },
  {
    question: "What if the product never launches?",
    answer: "If we haven't launched by Summer 2026, you get an automatic full refund. But we're committed—founding members are why we're building this."
  },
  {
    question: "What if it doesn't work for me?",
    answer: "Full refund within 30 days of starting. No questions, no hassle."
  },
  {
    question: "Can I do this while still vaping?",
    answer: "Yes—we encourage it. This isn't about forcing yourself to stop. You'll naturally stop once the illusions dissolve. Most people have their last vape as part of the program, not before it."
  },
  {
    question: "Do I need to set aside a lot of time?",
    answer: "Each session is about 10-15 minutes. Check-ins are 2-3 minutes. You can do this during a lunch break or after the kids are in bed."
  },
  {
    question: "What happens after the program?",
    answer: "You'll get check-ins at 30, 60, and 90 days to make sure the shift is sticking. And you can always come back if you need a refresher."
  }
]

const faqSchema = generateFaqSchema(faqItems)

// SEO meta tags
const seoTitle = 'Unhooked — Quit Vaping & Smoking Without Willpower'
const seoDescription = 'Stop vaping, quit smoking, or break free from Zyn. Unhooked eliminates your desire for nicotine—no patches, no willpower, no substitutes. 30-day guarantee.'
const seoUrl = 'https://getunhooked.app'
const seoImage = 'https://getunhooked.app/og-image.png'

useHead({
  title: seoTitle,
  meta: [
    // Primary meta tags
    { name: 'description', content: seoDescription },
    { name: 'keywords', content: 'quit vaping, quit smoking, quit zyn, nicotine cessation, stop vaping, stop smoking, nicotine addiction help, quit nicotine pouches' },

    // Open Graph / Facebook
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: seoUrl },
    { property: 'og:title', content: seoTitle },
    { property: 'og:description', content: seoDescription },
    { property: 'og:image', content: seoImage },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: 'Unhooked - Quit Vaping & Smoking For Good' },

    // Twitter
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:url', content: seoUrl },
    { name: 'twitter:title', content: seoTitle },
    { name: 'twitter:description', content: seoDescription },
    { name: 'twitter:image', content: seoImage },
    { name: 'twitter:image:alt', content: 'Unhooked - Quit Vaping & Smoking For Good' }
  ],
  link: [
    { rel: 'canonical', href: seoUrl }
  ],
  script: [
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(organizationSchema)
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(websiteSchema)
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(softwareAppSchema)
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify(faqSchema)
    }
  ]
})

// Use a blank layout for landing page (no app header)
definePageMeta({
  layout: false,
})

const showStickyCta = ref(false)

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
