<template>
  <div class="flex flex-col items-center">
    <!-- Progress circles -->
    <div class="flex items-center justify-center gap-2 md:gap-3 mb-3">
      <template v-for="(myth, index) in mythOrder" :key="myth">
        <!-- Myth circle -->
        <div class="flex flex-col items-center gap-1.5">
          <NuxtLink
            v-if="isMythClickable(myth)"
            :to="getMythLink(myth)"
            class="block w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110"
            :class="getMythClasses(myth)"
          >
            <!-- Checkmark for completed -->
            <svg
              v-if="isMythCompleted(myth)"
              class="w-5 h-5 md:w-6 md:h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <!-- Dot for current -->
            <div v-else-if="isCurrent(myth)" class="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
            <!-- Lock icon for future -->
            <svg
              v-else
              class="w-4 h-4 md:w-5 md:h-5 text-white-65"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </NuxtLink>
          <div
            v-else
            class="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300"
            :class="getMythClasses(myth)"
          >
            <!-- Lock icon for future non-clickable -->
            <svg
              class="w-4 h-4 md:w-5 md:h-5 text-white-65"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <!-- Myth name below circle -->
          <span class="text-xs md:text-sm text-center transition-all duration-300" :class="getMythTextClasses(myth)">
            {{ getAbbreviatedMythName(myth) }}
          </span>
        </div>

        <!-- Connecting line -->
        <div
          v-if="index < mythOrder.length - 1"
          class="h-0.5 w-4 md:w-6 transition-colors duration-300 mb-6"
          :class="isMythCompleted(myth) ? 'bg-brand-accent' : 'bg-brand-border'"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MYTH_NAMES } from '~/server/utils/prompts'

const props = defineProps<{
  mythOrder: number[]
  mythsCompleted: number[]
  currentMyth: number
}>()

const isMythCompleted = (mythNumber: number): boolean => {
  return props.mythsCompleted.includes(mythNumber)
}

const isCurrent = (mythNumber: number): boolean => {
  return mythNumber === props.currentMyth
}

const isMythClickable = (mythNumber: number): boolean => {
  // Completed myths are clickable (to view transcript)
  // Current myth is clickable (to start/continue session)
  return isMythCompleted(mythNumber) || isCurrent(mythNumber)
}

const getMythClasses = (mythNumber: number): string => {
  if (isMythCompleted(mythNumber)) {
    return 'bg-brand-accent border-brand-accent text-white'
  } else if (isCurrent(mythNumber)) {
    return 'border-brand-accent bg-brand-accent/20 text-brand-accent'
  } else {
    return 'border-brand-border bg-brand-border/30 text-white-65'
  }
}

const getMythLink = (mythNumber: number): string => {
  if (isMythCompleted(mythNumber)) {
    return `/session/${mythNumber}?view=transcript`
  } else {
    return `/session/${mythNumber}`
  }
}

const getMythName = (mythNumber: number): string => {
  return MYTH_NAMES[mythNumber] || `Myth ${mythNumber}`
}

const getAbbreviatedMythName = (mythNumber: number): string => {
  const abbreviations: Record<number, string> = {
    1: 'Stress',
    2: 'Pleasure',
    3: 'Willpower',
    4: 'Focus',
    5: 'Identity',
  }
  return abbreviations[mythNumber] || `Myth ${mythNumber}`
}

const getMythTextClasses = (mythNumber: number): string => {
  if (isMythCompleted(mythNumber)) {
    return 'text-white-85 font-medium'
  } else if (isCurrent(mythNumber)) {
    return 'text-brand-accent font-semibold'
  } else {
    return 'text-white-65 font-normal'
  }
}
</script>
