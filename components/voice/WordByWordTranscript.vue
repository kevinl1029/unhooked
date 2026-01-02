<template>
  <p :class="containerClass">
    <span
      v-for="(word, idx) in words"
      :key="idx"
      class="transition-all duration-150"
      :class="getWordClass(idx)"
    >{{ word }}{{ idx < words.length - 1 ? ' ' : '' }}</span>
  </p>
</template>

<script setup lang="ts">
interface Props {
  transcript: string
  currentWordIndex?: number
  containerClass?: string
  baseClass?: string
  activeClass?: string
  spokenClass?: string
  unspokenClass?: string
}

const props = withDefaults(defineProps<Props>(), {
  transcript: '',
  currentWordIndex: -1,
  containerClass: 'text-lg leading-relaxed',
  baseClass: '',
  activeClass: 'text-brand-accent font-semibold scale-105',
  spokenClass: 'text-white',
  unspokenClass: 'text-white-65'
})

const words = computed(() => {
  return props.transcript.split(/\s+/).filter(w => w.length > 0)
})

const getWordClass = (index: number): string => {
  const classes = [props.baseClass]

  if (index === props.currentWordIndex) {
    classes.push(props.activeClass)
  } else if (index < props.currentWordIndex) {
    classes.push(props.spokenClass)
  } else {
    classes.push(props.unspokenClass)
  }

  return classes.filter(Boolean).join(' ')
}
</script>
