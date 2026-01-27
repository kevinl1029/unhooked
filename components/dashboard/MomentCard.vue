<template>
  <div
    class="glass rounded-card p-6 shadow-card border border-brand-border cursor-pointer transition-all duration-200 hover:scale-[1.02]"
    @click="handleClick"
  >
    <!-- Eyebrow -->
    <p class="eyebrow text-brand-accent mb-3">BREAKTHROUGH MOMENT</p>

    <!-- Illusion name -->
    <h3 class="text-lg font-semibold text-white mb-4">{{ illusionName }}</h3>

    <!-- Quote -->
    <blockquote class="text-white-85 text-base leading-relaxed mb-6 italic">
      "{{ truncatedQuote }}"
    </blockquote>

    <!-- Relative time -->
    <p class="text-white-65 text-sm mb-4">{{ formattedRelativeTime }}</p>

    <!-- CTA button -->
    <button
      class="btn-primary text-white px-6 py-3 rounded-pill font-semibold shadow-card w-full flex items-center justify-center gap-2"
      @click="handleClick"
    >
      <span>Reconnect with this</span>
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  momentId: string
  quote: string
  illusionKey: string
  illusionName: string
  relativeTime: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  click: [payload: { momentId: string; illusionKey: string }]
}>()

// Truncate quote to 240 characters
const truncatedQuote = computed(() => {
  if (props.quote.length <= 240) {
    return props.quote
  }
  return props.quote.substring(0, 240) + '...'
})

// Format relative time
const formattedRelativeTime = computed(() => {
  return formatRelativeTime(props.relativeTime)
})

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays >= 2 && diffDays <= 30) {
    return `${diffDays} days ago`
  } else {
    return 'Over a month ago'
  }
}

function handleClick() {
  emit('click', {
    momentId: props.momentId,
    illusionKey: props.illusionKey,
  })
}
</script>
