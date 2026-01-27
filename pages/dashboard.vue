<template>
  <div class="min-h-screen px-0 py-4 md:p-4">
    <div class="max-w-4xl mx-auto">
      <!-- Loading state -->
      <div v-if="isLoading" class="flex items-center justify-center py-20">
        <div class="text-white-65">Loading...</div>
      </div>

      <!-- Error state -->
      <div v-else-if="error" class="text-center py-20">
        <p class="text-red-400 mb-4">{{ error }}</p>
        <button
          class="px-4 py-2 bg-brand-glass rounded-lg text-white"
          @click="fetchStatus"
        >
          Try Again
        </button>
      </div>

      <!-- Post-Ceremony Dashboard -->
      <div v-else-if="isPostCeremony" class="animate-fade-in-up space-y-8">
        <!-- Support Section (primary CTA) -->
        <SupportSection />

        <!-- Moment cards section (only if moments exist) -->
        <div v-if="!isMomentLoading && momentData" class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Reconnect with Your Insight</h2>

          <!-- Show regular moment card -->
          <MomentCard
            v-if="!momentData.no_moments"
            :moment-id="momentData.moment_id"
            :quote="momentData.quote"
            :illusion-key="momentData.illusion_key"
            :illusion-name="momentData.illusion_name"
            :relative-time="momentData.relative_time"
            @click="handleMomentClick"
          />

          <!-- Show no-moments warning card -->
          <NoMomentsCard
            v-else
            :illusion-key="momentData.illusion_key"
            :illusion-name="momentData.illusion_name"
          />
        </div>

        <!-- Your Journey chip row -->
        <YourJourneySection :illusions="journeyIllusions" />

        <!-- Artifacts Section -->
        <div v-if="hasJourneyArtifact || hasFinalRecording || hasCheatSheet" class="grid gap-4 md:grid-cols-2">
          <!-- Journey Artifact -->
          <div
            v-if="hasJourneyArtifact"
            class="glass rounded-lg md:rounded-card p-6 shadow-card border border-brand-border"
          >
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-white">Your Journey</h3>
                <p class="text-sm text-white-65">
                  {{ formatDuration(status?.artifacts?.reflective_journey?.audio_duration_ms) }}
                </p>
              </div>
            </div>
            <NuxtLink
              to="/journey"
              class="block w-full text-center btn-primary text-white px-4 py-2 rounded-pill font-medium"
            >
              <span class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </span>
            </NuxtLink>
          </div>

          <!-- Final Recording Artifact -->
          <div
            v-if="hasFinalRecording"
            class="glass rounded-lg md:rounded-card p-6 shadow-card border border-brand-border"
          >
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-white">Your Message</h3>
                <p class="text-sm text-white-65">
                  {{ formatDuration(status?.artifacts?.final_recording?.audio_duration_ms) }}
                </p>
              </div>
            </div>
            <button
              class="w-full btn-primary text-white px-4 py-2 rounded-pill font-medium"
              @click="playFinalRecording"
            >
              <span class="flex items-center justify-center gap-2">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </span>
            </button>
          </div>

          <!-- Toolkit -->
          <div
            v-if="hasCheatSheet"
            class="glass rounded-lg md:rounded-card p-6 shadow-card border border-brand-border"
            :class="{ 'md:col-span-2': !hasJourneyArtifact || !hasFinalRecording }"
          >
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-white">Your Toolkit</h3>
                <p class="text-sm text-white-65">Quick reference guide</p>
              </div>
            </div>
            <NuxtLink
              to="/toolkit"
              class="block w-full text-center btn-primary text-white px-4 py-2 rounded-pill font-medium"
            >
              <span class="flex items-center justify-center gap-2">
                View
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </NuxtLink>
          </div>
        </div>

        <!-- Pending Follow-up -->
        <div
          v-if="nextFollowUp"
          class="glass rounded-lg md:rounded-card p-6 shadow-card border border-brand-border"
        >
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-white">{{ formatFollowUpTitle(nextFollowUp.milestone_type) }}</h3>
              <p class="text-sm text-white-65">
                {{ formatFollowUpDate(nextFollowUp.scheduled_for) }}
              </p>
            </div>
            <NuxtLink
              :to="`/follow-up/${nextFollowUp.id}`"
              class="btn-primary text-white px-4 py-2 rounded-pill font-medium"
            >
              Open
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Ceremony-Ready Dashboard -->
      <div v-else-if="isCeremonyReady" class="animate-fade-in-up space-y-8">
        <!-- Progress complete -->
        <div class="glass rounded-lg md:rounded-card p-6 md:p-8 shadow-card border border-brand-border">
          <h2 class="text-2xl font-bold text-white mb-6 text-center">Your Progress</h2>
          <div class="mb-6">
            <ProgressIndicator
              :illusion-order="status?.progress?.illusion_order || [1, 2, 3, 4, 5]"
              :illusions-completed="status?.progress?.illusions_completed || []"
              :current-illusion="5"
            />
          </div>
          <p class="text-center text-white-85">
            <span class="font-semibold text-brand-accent">All illusions explored</span>
          </p>
        </div>

        <!-- Ceremony CTA -->
        <div class="glass rounded-lg md:rounded-card p-8 md:p-12 shadow-card border border-brand-border text-center">
          <div class="w-20 h-20 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>

          <h2 class="text-3xl font-bold text-white mb-3">You're ready for the final step</h2>
          <p class="text-white-65 mb-6">Set aside about 15 minutes for your ceremony</p>

          <NuxtLink
            to="/ceremony"
            class="btn-primary text-white px-8 py-4 rounded-pill font-semibold shadow-card inline-block text-lg"
          >
            Begin Ceremony
          </NuxtLink>
        </div>
      </div>

      <!-- In-Progress Dashboard -->
      <div v-else-if="isInProgress" class="animate-fade-in-up space-y-8">
        <!-- Progress carousel -->
        <ProgressCarousel
          :illusion-order="status?.progress?.illusion_order || [1, 2, 3, 4, 5]"
          :illusions-completed="status?.progress?.illusions_completed || []"
          :current-illusion="status?.progress?.current_illusion || 1"
        />

        <!-- Moment cards section (only if moments exist) -->
        <div v-if="!isMomentLoading && momentData" class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Reconnect with Your Insight</h2>

          <!-- Show regular moment card -->
          <MomentCard
            v-if="!momentData.no_moments"
            :moment-id="momentData.moment_id"
            :quote="momentData.quote"
            :illusion-key="momentData.illusion_key"
            :illusion-name="momentData.illusion_name"
            :relative-time="momentData.relative_time"
            @click="handleMomentClick"
          />

          <!-- Show no-moments warning card -->
          <NoMomentsCard
            v-else
            :illusion-key="momentData.illusion_key"
            :illusion-name="momentData.illusion_name"
          />
        </div>
      </div>

      <!-- Not Started Dashboard -->
      <div v-else-if="hasNotStarted" class="animate-fade-in-up space-y-8">
        <!-- Welcome card -->
        <div class="glass rounded-lg md:rounded-card p-8 md:p-12 shadow-card border border-brand-border text-center">
          <h1 class="text-3xl md:text-4xl font-bold text-white mb-4">Welcome to Your Journey</h1>
          <p class="text-white-85 text-lg mb-6">
            You're about to discover why quitting nicotine doesn't require willpower — just clarity.
          </p>

          <NuxtLink
            to="/session/1"
            class="btn-primary text-white px-8 py-4 rounded-pill font-semibold shadow-card inline-block text-lg"
          >
            Begin First Session
          </NuxtLink>
        </div>

        <!-- What to expect -->
        <div class="glass rounded-lg md:rounded-card p-6 shadow-card border border-brand-border">
          <h3 class="text-xl font-semibold text-white mb-4">What to expect</h3>
          <ul class="space-y-3 text-white-85">
            <li class="flex items-start gap-3">
              <span class="text-brand-accent">1.</span>
              <span>5 conversational sessions exploring the illusions that keep people hooked</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-brand-accent">2.</span>
              <span>A personalized ceremony to mark your freedom</span>
            </li>
            <li class="flex items-start gap-3">
              <span class="text-brand-accent">3.</span>
              <span>Ongoing support whenever you need it</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Audio Player Modal for final recording -->
    <Teleport to="body">
      <div
        v-if="showAudioPlayer"
        class="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
        @click.self="closeAudioPlayer"
      >
        <div class="glass rounded-card p-6 max-w-lg w-full border border-brand-border">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-xl font-semibold text-white">{{ audioPlayerTitle }}</h3>
            <button
              class="text-white-65 hover:text-white"
              @click="closeAudioPlayer"
            >
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <audio
            ref="audioPlayerRef"
            :src="audioPlayerSrc"
            controls
            class="w-full"
            @ended="closeAudioPlayer"
          />
        </div>
      </div>
    </Teleport>

    <!-- Check-in Interstitial Modal -->
    <CheckInInterstitial
      v-if="showInterstitial && pendingCheckIn"
      :check-in="pendingCheckIn"
      @dismiss="dismissInterstitial"
      @skip="skipCheckIn"
      @respond="respondToCheckIn"
      @complete="completeCheckInInline"
    />
  </div>
</template>

<script setup lang="ts">
import { ILLUSION_NAMES } from '~/server/utils/prompts'

definePageMeta({
  middleware: 'auth'
})

const router = useRouter()
const { intake, fetchIntake } = useIntake()
const {
  status,
  isLoading,
  error,
  fetchStatus,
  isPostCeremony,
  isCeremonyReady,
  isInProgress,
  hasNotStarted,
  hasJourneyArtifact,
  hasFinalRecording,
  hasCheatSheet,
  nextFollowUp,
  illusionsCompletedCount,
  ceremonyDate,
} = useUserStatus()

// Check-in interstitial
const {
  showInterstitial,
  pendingCheckIn,
  checkForInterstitial,
  dismissInterstitial,
  skipCheckIn,
  respondToCheckIn,
  completeCheckInInline,
} = useCheckIns()

// Timezone detection
const { detectAndStoreTimezone } = useTimezoneDetection()

// Audio player state
const showAudioPlayer = ref(false)
const audioPlayerTitle = ref('')
const audioPlayerSrc = ref('')
const audioPlayerRef = ref<HTMLAudioElement | null>(null)

// Moment card state
interface MomentData {
  moment_id: string
  quote: string
  illusion_key: string
  illusion_name: string
  relative_time: string
}

interface NoMomentsData {
  no_moments: true
  illusion_key: string
  illusion_name: string
}

const momentData = ref<MomentData | NoMomentsData | null>(null)
const isMomentLoading = ref(false)

// Fetch data on mount
onMounted(async () => {
  await Promise.all([
    fetchIntake(),
    fetchStatus()
  ])

  // Redirect to onboarding if no intake
  if (!intake.value) {
    router.push('/onboarding')
    return
  }

  // Detect and store timezone (for check-in scheduling)
  detectAndStoreTimezone()

  // Check for pending check-in interstitial (only if not post-ceremony)
  if (!isPostCeremony.value) {
    await checkForInterstitial()
  }

  // Fetch moment data for in-progress and post-ceremony users
  if (isInProgress.value || isPostCeremony.value) {
    await fetchMomentData()
  }
})

// Computed
const nextSessionTitle = computed(() => {
  if (!status.value?.progress) return 'Session 1: The Stress Illusion'

  const illusionNumber = status.value.next_session?.illusionNumber || status.value.progress.current_illusion
  const illusionName = ILLUSION_NAMES[illusionNumber] || `Illusion ${illusionNumber}`

  return `Continue: ${illusionName}`
})

const nextSessionDescription = computed(() => {
  if (!status.value?.progress) return 'Start your journey to freedom from nicotine.'

  const descriptions: Record<number, string> = {
    1: 'Discover why nicotine doesn\'t actually relieve stress—it creates it.',
    2: 'Learn why the "pleasure" is just an illusion masking withdrawal.',
    3: 'Understand why quitting has nothing to do with willpower.',
    4: 'See how nicotine disrupts focus rather than enhancing it.',
    5: 'Break free from the illusion that addiction defines who you are.',
  }

  const illusionNumber = status.value.next_session?.illusionNumber || status.value.progress.current_illusion
  return descriptions[illusionNumber] || 'Continue your journey.'
})

const journeyIllusions = computed(() => {
  const illusionData: Record<number, { key: string; name: string }> = {
    1: { key: 'stress_relief', name: 'Stress Relief' },
    2: { key: 'pleasure', name: 'Pleasure' },
    3: { key: 'willpower', name: 'Willpower' },
    4: { key: 'focus', name: 'Focus' },
    5: { key: 'identity', name: 'Identity' },
  }

  const illusionOrder = status.value?.progress?.illusion_order || [1, 2, 3, 4, 5]

  return illusionOrder.map(num => ({
    key: illusionData[num].key,
    name: illusionData[num].name,
    daysSince: 0, // TODO: calculate from completion dates if needed
  }))
})

// Methods
function formatDate(date: Date | null): string {
  if (!date) return ''
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatDuration(ms: number | undefined): string {
  if (!ms) return ''
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

function formatFollowUpTitle(milestoneType: string): string {
  const titles: Record<string, string> = {
    'day_3': 'Day 3 Check-in',
    'day_7': 'Day 7 Check-in',
    'day_14': 'Day 14 Check-in',
    'day_30': 'Day 30 Check-in',
    'day_90': 'Day 90 Check-in',
    'day_180': 'Day 180 Check-in',
    'day_365': '1 Year Check-in',
  }
  return titles[milestoneType] || 'Check-in'
}

function formatFollowUpDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return 'Ready now'
  } else if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Tomorrow'
  } else {
    return `In ${diffDays} days`
  }
}

async function playFinalRecording() {
  if (!status.value?.artifacts?.final_recording?.audio_path) return

  try {
    // Get signed URL for the audio
    const response = await $fetch<{ audio_url: string }>('/api/ceremony/final-recording/audio')
    audioPlayerTitle.value = 'Your Message to Future Self'
    audioPlayerSrc.value = response.audio_url
    showAudioPlayer.value = true

    // Auto-play after a tick
    await nextTick()
    audioPlayerRef.value?.play()
  } catch (err) {
    console.error('Failed to load final recording:', err)
  }
}

function closeAudioPlayer() {
  showAudioPlayer.value = false
  audioPlayerSrc.value = ''
  if (audioPlayerRef.value) {
    audioPlayerRef.value.pause()
  }
}

function openSupportChat(mode: 'struggling' | 'boost') {
  router.push(`/support?mode=${mode}`)
}

async function fetchMomentData() {
  isMomentLoading.value = true

  try {
    const data = await $fetch<MomentData | NoMomentsData | null>('/api/dashboard/moments')
    momentData.value = data
  } catch (err) {
    console.error('Failed to load moment data:', err)
    // Gracefully degrade - don't show error modal, just hide moment card section
    momentData.value = null
  } finally {
    isMomentLoading.value = false
  }
}

function handleMomentClick(payload: { momentId: string; illusionKey: string }) {
  navigateTo(`/reinforcement/${payload.illusionKey}?moment_id=${payload.momentId}`)
}
</script>
