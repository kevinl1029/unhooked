<template>
  <div
    class="glass rounded-card p-6 shadow-card border border-brand-border cursor-pointer transition-all duration-200 hover:scale-[1.02]"
    @click="handleClick"
  >
    <!-- Eyebrow -->
    <p class="eyebrow text-brand-accent mb-3">NEEDS ATTENTION</p>

    <!-- Illusion name -->
    <h3 class="text-lg font-semibold text-white mb-4">{{ illusionName }}</h3>

    <!-- Warning message -->
    <p class="text-white-85 text-base leading-relaxed mb-6">
      You completed {{ illusionName }}, but we didn't capture any breakthrough moments. This one might benefit from another conversation.
    </p>

    <!-- CTA button -->
    <button
      class="btn-primary text-white px-6 py-3 rounded-pill font-semibold shadow-card w-full flex items-center justify-center gap-2"
      @click="handleClick"
    >
      <span>Revisit {{ illusionName }}</span>
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  illusionKey: string
  illusionName: string
}

const props = defineProps<Props>()

function handleClick() {
  navigateTo(`/reinforcement/${props.illusionKey}`)
}
</script>
