<template>
  <div class="flex items-center justify-center gap-3 md:gap-4">
    <template v-for="(myth, index) in mythOrder" :key="myth">
      <!-- Myth circle -->
      <div class="relative">
        <NuxtLink
          v-if="isMythClickable(myth)"
          :to="getMythLink(myth)"
          class="block w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-105"
          :class="getMythClasses(myth)"
        >
          <!-- Checkmark for completed -->
          <svg
            v-if="isMythCompleted(myth)"
            class="w-6 h-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
          </svg>
          <!-- Number for incomplete -->
          <span v-else class="font-semibold">{{ myth }}</span>
        </NuxtLink>
        <div
          v-else
          class="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 flex items-center justify-center transition-all duration-300"
          :class="getMythClasses(myth)"
        >
          <!-- Number for incomplete non-clickable -->
          <span class="font-semibold">{{ myth }}</span>
        </div>

        <!-- Myth name tooltip (optional, shown on hover) -->
        <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
          <span class="text-xs text-white-65">{{ getMythName(myth) }}</span>
        </div>
      </div>

      <!-- Connecting line -->
      <div
        v-if="index < mythOrder.length - 1"
        class="h-0.5 w-6 md:w-8 transition-colors duration-300"
        :class="isMythCompleted(myth) ? 'bg-brand-accent' : 'bg-brand-border'"
      />
    </template>
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
</script>
