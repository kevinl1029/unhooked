<template>
  <div class="glass rounded-card p-4 md:p-8 shadow-card border border-brand-border">
    <!-- Header -->
    <h2 class="text-2xl font-semibold text-white mb-2 text-center">Your Progress</h2>
    <p class="text-white-65 text-center mb-4 md:mb-8">
      {{ completedCount }} of 5 illusions explored
    </p>

    <!-- Carousel container -->
    <div class="relative">
      <!-- Arrow navigation (desktop only) -->
      <button
        class="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center transition-all"
        :class="isFirstIllusion ? 'cursor-not-allowed' : 'cursor-pointer'"
        :style="{
          background: isFirstIllusion ? 'rgba(31, 108, 117, 0.2)' : 'rgba(31, 108, 117, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          opacity: isFirstIllusion ? 0.3 : 1
        }"
        :disabled="isFirstIllusion"
        @click="navigatePrevious"
        aria-label="Previous illusion"
      >
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        class="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full items-center justify-center transition-all"
        :class="isLastIllusion ? 'cursor-not-allowed' : 'cursor-pointer'"
        :style="{
          background: isLastIllusion ? 'rgba(31, 108, 117, 0.2)' : 'rgba(31, 108, 117, 0.5)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          opacity: isLastIllusion ? 0.3 : 1
        }"
        :disabled="isLastIllusion"
        @click="navigateNext"
        aria-label="Next illusion"
      >
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Illusions display -->
      <div
        class="overflow-hidden py-4 md:py-8 px-8 md:px-12"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <div
          class="flex items-center justify-center gap-4 transition-transform duration-300 ease-out"
          :style="{ transform: `translateX(${-(focusedIndex - 2) * (isMobile ? 100 : 140)}px)` }"
        >
          <template v-for="(illusion, index) in illusions" :key="illusion.number">
            <div
              class="flex flex-col items-center transition-all duration-300 cursor-pointer"
              :style="getIllusionContainerStyles(index)"
              @click="focusIllusion(index)"
            >
              <!-- Illusion circle -->
              <div
                class="rounded-full flex items-center justify-center transition-all duration-300 mb-2"
                :style="getCircleStyles(illusion, index)"
              >
                <!-- Check icon for completed -->
                <svg v-if="illusion.status === 'completed'" class="text-white" :style="getIconStyles(index)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
                </svg>
                <!-- Dot for current -->
                <div v-else-if="illusion.status === 'current'" class="w-3 h-3 rounded-full bg-brand-accent animate-pulse" />
                <!-- Lock icon for locked -->
                <svg v-else :style="getIconStyles(index)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path style="color: rgba(255, 255, 255, 0.3)" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <!-- Illusion name -->
              <div
                class="font-semibold text-white mb-1 transition-all duration-300 text-center"
                :style="getNameStyles(illusion, index)"
              >
                {{ illusion.name }}
              </div>

              <!-- Revisit badge (always visible for completed illusions) -->
              <button
                v-if="illusion.status === 'completed'"
                class="rounded-full px-3 py-1 font-medium text-white transition-all duration-300 flex items-center gap-1"
                :style="getRevisitBadgeStyles(index)"
                @click.stop="handleRevisit(illusion.key)"
              >
                <!-- RefreshCw icon -->
                <svg :style="getRevisitIconStyles(index)" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Revisit</span>
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Progress dots -->
      <div class="flex items-center justify-center gap-2 mt-4">
        <button
          v-for="(illusion, index) in illusions"
          :key="`dot-${illusion.number}`"
          class="w-2 h-2 rounded-full transition-all duration-200"
          :class="isFocused(index) ? 'bg-brand-accent w-6' : 'bg-brand-border hover:bg-brand-border-strong'"
          @click="focusIllusion(index)"
          :aria-label="`Navigate to ${illusion.name}`"
        />
      </div>
    </div>

    <!-- Action section -->
    <div class="mt-4 pt-4 md:mt-8 md:pt-6 border-t" style="border-color: rgba(255, 255, 255, 0.1)">
      <Transition name="fade" mode="out-in">
        <div v-if="focusedIllusion.status === 'current'" :key="'current'" class="text-center">
          <h3 class="text-xl font-semibold text-white mb-2">
            Continue: The {{ focusedIllusion.name }} Illusion
          </h3>
          <p class="text-white-65 mb-4">{{ focusedIllusion.description }}</p>
          <button
            class="w-full rounded-full py-3 px-6 font-semibold text-white transition-all hover:-translate-y-0.5"
            style="background: linear-gradient(135deg, #fc4a1a, #f7b733); box-shadow: 0 4px 24px rgba(252, 74, 26, 0.3)"
            @click="handleContinue"
          >
            Continue
          </button>
        </div>

        <div v-else-if="focusedIllusion.status === 'locked'" :key="'locked'" class="text-center">
          <h3 class="text-xl font-semibold text-white mb-2" style="opacity: 0.5">
            {{ focusedIllusion.name }} Illusion
          </h3>
          <p class="text-white" style="opacity: 0.4">Complete previous illusions to unlock</p>
        </div>

        <!-- Completed illusions show nothing (revisit badge on circle is sufficient) -->
        <div v-else :key="'completed'" />
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Illusion {
  number: number
  name: string
  key: string
  description: string
  status: 'completed' | 'current' | 'locked'
}

const props = defineProps<{
  illusionOrder: number[]
  illusionsCompleted: number[]
  currentIllusion: number
}>()

// Illusion data
const illusionData: Record<number, { name: string; key: string; description: string }> = {
  1: {
    name: 'Stress Relief',
    key: 'stress_relief',
    description: 'Discover why nicotine doesn\'t actually relieve stress—it creates it.',
  },
  2: {
    name: 'Pleasure',
    key: 'pleasure',
    description: 'Learn why the "pleasure" is just an illusion masking withdrawal.',
  },
  3: {
    name: 'Willpower',
    key: 'willpower',
    description: 'Understand why quitting has nothing to do with willpower.',
  },
  4: {
    name: 'Focus',
    key: 'focus',
    description: 'See how nicotine disrupts focus rather than enhancing it.',
  },
  5: {
    name: 'Identity',
    key: 'identity',
    description: 'Break free from the illusion that addiction defines who you are.',
  },
}

// Build illusions array with status
const illusions = computed<Illusion[]>(() => {
  return props.illusionOrder.map((number) => {
    const data = illusionData[number]
    let status: 'completed' | 'current' | 'locked'

    if (props.illusionsCompleted.includes(number)) {
      status = 'completed'
    } else if (number === props.currentIllusion) {
      status = 'current'
    } else {
      status = 'locked'
    }

    return {
      number,
      name: data.name,
      key: data.key,
      description: data.description,
      status,
    }
  })
})

// Focused illusion index
const focusedIndex = ref(0)

// Responsive sizing for mobile
const isMobile = ref(false)

// Initialize focus to current illusion and set up resize listener
onMounted(() => {
  const currentIndex = illusions.value.findIndex((i) => i.status === 'current')
  if (currentIndex !== -1) {
    focusedIndex.value = currentIndex
  }

  // Check if mobile on mount
  isMobile.value = window.innerWidth < 768

  // Listen for resize
  const handleResize = () => {
    isMobile.value = window.innerWidth < 768
  }
  window.addEventListener('resize', handleResize)

  // Cleanup
  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })
})

// Computed
const focusedIllusion = computed(() => illusions.value[focusedIndex.value])
const isFirstIllusion = computed(() => focusedIndex.value === 0)
const isLastIllusion = computed(() => focusedIndex.value === illusions.value.length - 1)
const completedCount = computed(() => illusions.value.filter((i: Illusion) => i.status === 'completed').length)

// Methods
function isFocused(index: number): boolean {
  return index === focusedIndex.value
}

function focusIllusion(index: number) {
  focusedIndex.value = index
}

function navigatePrevious() {
  if (!isFirstIllusion.value) {
    focusedIndex.value--
  }
}

function navigateNext() {
  if (!isLastIllusion.value) {
    focusedIndex.value++
  }
}

// Style functions matching the reference implementation
function getCircleSizeConfig(index: number) {
  const distance = Math.abs(index - focusedIndex.value)

  // Mobile sizes (smaller to fit more above the fold)
  if (isMobile.value) {
    if (distance === 0) return { size: 72, iconSize: 36, fontSize: '0.875rem' }
    if (distance === 1) return { size: 48, iconSize: 24, fontSize: '0.75rem' }
    return { size: 36, iconSize: 18, fontSize: '0.625rem' }
  }

  // Desktop sizes
  if (distance === 0) return { size: 96, iconSize: 48, fontSize: '1rem' }
  if (distance === 1) return { size: 64, iconSize: 32, fontSize: '0.875rem' }
  return { size: 48, iconSize: 24, fontSize: '0.75rem' }
}

function getOpacity(index: number): number {
  const distance = Math.abs(index - focusedIndex.value)
  if (distance === 0) return 1
  if (distance === 1) return 0.7
  return 0.4
}

function getIllusionContainerStyles(index: number): Record<string, string | number> {
  const isActive = index === focusedIndex.value
  return {
    opacity: getOpacity(index),
    transform: `scale(${isActive ? 1 : 0.85})`,
    minWidth: isMobile.value ? '90px' : '120px'
  }
}

function getCircleStyles(illusion: Illusion, index: number): Record<string, string | number> {
  const { size } = getCircleSizeConfig(index)

  let background: string
  let border: string

  if (illusion.status === 'completed') {
    background = 'linear-gradient(135deg, #fc4a1a, #f7b733)'
    border = 'none'
  } else if (illusion.status === 'current') {
    background = 'rgba(252, 74, 26, 0.3)'
    border = '2px solid #fc4a1a'
  } else {
    background = 'rgba(31, 108, 117, 0.3)'
    border = '1px solid rgba(255, 255, 255, 0.1)'
  }

  return {
    width: `${size}px`,
    height: `${size}px`,
    background,
    border
  }
}

function getIconStyles(index: number): Record<string, string> {
  const { iconSize } = getCircleSizeConfig(index)
  return {
    width: `${iconSize}px`,
    height: `${iconSize}px`
  }
}

function getNameStyles(illusion: Illusion, index: number): Record<string, string> {
  const { fontSize } = getCircleSizeConfig(index)
  return {
    fontSize,
    color: illusion.status === 'current' ? '#fc4a1a' : 'white'
  }
}

function getRevisitBadgeStyles(index: number): Record<string, string | number> {
  const isActive = index === focusedIndex.value
  return {
    background: 'rgba(31, 108, 117, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    opacity: isActive ? 1 : 0.7,
    fontSize: isActive ? '0.75rem' : '0.625rem'
  }
}

function getRevisitIconStyles(index: number): Record<string, string> {
  const isActive = index === focusedIndex.value
  const size = isActive ? 12 : 10
  return {
    width: `${size}px`,
    height: `${size}px`
  }
}

// Touch handling for mobile swipe
let touchStartX = 0
const SWIPE_THRESHOLD = 50

function handleTouchStart(e: TouchEvent) {
  touchStartX = e.touches[0].clientX
}

function handleTouchMove(e: TouchEvent) {
  // Prevent default to avoid scrolling while swiping
  if (Math.abs(e.touches[0].clientX - touchStartX) > 10) {
    e.preventDefault()
  }
}

function handleTouchEnd(e: TouchEvent) {
  const touchEndX = e.changedTouches[0].clientX
  const deltaX = touchEndX - touchStartX

  // Swipe left (move to next)
  if (deltaX < -SWIPE_THRESHOLD && !isLastIllusion.value) {
    navigateNext()
  }
  // Swipe right (move to previous)
  else if (deltaX > SWIPE_THRESHOLD && !isFirstIllusion.value) {
    navigatePrevious()
  }

  touchStartX = 0
}

function handleContinue() {
  navigateTo(`/session/${focusedIllusion.value.number}`)
}

function handleRevisit(illusionKey: string) {
  navigateTo(`/reinforcement/${illusionKey}`)
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
