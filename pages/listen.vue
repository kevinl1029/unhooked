<script setup lang="ts">
const route = useRoute()
const { trackEvent, ANALYTICS_EVENTS } = useAnalytics()

// Email source tracking - read 'src' query parameter
// Valid values: welcome, followup, or defaults to 'direct' if missing/invalid
type EmailSource = 'welcome' | 'followup' | 'direct'
const validSources: EmailSource[] = ['welcome', 'followup']

const emailSource = computed<EmailSource>(() => {
  const src = route.query.src as string | undefined
  if (src && validSources.includes(src as EmailSource)) {
    return src as EmailSource
  }
  return 'direct'
})

// Debug mode shows all stages immediately (for development/testing)
const isDebugMode = computed(() => route.query.debug === 'true')

// Content reveal state - starts visible in debug mode
const showBridgeContent = ref(isDebugMode.value)

// Track whether fallback timer has started (prevents multiple timers)
const fallbackTimerStarted = ref(false)
let fallbackTimer: ReturnType<typeof setTimeout> | null = null

// Template refs for DOM elements
const audioPlayer = ref<HTMLAudioElement | null>(null)

// Reveal bridge content
function revealBridgeContent() {
  if (!showBridgeContent.value) {
    showBridgeContent.value = true
  }
}

// Handle audio ended event - reveal bridge content and scroll to it
function onAudioEnded() {
  trackEvent(ANALYTICS_EVENTS.AUDIO_COMPLETED, { email_source: emailSource.value })
  revealBridgeContent()
}

// Track whether we've already tracked the first play event
const hasTrackedAudioStart = ref(false)

// Handle audio play event - start 30-second fallback timer and track first play
function onAudioPlay() {
  // Track AUDIO_STARTED only on first play
  if (!hasTrackedAudioStart.value) {
    hasTrackedAudioStart.value = true
    trackEvent(ANALYTICS_EVENTS.AUDIO_STARTED, { email_source: emailSource.value })
  }

  // Only start timer once, and not in debug mode
  if (!fallbackTimerStarted.value && !isDebugMode.value) {
    fallbackTimerStarted.value = true
    // Start 30-second wall-clock timer (doesn't pause when audio pauses)
    fallbackTimer = setTimeout(() => {
      revealBridgeContent()
    }, 30000)
  }
}

// Clean up timer on component unmount
onUnmounted(() => {
  if (fallbackTimer) {
    clearTimeout(fallbackTimer)
  }
})

// Handle secondary CTA click - track with email source
function onSecondaryCTAClick() {
  trackEvent(ANALYTICS_EVENTS.SECONDARY_CTA_CLICK, { email_source: emailSource.value })
}

useHead({
  title: 'Session Zero — Unhooked',
  meta: [
    { name: 'robots', content: 'noindex, nofollow' }
  ]
})

definePageMeta({
  layout: false,
})
</script>

<template>
  <div class="listen-page min-h-screen flex flex-col">
    <!-- Header -->
    <header class="px-4 py-4">
      <div class="max-w-2xl mx-auto">
        <NuxtLink to="/" class="text-xl font-bold text-white hover:text-white-85 transition">
          Unhooked
        </NuxtLink>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col items-center justify-center px-4 py-8">
      <div class="max-w-xl w-full text-center">
        <!-- Headline -->
        <h1 class="text-2xl md:text-3xl font-semibold text-white mb-4 animate-fade-in-up">
          Before you decide anything, hear this.
        </h1>

        <!-- Subhead -->
        <p class="text-white-65 text-lg mb-8 animate-fade-in-up" style="animation-delay: 0.1s">
          5 minutes. Headphones help.
        </p>

        <!-- Audio Player -->
        <div class="animate-fade-in-up" style="animation-delay: 0.2s">
          <audio
            ref="audioPlayer"
            controls
            class="w-full max-w-md mx-auto"
            preload="metadata"
            @play="onAudioPlay"
            @ended="onAudioEnded"
          >
            <source src="/audio/session-zero.mp3" type="audio/mpeg">
            Your browser does not support the audio element.
          </audio>
        </div>

        <!-- Bridge Section (revealed after audio ends or in debug mode) -->
        <div
          class="mt-12 bridge-content"
          :class="{ 'bridge-content--visible': showBridgeContent }"
        >
          <h2 class="text-xl md:text-2xl font-semibold text-white mb-4">
            That belief—that quitting requires willpower—is just one of five.
          </h2>
          <p class="text-white-85 text-base">
            There are four more illusions keeping you hooked. Once you see them clearly, the desire to use simply falls away.
          </p>
        </div>

        <!-- Primary CTA Section -->
        <div
          class="mt-10 bridge-content"
          :class="{ 'bridge-content--visible': showBridgeContent }"
          :style="{ transitionDelay: showBridgeContent ? '0.15s' : '0s' }"
        >
          <p class="text-white-85 text-lg mb-4">Ready to see the rest?</p>
          <LandingCheckoutButton
            tracking-location="listen"
            :email-source="emailSource"
            large
          >
            Become a founding member — $199 →
          </LandingCheckoutButton>
          <p class="text-white-65 text-sm mt-3">
            30-day guarantee · Start when the program launches
          </p>
        </div>

        <!-- Secondary CTA Section -->
        <div
          class="mt-8 bridge-content"
          :class="{ 'bridge-content--visible': showBridgeContent }"
          :style="{ transitionDelay: showBridgeContent ? '0.3s' : '0s' }"
        >
          <p class="text-white-65 text-sm mb-2">Want to learn more first?</p>
          <NuxtLink
            to="/?ref=listen"
            class="text-white-85 hover:text-white underline transition"
            @click="onSecondaryCTAClick"
          >
            Read the full story →
          </NuxtLink>
        </div>
      </div>
    </main>

    <!-- Footer -->
    <footer class="px-4 py-6 text-center">
      <p class="text-white-65 text-sm">&copy; 2026 Unhooked</p>
    </footer>
  </div>
</template>

<style scoped>
.listen-page {
  background: radial-gradient(circle at top, #104e54 0%, #041f21 100%);
  background-attachment: fixed;
}

/* Custom audio player styling to match brand */
audio {
  filter: invert(1) hue-rotate(180deg);
  border-radius: 9999px;
}

audio::-webkit-media-controls-panel {
  background: rgba(255, 255, 255, 0.1);
}

/* Bridge content - starts invisible but takes up space */
.bridge-content {
  opacity: 0;
  visibility: hidden;
  transition: opacity 1s ease-out, visibility 0s linear 1s;
}

/* When visible - fade in */
.bridge-content--visible {
  opacity: 1;
  visibility: visible;
  transition: opacity 1s ease-out, visibility 0s linear 0s;
}
</style>
