<template>
  <div class="flex flex-col items-center">
    <!-- Progress circles -->
    <div class="flex items-center justify-center gap-1.5 md:gap-3 mb-3">
      <template v-for="(illusion, index) in illusionOrder" :key="illusion">
        <!-- Illusion circle -->
        <div class="flex flex-col items-center gap-1.5">
          <NuxtLink
            v-if="isIllusionClickable(illusion)"
            :to="getIllusionLink(illusion)"
            class="block w-10 h-10 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110"
            :class="getIllusionClasses(illusion)"
          >
            <!-- Checkmark for completed -->
            <svg
              v-if="isIllusionCompleted(illusion)"
              class="w-5 h-5 md:w-6 md:h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
            <!-- Dot for current -->
            <div v-else-if="isCurrent(illusion)" class="w-2 h-2 rounded-full bg-brand-accent animate-pulse" />
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
            :class="getIllusionClasses(illusion)"
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

          <!-- Illusion name below circle -->
          <span class="text-[0.625rem] md:text-sm text-center transition-all duration-300 max-w-[50px] md:max-w-none leading-tight" :class="getIllusionTextClasses(illusion)">
            {{ getAbbreviatedIllusionName(illusion) }}
          </span>
        </div>

        <!-- Connecting line -->
        <div
          v-if="index < illusionOrder.length - 1"
          class="h-0.5 w-4 md:w-6 transition-colors duration-300 mb-6"
          :class="isIllusionCompleted(illusion) ? 'bg-brand-accent' : 'bg-brand-border'"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ILLUSION_NAMES } from '~/server/utils/prompts'

const props = defineProps<{
  illusionOrder: number[]
  illusionsCompleted: number[]
  currentIllusion: number
}>()

const isIllusionCompleted = (illusionNumber: number): boolean => {
  return props.illusionsCompleted.includes(illusionNumber)
}

const isCurrent = (illusionNumber: number): boolean => {
  return illusionNumber === props.currentIllusion
}

const isIllusionClickable = (illusionNumber: number): boolean => {
  // Completed illusions are clickable (to view transcript)
  // Current illusion is clickable (to start/continue session)
  return isIllusionCompleted(illusionNumber) || isCurrent(illusionNumber)
}

const getIllusionClasses = (illusionNumber: number): string => {
  if (isIllusionCompleted(illusionNumber)) {
    return 'bg-brand-accent border-brand-accent text-white'
  } else if (isCurrent(illusionNumber)) {
    return 'border-brand-accent bg-brand-accent/20 text-brand-accent'
  } else {
    return 'border-brand-border bg-brand-border/30 text-white-65'
  }
}

const getIllusionLink = (illusionNumber: number): string => {
  if (isIllusionCompleted(illusionNumber)) {
    return `/session/${illusionNumber}?view=transcript`
  } else {
    return `/session/${illusionNumber}`
  }
}

const getIllusionName = (illusionNumber: number): string => {
  return ILLUSION_NAMES[illusionNumber] || `Illusion ${illusionNumber}`
}

const getAbbreviatedIllusionName = (illusionNumber: number): string => {
  const abbreviations: Record<number, string> = {
    1: 'Stress',
    2: 'Pleasure',
    3: 'Will-power',
    4: 'Focus',
    5: 'Identity',
  }
  return abbreviations[illusionNumber] || `Illusion ${illusionNumber}`
}

const getIllusionTextClasses = (illusionNumber: number): string => {
  if (isIllusionCompleted(illusionNumber)) {
    return 'text-white-85 font-medium'
  } else if (isCurrent(illusionNumber)) {
    return 'text-brand-accent font-semibold'
  } else {
    return 'text-white-65 font-normal'
  }
}
</script>
