<template>
  <div class="min-h-screen bg-gradient-to-b from-brand-bg-light to-brand-bg-dark p-8">
    <div class="max-w-2xl mx-auto space-y-12">
      <h1 class="text-2xl font-bold text-white">Voice Components Test</h1>

      <!-- AudioWaveform Section -->
      <section class="glass rounded-card p-6 border border-brand-border">
        <h2 class="text-xl font-semibold text-white mb-4">AudioWaveform</h2>

        <div class="space-y-6">
          <!-- Default waveform -->
          <div>
            <p class="text-white-65 text-sm mb-2">Default (inactive)</p>
            <div class="bg-brand-glass rounded-lg p-4">
              <VoiceAudioWaveform />
            </div>
          </div>

          <!-- Active waveform -->
          <div>
            <p class="text-white-65 text-sm mb-2">Active with audio level: {{ (audioLevel * 100).toFixed(0) }}%</p>
            <div class="bg-brand-glass rounded-lg p-4">
              <VoiceAudioWaveform :is-active="waveformActive" :audio-level="audioLevel" />
            </div>
            <div class="flex items-center gap-4 mt-3">
              <button
                class="px-4 py-2 rounded-pill text-sm"
                :class="waveformActive ? 'bg-red-500 text-white' : 'bg-brand-accent text-white'"
                @click="waveformActive = !waveformActive"
              >
                {{ waveformActive ? 'Stop' : 'Activate' }}
              </button>
              <input
                v-model.number="audioLevel"
                type="range"
                min="0"
                max="1"
                step="0.01"
                class="flex-1"
              />
            </div>
          </div>

          <!-- Mobile variant (fewer bars) -->
          <div>
            <p class="text-white-65 text-sm mb-2">Mobile variant (12 bars)</p>
            <div class="bg-brand-glass rounded-lg p-4">
              <VoiceAudioWaveform
                :is-active="waveformActive"
                :audio-level="audioLevel"
                :bar-count="12"
                container-class="h-12"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- WordByWordTranscript Section -->
      <section class="glass rounded-card p-6 border border-brand-border">
        <h2 class="text-xl font-semibold text-white mb-4">WordByWordTranscript</h2>

        <div class="space-y-6">
          <div>
            <p class="text-white-65 text-sm mb-2">Current word: {{ currentWord }} (index: {{ currentWordIdx }})</p>
            <div class="bg-brand-glass rounded-lg p-4">
              <VoiceWordByWordTranscript
                :transcript="testTranscript"
                :current-word-index="currentWordIdx"
              />
            </div>
            <div class="flex items-center gap-4 mt-3">
              <button
                class="px-4 py-2 rounded-pill text-sm bg-brand-accent text-white"
                @click="animateWords"
              >
                Animate
              </button>
              <button
                class="px-4 py-2 rounded-pill text-sm bg-brand-glass text-white-85"
                @click="currentWordIdx = -1"
              >
                Reset
              </button>
              <input
                v-model.number="currentWordIdx"
                type="range"
                min="-1"
                :max="wordCount - 1"
                class="flex-1"
              />
            </div>
          </div>

          <!-- Custom styling -->
          <div>
            <p class="text-white-65 text-sm mb-2">Custom styling</p>
            <div class="bg-brand-glass rounded-lg p-4">
              <VoiceWordByWordTranscript
                :transcript="testTranscript"
                :current-word-index="currentWordIdx"
                container-class="text-xl leading-loose font-light"
                active-class="text-yellow-400 font-bold"
                spoken-class="text-green-400"
                unspoken-class="text-white-65 opacity-50"
              />
            </div>
          </div>
        </div>
      </section>

      <!-- VoiceMicButton Section -->
      <section class="glass rounded-card p-6 border border-brand-border">
        <h2 class="text-xl font-semibold text-white mb-4">VoiceMicButton</h2>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
          <!-- Default state -->
          <div class="text-center">
            <p class="text-white-65 text-sm mb-4">Default</p>
            <VoiceMicButton
              :is-recording="false"
              :show-text-fallback="false"
              @start="logEvent('start')"
              @stop="logEvent('stop')"
            />
          </div>

          <!-- Recording state -->
          <div class="text-center">
            <p class="text-white-65 text-sm mb-4">Recording</p>
            <VoiceMicButton
              :is-recording="true"
              :show-text-fallback="false"
              @start="logEvent('start')"
              @stop="logEvent('stop')"
            />
          </div>

          <!-- Disabled state -->
          <div class="text-center">
            <p class="text-white-65 text-sm mb-4">Disabled</p>
            <VoiceMicButton
              :disabled="true"
              :show-text-fallback="false"
              @start="logEvent('start')"
              @stop="logEvent('stop')"
            />
          </div>

          <!-- Small size -->
          <div class="text-center">
            <p class="text-white-65 text-sm mb-4">Small</p>
            <VoiceMicButton
              size="sm"
              :show-text-fallback="false"
              @start="logEvent('start')"
              @stop="logEvent('stop')"
            />
          </div>
        </div>

        <!-- Interactive demo -->
        <div class="mt-8 pt-6 border-t border-brand-border">
          <p class="text-white-65 text-sm mb-4">Interactive (toggle mode)</p>
          <div class="flex justify-center">
            <VoiceMicButton
              :is-recording="demoRecording"
              @start="demoRecording = true"
              @stop="demoRecording = false"
              @text-fallback="logEvent('text-fallback')"
            />
          </div>
        </div>

        <!-- Hold-to-record demo -->
        <div class="mt-8 pt-6 border-t border-brand-border">
          <p class="text-white-65 text-sm mb-4">Hold to record mode</p>
          <div class="flex justify-center">
            <VoiceMicButton
              :is-recording="holdRecording"
              :hold-to-record="true"
              @start="holdRecording = true"
              @stop="holdRecording = false"
              @text-fallback="logEvent('text-fallback')"
            />
          </div>
        </div>
      </section>

      <!-- Event Log -->
      <section class="glass rounded-card p-6 border border-brand-border">
        <h2 class="text-xl font-semibold text-white mb-4">Event Log</h2>
        <div class="bg-brand-glass rounded-lg p-4 max-h-32 overflow-y-auto font-mono text-sm">
          <p v-if="eventLog.length === 0" class="text-white-65">No events yet...</p>
          <p v-for="(event, idx) in eventLog" :key="idx" class="text-green-400">
            {{ event }}
          </p>
        </div>
        <button
          class="mt-3 px-4 py-2 rounded-pill text-sm bg-brand-glass text-white-65"
          @click="eventLog = []"
        >
          Clear Log
        </button>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

// Waveform state
const waveformActive = ref(false)
const audioLevel = ref(0.5)

// Transcript state
const testTranscript = ref('The quick brown fox jumps over the lazy dog. This is a test of the word by word transcript component.')
const currentWordIdx = ref(-1)
const wordCount = computed(() => testTranscript.value.split(/\s+/).filter(w => w.length > 0).length)
const currentWord = computed(() => {
  const words = testTranscript.value.split(/\s+/).filter(w => w.length > 0)
  return currentWordIdx.value >= 0 && currentWordIdx.value < words.length
    ? words[currentWordIdx.value]
    : '(none)'
})

let animationTimeout: ReturnType<typeof setTimeout> | null = null

const animateWords = () => {
  if (animationTimeout) {
    clearTimeout(animationTimeout)
  }
  currentWordIdx.value = -1

  const animate = (idx: number) => {
    if (idx >= wordCount.value) return
    currentWordIdx.value = idx
    animationTimeout = setTimeout(() => animate(idx + 1), 200)
  }

  animate(0)
}

onUnmounted(() => {
  if (animationTimeout) {
    clearTimeout(animationTimeout)
  }
})

// Mic button state
const demoRecording = ref(false)
const holdRecording = ref(false)
const eventLog = ref<string[]>([])

const logEvent = (event: string) => {
  const timestamp = new Date().toLocaleTimeString()
  eventLog.value.unshift(`[${timestamp}] ${event}`)
  if (eventLog.value.length > 20) {
    eventLog.value.pop()
  }
}
</script>
