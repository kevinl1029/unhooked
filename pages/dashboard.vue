<template>
  <div class="min-h-screen px-0 py-4 md:p-4">
    <div class="max-w-4xl mx-auto">
      <!-- User info bar -->
      <div class="flex items-center justify-between mb-8 px-4 md:px-0">
        <div>
          <p class="text-white-65 text-sm">Signed in as</p>
          <p class="text-white font-medium">{{ user?.email }}</p>
        </div>
        <button
          @click="handleSignOut"
          class="text-white-65 hover:text-white transition text-sm"
        >
          Sign out
        </button>
      </div>

      <!-- Loading state -->
      <div v-if="isLoadingData" class="flex items-center justify-center py-20">
        <div class="text-white-65">Loading...</div>
      </div>

      <!-- Program completed state -->
      <div v-else-if="progress?.program_status === 'completed'" class="animate-fade-in-up">
        <div class="glass rounded-none md:rounded-card p-8 md:p-12 shadow-card border-y md:border border-brand-border text-center mb-8">
          <!-- Checkmark icon -->
          <div class="w-24 h-24 rounded-full bg-brand-accent/20 border-2 border-brand-accent flex items-center justify-center mx-auto mb-6">
            <svg class="w-12 h-12 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 class="text-4xl font-bold text-white mb-4">You're Unhooked</h1>
          <p class="text-white-85 text-lg mb-3">
            Congratulations on completing the program.
          </p>
          <p class="text-white-65 mb-4">
            You've worked through all 5 myths and gained the clarity to be free from nicotine.
          </p>
          <p v-if="progress.completed_at" class="text-white-65 text-sm">
            Completed on {{ formatDate(progress.completed_at) }}
          </p>
        </div>

        <!-- Progress indicator for review -->
        <div class="glass rounded-none md:rounded-card p-6 shadow-card border-y md:border border-brand-border">
          <h2 class="text-xl font-semibold text-white mb-4 text-center">Your Journey</h2>
          <ProgressIndicator
            :myth-order="progress.myth_order"
            :myths-completed="progress.myths_completed"
            :current-myth="progress.current_myth"
          />
        </div>
      </div>

      <!-- In progress state -->
      <div v-else class="animate-fade-in-up space-y-8">
        <!-- Progress card -->
        <div class="glass rounded-none md:rounded-card p-6 md:p-8 shadow-card border-y md:border border-brand-border">
          <h2 class="text-2xl font-bold text-white mb-6 text-center">Your Progress</h2>

          <!-- Progress indicator -->
          <div class="mb-6">
            <ProgressIndicator
              :myth-order="progress?.myth_order || [1, 2, 3, 4, 5]"
              :myths-completed="progress?.myths_completed || []"
              :current-myth="progress?.current_myth || 1"
            />
          </div>

          <!-- Sessions completed text -->
          <p class="text-center text-white-85">
            <span class="font-semibold text-brand-accent">{{ progress?.myths_completed.length || 0 }}</span>
            <span> of 5 sessions completed</span>
          </p>
        </div>

        <!-- Next session card -->
        <div class="glass rounded-none md:rounded-card p-6 md:p-8 shadow-card border-y md:border border-brand-border">
          <div class="mb-4">
            <h3 class="text-xl font-semibold text-white mb-2">
              {{ nextSessionTitle }}
            </h3>
            <p class="text-white-85">
              {{ nextSessionDescription }}
            </p>
          </div>

          <NuxtLink
            :to="`/session/${progress?.current_myth || 1}`"
            class="btn-primary text-white px-8 py-3 rounded-pill font-semibold shadow-card inline-block"
          >
            {{ progress?.myths_completed.length === 0 ? 'Start First Session' : 'Continue' }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MYTH_NAMES } from '~/server/utils/prompts'

definePageMeta({
  middleware: 'auth'
})

const router = useRouter()
const { user, signOut } = useAuth()
const { intake, fetchIntake } = useIntake()
const { progress, fetchProgress } = useProgress()

const isLoadingData = ref(true)

// Fetch data on mount
onMounted(async () => {
  await Promise.all([
    fetchIntake(),
    fetchProgress()
  ])

  // Redirect to onboarding if no intake
  if (!intake.value) {
    router.push('/onboarding')
    return
  }

  isLoadingData.value = false
})

const handleSignOut = async () => {
  try {
    await signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }
}

const nextSessionTitle = computed(() => {
  if (!progress.value) return 'Session 1: The Stress Myth'

  const mythNumber = progress.value.current_myth
  const mythName = MYTH_NAMES[mythNumber] || `Myth ${mythNumber}`

  return `Session ${progress.value.myths_completed.length + 1}: ${mythName}`
})

const nextSessionDescription = computed(() => {
  if (!progress.value) return 'Start your journey to freedom from nicotine.'

  const descriptions: Record<number, string> = {
    1: 'Discover why nicotine doesn\'t actually relieve stress—it creates it.',
    2: 'Learn why the "pleasure" is just an illusion masking withdrawal.',
    3: 'Understand why quitting has nothing to do with willpower.',
    4: 'See how nicotine disrupts focus rather than enhancing it.',
    5: 'Break free from the myth that addiction defines who you are.',
  }

  return descriptions[progress.value.current_myth] || 'Continue your journey.'
})

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}
</script>
