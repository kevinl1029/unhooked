<template>
  <div class="min-h-screen bg-gradient-to-b from-brand-bg-light to-brand-bg-dark p-8">
    <div class="max-w-md mx-auto">
      <h1 class="text-2xl font-bold text-white mb-8">Audio Recorder Test</h1>

      <!-- Browser Support Check -->
      <div class="glass rounded-card p-4 mb-6 border border-brand-border">
        <h2 class="text-lg font-semibold text-white mb-2">Browser Support</h2>
        <p :class="isSupported ? 'text-green-400' : 'text-red-400'">
          {{ isSupported ? 'Audio recording is supported' : 'Audio recording NOT supported' }}
        </p>
      </div>

      <!-- Permission Status -->
      <div class="glass rounded-card p-4 mb-6 border border-brand-border">
        <h2 class="text-lg font-semibold text-white mb-2">Microphone Permission</h2>
        <p class="text-white-85 mb-3">
          Status: <span :class="permissionClass">{{ permissionState || 'unknown' }}</span>
        </p>
        <button
          v-if="permissionState !== 'granted'"
          class="btn-primary px-4 py-2 rounded-pill text-sm"
          @click="handleRequestPermission"
        >
          Request Permission
        </button>
      </div>

      <!-- Recording Controls -->
      <div class="glass rounded-card p-4 mb-6 border border-brand-border">
        <h2 class="text-lg font-semibold text-white mb-4">Recording</h2>

        <!-- Audio Level Meter -->
        <div class="mb-4">
          <p class="text-white-65 text-sm mb-2">Audio Level</p>
          <div class="h-4 bg-brand-glass rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-brand-accent to-brand-accent-light transition-all duration-75"
              :style="{ width: `${audioLevel * 100}%` }"
            />
          </div>
          <p class="text-white-65 text-xs mt-1">{{ (audioLevel * 100).toFixed(0) }}%</p>
        </div>

        <!-- Waveform Visualization -->
        <div class="mb-4">
          <p class="text-white-65 text-sm mb-2">Waveform</p>
          <div class="flex items-end justify-center gap-1 h-16 bg-brand-glass rounded-lg p-2">
            <div
              v-for="(bar, i) in waveformBars"
              :key="i"
              class="w-2 bg-gradient-to-t from-brand-accent to-brand-accent-light rounded-full transition-all duration-75"
              :style="{ height: `${bar}%` }"
            />
          </div>
        </div>

        <!-- Controls -->
        <div class="flex gap-3">
          <button
            v-if="!isRecording"
            class="btn-primary flex-1 px-4 py-3 rounded-pill font-semibold"
            :disabled="!isSupported"
            @click="handleStart"
          >
            Start Recording
          </button>

          <template v-else>
            <button
              class="flex-1 px-4 py-3 rounded-pill font-semibold bg-yellow-500 text-black"
              @click="isPaused ? handleResume() : handlePause()"
            >
              {{ isPaused ? 'Resume' : 'Pause' }}
            </button>
            <button
              class="flex-1 px-4 py-3 rounded-pill font-semibold bg-red-500 text-white"
              @click="handleStop"
            >
              Stop
            </button>
          </template>
        </div>

        <!-- Recording Status -->
        <p v-if="isRecording" class="text-center text-white-85 mt-3">
          <span class="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse mr-2" />
          {{ isPaused ? 'Paused' : 'Recording...' }}
        </p>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="glass rounded-card p-4 mb-6 border border-red-500/50 bg-red-500/10">
        <p class="text-red-400">{{ error }}</p>
      </div>

      <!-- Recorded Audio Playback -->
      <div v-if="recordedBlobUrl" class="glass rounded-card p-4 border border-brand-border">
        <h2 class="text-lg font-semibold text-white mb-4">Recorded Audio</h2>
        <audio :src="recordedBlobUrl" controls class="w-full" />
        <p class="text-white-65 text-sm mt-2">
          Size: {{ recordedBlobSize }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const {
  isRecording,
  isPaused,
  error,
  permissionState,
  isSupported,
  checkPermission,
  requestPermission,
  start,
  stop,
  pause,
  resume,
  getAudioLevel,
  getFrequencyData
} = useAudioRecorder()

const audioLevel = ref(0)
const waveformBars = ref<number[]>(Array(20).fill(5))
const recordedBlob = ref<Blob | null>(null)
const recordedBlobUrl = ref('')

// Check permission on mount
onMounted(() => {
  checkPermission()
})

// Animation loop for audio visualization
let animationFrame: number | null = null

const updateVisualization = () => {
  if (isRecording.value && !isPaused.value) {
    // Update audio level
    audioLevel.value = getAudioLevel()

    // Update waveform
    const freqData = getFrequencyData()
    if (freqData) {
      const barsCount = 20
      const step = Math.floor(freqData.length / barsCount)
      const newBars: number[] = []

      for (let i = 0; i < barsCount; i++) {
        const value = freqData[i * step] || 0
        // Convert to percentage (5-100 range for min visibility)
        newBars.push(Math.max(5, (value / 255) * 100))
      }
      waveformBars.value = newBars
    }

    animationFrame = requestAnimationFrame(updateVisualization)
  } else {
    // Reset when not recording
    audioLevel.value = 0
    waveformBars.value = Array(20).fill(5)
  }
}

watch(isRecording, (recording) => {
  if (recording) {
    updateVisualization()
  } else if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
  if (recordedBlobUrl.value) {
    URL.revokeObjectURL(recordedBlobUrl.value)
  }
})

const permissionClass = computed(() => {
  switch (permissionState.value) {
    case 'granted': return 'text-green-400'
    case 'denied': return 'text-red-400'
    default: return 'text-yellow-400'
  }
})

const recordedBlobSize = computed(() => {
  if (!recordedBlob.value) return ''
  const bytes = recordedBlob.value.size
  if (bytes < 1024) return `${bytes} bytes`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
})

const handleRequestPermission = async () => {
  await requestPermission()
}

const handleStart = async () => {
  console.log('[test-page] handleStart called, isSupported:', isSupported.value)
  // Clear previous recording
  if (recordedBlobUrl.value) {
    URL.revokeObjectURL(recordedBlobUrl.value)
    recordedBlobUrl.value = ''
    recordedBlob.value = null
  }
  const result = await start()
  console.log('[test-page] start() returned:', result)
}

const handleStop = async () => {
  const blob = await stop()
  if (blob) {
    recordedBlob.value = blob
    recordedBlobUrl.value = URL.createObjectURL(blob)
  }
}

const handlePause = () => {
  pause()
}

const handleResume = () => {
  resume()
}
</script>
