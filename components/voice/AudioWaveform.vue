<template>
  <div class="flex items-end justify-center gap-1" :class="containerClass">
    <div
      v-for="(bar, i) in bars"
      :key="i"
      class="rounded-full transition-all"
      :class="[barClass, isActive ? activeBarClass : inactiveBarClass]"
      :style="{
        height: `${bar}%`,
        transitionDuration: `${transitionDuration}ms`
      }"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  isActive?: boolean
  audioLevel?: number
  barCount?: number
  minHeight?: number
  maxHeight?: number
  transitionDuration?: number
  containerClass?: string
  barClass?: string
  activeBarClass?: string
  inactiveBarClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  isActive: false,
  audioLevel: 0,
  barCount: 20,
  minHeight: 8,
  maxHeight: 100,
  transitionDuration: 75,
  containerClass: 'h-16',
  barClass: 'w-1.5 md:w-2',
  activeBarClass: 'bg-gradient-to-t from-brand-accent to-brand-accent-light',
  inactiveBarClass: 'bg-white-65'
})

// Reactive ref to store bar heights
const bars = ref<number[]>([])

// Animation frame tracking
let animationFrame: number | null = null

// Generate bar heights
const updateBars = () => {
  const result: number[] = []
  const { barCount, audioLevel, minHeight, maxHeight, isActive } = props

  for (let i = 0; i < barCount; i++) {
    if (!isActive) {
      // Static low bars when inactive
      result.push(minHeight)
    } else {
      // Create a wave pattern that responds to audio level
      // Use sine wave with phase offset per bar for organic movement
      const phase = (i / barCount) * Math.PI * 2
      const wave = Math.sin(phase + Date.now() / 200) * 0.3 + 0.7

      // Base height influenced by audio level
      const levelInfluence = audioLevel * (maxHeight - minHeight)
      const height = minHeight + levelInfluence * wave

      // Add some randomness for natural feel
      const randomFactor = 0.8 + Math.random() * 0.4
      result.push(Math.min(maxHeight, Math.max(minHeight, height * randomFactor)))
    }
  }

  bars.value = result
}

// Animation loop
const animate = () => {
  updateBars()
  if (props.isActive) {
    animationFrame = requestAnimationFrame(animate)
  }
}

// Watch for active state changes
watch(() => props.isActive, (active) => {
  if (active) {
    animate()
  } else {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame)
      animationFrame = null
    }
    updateBars() // Update to show inactive state
  }
}, { immediate: true })

// Also update when audioLevel changes (for non-animated use)
watch(() => props.audioLevel, () => {
  if (props.isActive) {
    // Animation loop will handle it
  } else {
    updateBars()
  }
})

// Initialize bars
onMounted(() => {
  updateBars()
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})
</script>
