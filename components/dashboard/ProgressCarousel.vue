<template>
  <div class="glass rounded-card p-6 md:p-8 shadow-card border border-brand-border">
    <!-- Carousel container -->
    <div class="relative">
      <!-- Arrow navigation (desktop only) -->
      <button
        v-if="!isFirstIllusion"
        class="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 w-12 h-12 rounded-full glass border border-brand-border items-center justify-center hover:scale-110 transition-transform duration-200"
        @click="navigatePrevious"
        aria-label="Previous illusion"
      >
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        v-if="!isLastIllusion"
        class="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 w-12 h-12 rounded-full glass border border-brand-border items-center justify-center hover:scale-110 transition-transform duration-200"
        @click="navigateNext"
        aria-label="Next illusion"
      >
        <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Illusions display -->
      <div
        class="overflow-hidden py-8"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
      >
        <div class="flex items-center justify-center gap-6 transition-transform duration-300 ease-out">
          <template v-for="(illusion, index) in illusions" :key="illusion.number">
            <div
              class="flex flex-col items-center gap-3 transition-all duration-300"
              :class="getIllusionContainerClasses(index)"
            >
              <!-- Illusion circle -->
              <button
                class="rounded-full border-2 flex items-center justify-center transition-all duration-300"
                :class="getIllusionCircleClasses(illusion, index)"
                @click="focusIllusion(index)"
              >
                <!-- Check icon for completed -->
                <Check v-if="illusion.status === 'completed'" class="text-white" :size="getIconSize(index)" />
                <!-- Dot for current -->
                <div v-else-if="illusion.status === 'current'" class="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
                <!-- Lock icon for locked -->
                <Lock v-else class="text-white-65" :size="getLockIconSize(index)" />
              </button>

              <!-- Illusion name -->
              <span
                class="text-sm text-center transition-all duration-300 leading-tight"
                :class="getIllusionTextClasses(illusion, index)"
              >
                {{ illusion.name }}
              </span>

              <!-- Revisit badge (only for completed illusions when focused) -->
              <button
                v-if="illusion.status === 'completed' && isFocused(index)"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-input border border-brand-border text-xs text-white-85 hover:text-white hover:scale-105 transition-all duration-200"
                @click.stop="handleRevisit(illusion.key)"
              >
                <RefreshCw :size="12" />
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
    <div class="mt-6 pt-6 border-t border-brand-border">
      <Transition name="fade" mode="out-in">
        <div v-if="focusedIllusion.status === 'current'" :key="'current'" class="text-center">
          <h3 class="text-xl font-semibold text-white mb-2">{{ focusedIllusion.name }}</h3>
          <p class="text-white-65 mb-4">{{ focusedIllusion.description }}</p>
          <button
            class="btn-primary text-white px-6 py-3 rounded-pill font-semibold shadow-card"
            @click="handleContinue"
          >
            Continue
          </button>
        </div>

        <div v-else-if="focusedIllusion.status === 'locked'" :key="'locked'" class="text-center">
          <p class="text-white-65">Complete previous illusions to unlock</p>
        </div>

        <!-- Completed illusions show nothing (revisit badge on circle is sufficient) -->
        <div v-else :key="'completed'" class="h-8" />
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Check, Lock, RefreshCw } from 'lucide-vue-next'

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

// Initialize focus to current illusion
onMounted(() => {
  const currentIndex = illusions.value.findIndex((i) => i.status === 'current')
  if (currentIndex !== -1) {
    focusedIndex.value = currentIndex
  }
})

// Computed
const focusedIllusion = computed(() => illusions.value[focusedIndex.value])
const isFirstIllusion = computed(() => focusedIndex.value === 0)
const isLastIllusion = computed(() => focusedIndex.value === illusions.value.length - 1)

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

function getIllusionContainerClasses(index: number): string {
  const distance = Math.abs(index - focusedIndex.value)
  if (distance === 0) {
    return 'scale-100 opacity-100'
  } else if (distance === 1) {
    return 'scale-75 opacity-75'
  } else {
    return 'scale-50 opacity-50'
  }
}

function getIllusionCircleClasses(illusion: Illusion, index: number): string {
  const baseClasses = []
  const distance = Math.abs(index - focusedIndex.value)

  // Size based on focus distance
  if (distance === 0) {
    baseClasses.push('w-24 h-24')
  } else if (distance === 1) {
    baseClasses.push('w-16 h-16')
  } else {
    baseClasses.push('w-12 h-12')
  }

  // Color based on status
  if (illusion.status === 'completed') {
    baseClasses.push('btn-primary border-brand-accent')
  } else if (illusion.status === 'current') {
    baseClasses.push('border-brand-accent bg-brand-accent/20')
  } else {
    baseClasses.push('border-brand-border bg-brand-glass')
  }

  // Hover effect
  baseClasses.push('hover:scale-110 cursor-pointer')

  return baseClasses.join(' ')
}

function getIllusionTextClasses(illusion: Illusion, index: number): string {
  const distance = Math.abs(index - focusedIndex.value)
  const baseClasses = []

  if (illusion.status === 'completed') {
    baseClasses.push('text-white-85 font-medium')
  } else if (illusion.status === 'current') {
    baseClasses.push('text-brand-accent font-semibold')
  } else {
    baseClasses.push('text-white-65 font-normal')
  }

  // Size based on focus
  if (distance === 0) {
    baseClasses.push('text-base')
  } else {
    baseClasses.push('text-sm')
  }

  return baseClasses.join(' ')
}

function getIconSize(index: number): number {
  const distance = Math.abs(index - focusedIndex.value)
  if (distance === 0) return 32
  if (distance === 1) return 20
  return 16
}

function getLockIconSize(index: number): number {
  const distance = Math.abs(index - focusedIndex.value)
  if (distance === 0) return 28
  if (distance === 1) return 18
  return 14
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
