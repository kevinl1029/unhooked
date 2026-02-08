<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-bg-dark/80 backdrop-blur-sm animate-fade-in-up"
    @click.self="handleStay"
  >
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="exit-dialog-title"
      aria-describedby="exit-dialog-description"
      class="glass rounded-card p-8 shadow-card border border-brand-border max-w-md w-full"
      @keydown="handleKeydown"
    >
      <h2 id="exit-dialog-title" class="text-2xl font-bold text-white mb-4">
        Leave ceremony?
      </h2>
      <p id="exit-dialog-description" class="text-white-85 mb-6">
        Your progress won't be saved.
      </p>

      <div class="flex flex-col sm:flex-row gap-3">
        <button
          ref="leaveButtonRef"
          class="flex-1 px-6 py-3 rounded-pill font-semibold border border-brand-border bg-brand-glass text-white hover:bg-brand-glass-input transition"
          @click="handleLeave"
        >
          Leave
        </button>
        <button
          ref="stayButtonRef"
          class="flex-1 btn-primary text-white px-6 py-3 rounded-pill font-semibold"
          @click="handleStay"
        >
          Stay
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  leave: []
  stay: []
}>()

const leaveButtonRef = ref<HTMLButtonElement | null>(null)
const stayButtonRef = ref<HTMLButtonElement | null>(null)

// Focus the Stay button when dialog opens
watch(() => props.open, (isOpen) => {
  if (isOpen) {
    nextTick(() => {
      stayButtonRef.value?.focus()
    })
  }
})

// Handle keyboard navigation with focus trap
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    event.preventDefault()

    const currentElement = document.activeElement
    const isOnStay = currentElement === stayButtonRef.value
    const isOnLeave = currentElement === leaveButtonRef.value

    if (event.shiftKey) {
      // Shift+Tab: Move backward
      if (isOnLeave || !isOnStay) {
        stayButtonRef.value?.focus()
      } else {
        leaveButtonRef.value?.focus()
      }
    } else {
      // Tab: Move forward
      if (isOnStay || !isOnLeave) {
        leaveButtonRef.value?.focus()
      } else {
        stayButtonRef.value?.focus()
      }
    }
  }
}

function handleLeave() {
  emit('leave')
}

function handleStay() {
  emit('stay')
}
</script>
