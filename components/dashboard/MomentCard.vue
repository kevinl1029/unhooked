<template>
  <div class="glass rounded-card p-6 shadow-card border border-brand-border">
    <!-- Eyebrow: ILLUSION_NAME • RELATIVE_TIME -->
    <p class="text-xs font-medium uppercase tracking-widest text-brand-accent opacity-85 mb-3">
      {{ illusionName.toUpperCase() }} • {{ relativeTime.toUpperCase() }}
    </p>

    <!-- Quote -->
    <blockquote class="mb-4 text-white text-base leading-relaxed">
      "{{ truncatedQuote }}"
    </blockquote>

    <!-- CTA button (secondary per ADR-005) -->
    <button
      class="btn-secondary w-full text-white py-3 px-6 rounded-pill font-semibold"
      @click="handleClick"
    >
      Reconnect with this →
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


function handleClick() {
  emit('click', {
    momentId: props.momentId,
    illusionKey: props.illusionKey,
  })
}
</script>
