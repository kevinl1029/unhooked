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
        <!-- YOU'RE FREE Heading -->
        <div class="text-center mb-8">
          <h1 class="text-4xl md:text-5xl font-bold text-white mb-3">YOU'RE FREE</h1>
          <p v-if="ceremonyDate" class="text-white-65 text-lg">
            {{ formatDate(ceremonyDate) }}
          </p>
        </div>

        <!-- Artifacts Grid -->
        <div class="grid gap-4 md:grid-cols-2">
          <!-- Your Journey Card - Ready State -->
          <div
            v-if="journeyStatus === 'ready'"
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

          <!-- Your Journey Card - Skeleton (pending/generating) -->
          <div
            v-else-if="journeyStatus === 'pending' || journeyStatus === 'generating'"
            class="glass rounded-lg md:rounded-card p-6 shadow-card border border-brand-border"
          >
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-brand-accent/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-brand-accent animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-white">Your Journey</h3>
                <p class="text-sm text-white-65">Preparing your journey...</p>
              </div>
            </div>
            <div class="w-full h-10 bg-brand-glass-input rounded-pill shimmer" />
          </div>

          <!-- Your Journey Card - Failed State -->
          <div
            v-else-if="journeyStatus === 'failed'"
            class="glass rounded-lg md:rounded-card p-6 shadow-card border border-brand-border"
          >
            <div class="flex items-center gap-3 mb-3">
              <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-white">Your Journey</h3>
                <p class="text-sm text-red-400">Generation failed</p>
              </div>
            </div>
            <button
              class="w-full btn-primary text-white px-4 py-2 rounded-pill font-medium"
              @click="retryJourneyGeneration"
              :disabled="isRetryingJourney"
            >
              {{ isRetryingJourney ? 'Retrying...' : 'Retry' }}
            </button>
          </div>

          <!-- Your Message Card -->
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
                <p v-if="finalRecordingAudioPath" class="text-sm text-white-65">
                  {{ formatDuration(status?.artifacts?.final_recording?.audio_duration_ms) }}
                </p>
              </div>
            </div>
            <!-- Audio Player for voice recording -->
            <button
              v-if="finalRecordingAudioPath"
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
            <!-- Display text message -->
            <div v-else-if="finalRecordingText" class="text-white-85 text-sm italic">
              "{{ finalRecordingText }}"
            </div>
          </div>

          <!-- Illusions Cheat Sheet Card -->
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
                <h3 class="text-lg font-semibold text-white">Illusions Cheat Sheet</h3>
                <p class="text-sm text-white-65">Quick reference guide</p>
              </div>
            </div>
            <NuxtLink
              to="/cheat-sheet"
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

        <!-- Need a boost? CTA -->
        <div class="glass rounded-lg md:rounded-card p-6 shadow-card border border-brand-border text-center">
          <p class="text-white-85 mb-4">Need a boost?</p>
          <button
            class="btn-primary text-white px-6 py-3 rounded-pill font-semibold shadow-card inline-flex items-center justify-center gap-2"
            @click="openSupportChat"
          >
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>Talk to me</span>
          </button>
        </div>

        <!-- Reinforcement Items - 5 Illusions -->
        <div class="space-y-3">
          <h2 class="text-xl font-semibold text-white mb-4">Reinforce Your Freedom</h2>

          <div
            v-for="illusion in reinforcementIllusions"
            :key="illusion.key"
            class="glass rounded-lg p-4 shadow-card border border-brand-border flex items-center justify-between"
          >
            <div>
              <h3 class="text-white font-medium">{{ illusion.name }}</h3>
              <p class="text-white-65 text-sm">{{ illusion.description }}</p>
            </div>
            <button
              class="btn-primary text-white px-4 py-2 rounded-pill font-medium whitespace-nowrap"
              @click="handleReinforcementClick(illusion.key)"
            >
              Reinforce
            </button>
          </div>
        </div>
      </div>

      <!-- Ceremony-Ready Dashboard (per ADR-005: Ceremony → Progress → Moments) -->
      <div v-else-if="isCeremonyReady" class="animate-fade-in-up space-y-8">
        <!-- Ceremony CTA (PRIMARY - at top per ADR-005) -->
        <div class="glass rounded-lg md:rounded-card p-8 md:p-12 shadow-card border border-brand-border text-center">
          <div class="w-20 h-20 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center mx-auto mb-6">
            <svg class="w-10 h-10 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>

          <h2 class="text-3xl font-bold text-white mb-3">You've seen through all five illusions. You're ready.</h2>
          <p class="text-white-65 mb-6">Your final session—the ceremony—is available now.</p>

          <NuxtLink
            to="/ceremony"
            class="btn-primary text-white px-8 py-4 rounded-pill font-semibold shadow-card inline-block text-lg"
          >
            Begin Ceremony Now
          </NuxtLink>
        </div>

        <!-- Progress carousel (secondary - all illusions completed, all revisitable) -->
        <DashboardProgressCarousel
          :illusion-order="status?.progress?.illusion_order || [1, 2, 3, 4, 5]"
          :illusions-completed="status?.progress?.illusions_completed || []"
          :current-illusion="5"
        />

        <!-- Moment cards section (secondary - if moments exist) -->
        <div v-if="!isMomentLoading && momentData" class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Reconnect with Your Insight</h2>

          <DashboardMomentCard
            v-if="!momentData.no_moments"
            :moment-id="momentData.moment_id"
            :quote="momentData.quote"
            :illusion-key="momentData.illusion_key"
            :illusion-name="momentData.illusion_name"
            :relative-time="momentData.relative_time"
            @click="handleMomentClick"
          />

          <DashboardNoMomentsCard
            v-else
            :illusion-key="momentData.illusion_key"
            :illusion-name="momentData.illusion_name"
          />
        </div>
      </div>

      <!-- In-Progress Dashboard -->
      <div v-else-if="isInProgress" class="animate-fade-in-up space-y-8">
        <!-- Progress carousel -->
        <DashboardProgressCarousel
          :illusion-order="status?.progress?.illusion_order || [1, 2, 3, 4, 5]"
          :illusions-completed="status?.progress?.illusions_completed || []"
          :current-illusion="status?.progress?.current_illusion || 1"
        />

        <!-- Moment cards section (only if moments exist) -->
        <div v-if="!isMomentLoading && momentData" class="space-y-4">
          <h2 class="text-xl font-semibold text-white">Reconnect with Your Insight</h2>

          <!-- Show regular moment card -->
          <DashboardMomentCard
            v-if="!momentData.no_moments"
            :moment-id="momentData.moment_id"
            :quote="momentData.quote"
            :illusion-key="momentData.illusion_key"
            :illusion-name="momentData.illusion_name"
            :relative-time="momentData.relative_time"
            @click="handleMomentClick"
          />

          <!-- Show no-moments warning card -->
          <DashboardNoMomentsCard
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
            to="/session/stress_relief"
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
import { ILLUSION_DATA, illusionNumberToKey } from '~/server/utils/llm/task-types'

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

// Journey artifact polling state
const journeyStatus = ref<'pending' | 'generating' | 'ready' | 'failed' | null>(null)
const journeyPollingInterval = ref<NodeJS.Timeout | null>(null)
const isRetryingJourney = ref(false)

// Fetch data on mount and whenever returning to dashboard
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

  // Fetch moment data for in-progress, ceremony-ready, and post-ceremony users
  if (isInProgress.value || isCeremonyReady.value || isPostCeremony.value) {
    await fetchMomentData()
  }

  // Start polling for journey artifact if post-ceremony
  if (isPostCeremony.value) {
    await startJourneyPolling()
  }
})

// Cleanup polling on unmount
onUnmounted(() => {
  stopJourneyPolling()
})

// Computed
const nextSessionTitle = computed(() => {
  if (!status.value?.progress) return 'Session 1: The Stress Illusion'

  const illusionNumber = status.value.next_session?.illusionNumber || status.value.progress.current_illusion
  const illusionKey = illusionNumberToKey(illusionNumber)
  const illusionName = illusionKey ? ILLUSION_DATA[illusionKey].displayName : `Illusion ${illusionNumber}`

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
  const lastSessions = status.value?.illusion_last_sessions || {}

  return illusionOrder.map(num => {
    const key = illusionData[num].key
    const lastSessionDate = lastSessions[key]
    let daysSince = 0

    if (lastSessionDate) {
      const lastDate = new Date(lastSessionDate)
      const now = new Date()
      const diffTime = now.getTime() - lastDate.getTime()
      daysSince = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    }

    return {
      key,
      name: illusionData[num].name,
      daysSince,
    }
  })
})

// Post-ceremony computed properties
const finalRecordingAudioPath = computed(() => {
  return status.value?.artifacts?.final_recording?.audio_path
})

const finalRecordingText = computed(() => {
  // If there's an audio path, we don't show text
  if (finalRecordingAudioPath.value) return null
  // Otherwise, check if there's a content_text field (typed message)
  // Note: This will need to be added to the API response if not already present
  return (status.value?.artifacts?.final_recording as any)?.content_text || null
})

const reinforcementIllusions = computed(() => [
  { key: 'stress_relief', name: 'Stress Relief', description: 'The illusion that nicotine relieves stress' },
  { key: 'pleasure', name: 'Pleasure', description: 'The illusion of pleasure in every dose' },
  { key: 'willpower', name: 'Willpower', description: 'The illusion that quitting requires willpower' },
  { key: 'focus', name: 'Focus', description: 'The illusion that nicotine enhances focus' },
  { key: 'identity', name: 'Identity', description: 'The illusion that addiction defines you' },
])

// Journey artifact polling methods
async function fetchJourneyStatus() {
  try {
    const response = await $fetch<{ journey: any; status: string }>('/api/ceremony/journey')
    journeyStatus.value = response.status as 'pending' | 'generating' | 'ready' | 'failed'

    // Stop polling when status is ready or failed
    if (journeyStatus.value === 'ready' || journeyStatus.value === 'failed') {
      stopJourneyPolling()
    }
  } catch (err: any) {
    // If 404, journey doesn't exist yet (might be pre-generation)
    if (err.statusCode === 404 || err.response?.status === 404) {
      journeyStatus.value = null
      stopJourneyPolling()
    } else {
      console.error('Failed to fetch journey status:', err)
    }
  }
}

async function startJourneyPolling() {
  // Fetch initial status
  await fetchJourneyStatus()

  // Only start polling if status is pending or generating
  if (journeyStatus.value === 'pending' || journeyStatus.value === 'generating') {
    journeyPollingInterval.value = setInterval(async () => {
      await fetchJourneyStatus()
    }, 3000) // Poll every 3 seconds
  }
}

function stopJourneyPolling() {
  if (journeyPollingInterval.value) {
    clearInterval(journeyPollingInterval.value)
    journeyPollingInterval.value = null
  }
}

async function retryJourneyGeneration() {
  isRetryingJourney.value = true

  try {
    // Call POST /api/ceremony/generate-journey to restart generation
    const response = await $fetch<{ status: string }>('/api/ceremony/generate-journey', {
      method: 'POST',
    })

    journeyStatus.value = response.status as 'pending' | 'generating' | 'ready' | 'failed'

    // Resume polling if generation started
    if (journeyStatus.value === 'pending' || journeyStatus.value === 'generating') {
      await startJourneyPolling()
    }
  } catch (err) {
    console.error('Failed to retry journey generation:', err)
    journeyStatus.value = 'failed'
  } finally {
    isRetryingJourney.value = false
  }
}

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

function openSupportChat() {
  router.push('/support')
}

function handleReinforcementClick(illusionKey: string) {
  navigateTo(`/reinforcement/${illusionKey}`)
}

async function fetchMomentData(retryCount = 0) {
  isMomentLoading.value = true

  try {
    const data = await $fetch<MomentData | NoMomentsData | null>('/api/dashboard/moments')
    momentData.value = data
  } catch (err) {
    console.error('Failed to load moment data:', err)

    // Retry once after 2 second delay on failure
    if (retryCount === 0) {
      console.log('Retrying moment data fetch in 2 seconds...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      await fetchMomentData(1)
      return
    }

    // After retry fails, gracefully degrade - don't show error modal, just hide moment card section
    console.error('Moment data fetch failed after retry')
    momentData.value = null
  } finally {
    isMomentLoading.value = false
  }
}

function handleMomentClick(payload: { momentId: string; illusionKey: string }) {
  navigateTo(`/reinforcement/${payload.illusionKey}?moment_id=${payload.momentId}`)
}
</script>
