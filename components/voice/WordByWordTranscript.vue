<template>
  <p :class="containerClass">
    <span
      v-for="(word, idx) in words"
      :key="idx"
      :ref="el => setWordRef(el, idx)"
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
  autoScroll?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  transcript: '',
  currentWordIndex: -1,
  containerClass: 'text-lg leading-relaxed',
  baseClass: '',
  activeClass: 'text-brand-accent',
  spokenClass: 'text-white',
  unspokenClass: 'text-white-65',
  autoScroll: false
})

const words = computed(() => {
  return props.transcript.split(/\s+/).filter(w => w.length > 0)
})

// Track refs to word elements for auto-scrolling
const wordRefs = ref<Map<number, HTMLElement>>(new Map())

const setWordRef = (el: HTMLElement | null, idx: number) => {
  if (el) {
    wordRefs.value.set(idx, el)
  } else {
    wordRefs.value.delete(idx)
  }
}

// Auto-scroll to keep current word in view
watch(() => props.currentWordIndex, (newIndex) => {
  if (!props.autoScroll || newIndex < 0) return

  const wordEl = wordRefs.value.get(newIndex)
  if (wordEl) {
    wordEl.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    })
  }
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
