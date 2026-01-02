<template>
  <div class="flex flex-col items-center gap-4">
    <!-- Main Mic Button -->
    <button
      class="relative flex items-center justify-center rounded-full transition-all duration-200"
      :class="buttonClasses"
      :disabled="disabled"
      @mousedown="handleMouseDown"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseLeave"
      @touchstart.prevent="handleTouchStart"
      @touchend.prevent="handleTouchEnd"
    >
      <!-- Pulse ring when recording -->
      <div
        v-if="isRecording"
        class="absolute inset-0 rounded-full bg-red-500/30 animate-ping"
      />

      <!-- Mic icon -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="2"
        stroke="currentColor"
        :class="iconSizeClass"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
        />
      </svg>
    </button>

    <!-- Label -->
    <p v-if="showLabel" class="text-white-65 text-sm">
      {{ labelText }}
    </p>

    <!-- Text fallback link -->
    <button
      v-if="showTextFallback && !isRecording"
      class="text-white-65 text-sm underline hover:text-white transition-colors"
      @click="$emit('text-fallback')"
    >
      Type instead
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isRecording?: boolean
  disabled?: boolean
  showLabel?: boolean
  showTextFallback?: boolean
  size?: 'sm' | 'md' | 'lg'
  holdToRecord?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isRecording: false,
  disabled: false,
  showLabel: true,
  showTextFallback: true,
  size: 'lg',
  holdToRecord: false
})

const emit = defineEmits<{
  start: []
  stop: []
  'text-fallback': []
}>()

// Track if we're in a press/hold
const isPressed = ref(false)

const buttonClasses = computed(() => {
  const base = 'focus:outline-none focus:ring-4 focus:ring-brand-accent/30'

  const sizeClasses = {
    sm: 'w-14 h-14',
    md: 'w-18 h-18',
    lg: 'w-24 h-24'
  }

  const stateClasses = props.isRecording
    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 scale-110'
    : props.disabled
      ? 'bg-brand-glass text-white-65 cursor-not-allowed opacity-50'
      : 'bg-gradient-to-br from-brand-accent to-brand-accent-light text-white shadow-lg shadow-brand-accent/30 hover:scale-105 active:scale-95'

  return [base, sizeClasses[props.size], stateClasses]
})

const iconSizeClass = computed(() => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10'
  }
  return sizes[props.size]
})

const labelText = computed(() => {
  if (props.isRecording) {
    return props.holdToRecord ? 'Release to send' : 'Tap to stop'
  }
  return props.holdToRecord ? 'Hold to speak' : 'Tap to speak'
})

// Mouse handlers
const handleMouseDown = () => {
  if (props.disabled) return

  if (props.holdToRecord) {
    isPressed.value = true
    emit('start')
  }
}

const handleMouseUp = () => {
  if (props.disabled) return

  if (props.holdToRecord) {
    if (isPressed.value) {
      isPressed.value = false
      emit('stop')
    }
  } else {
    // Toggle mode
    if (props.isRecording) {
      emit('stop')
    } else {
      emit('start')
    }
  }
}

const handleMouseLeave = () => {
  // If holding and mouse leaves, treat as release
  if (props.holdToRecord && isPressed.value) {
    isPressed.value = false
    emit('stop')
  }
}

// Touch handlers
const handleTouchStart = () => {
  if (props.disabled) return

  if (props.holdToRecord) {
    isPressed.value = true
    emit('start')
  }
}

const handleTouchEnd = () => {
  if (props.disabled) return

  if (props.holdToRecord) {
    if (isPressed.value) {
      isPressed.value = false
      emit('stop')
    }
  } else {
    // Toggle mode
    if (props.isRecording) {
      emit('stop')
    } else {
      emit('start')
    }
  }
}
</script>
