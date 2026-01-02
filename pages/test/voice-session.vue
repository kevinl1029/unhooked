<template>
  <div class="min-h-screen bg-gradient-to-b from-brand-bg-light to-brand-bg-dark p-8">
    <div class="max-w-lg mx-auto">
      <h1 class="text-2xl font-bold text-white mb-8">Voice Session Test</h1>

      <!-- Status Cards -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="glass rounded-card p-4 border border-brand-border">
          <p class="text-white-65 text-sm">Permission</p>
          <p :class="permissionClass">{{ permissionState || 'unknown' }}</p>
        </div>
        <div class="glass rounded-card p-4 border border-brand-border">
          <p class="text-white-65 text-sm">Status</p>
          <p class="text-white">
            <span v-if="isAISpeaking" class="text-blue-400">AI Speaking</span>
            <span v-else-if="isRecording" class="text-red-400">Recording</span>
            <span v-else-if="isProcessing" class="text-yellow-400">Processing</span>
            <span v-else class="text-green-400">Ready</span>
          </p>
        </div>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="glass rounded-card p-4 mb-6 border border-red-500/50 bg-red-500/10">
        <p class="text-red-400">{{ error }}</p>
      </div>

      <!-- Transcript Display (when AI is speaking) -->
      <div v-if="currentTranscript" class="glass rounded-card p-6 mb-6 border border-brand-border">
        <p class="text-white-65 text-sm mb-3">AI Response</p>
        <p class="text-white text-lg leading-relaxed">
          <span
            v-for="(word, idx) in getWords"
            :key="idx"
            :class="[
              'transition-colors duration-150',
              idx === currentWordIndex ? 'text-brand-accent font-semibold' : '',
              idx < currentWordIndex ? 'text-white' : 'text-white-65'
            ]"
          >{{ word }} </span>
        </p>
      </div>

      <!-- Audio Level (when recording) -->
      <div v-if="isRecording" class="glass rounded-card p-4 mb-6 border border-brand-border">
        <p class="text-white-65 text-sm mb-2">Recording Level</p>
        <div class="h-4 bg-brand-glass rounded-full overflow-hidden">
          <div
            class="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-75"
            :style="{ width: `${audioLevel * 100}%` }"
          />
        </div>
      </div>

      <!-- Messages History -->
      <div class="glass rounded-card p-4 mb-6 border border-brand-border max-h-64 overflow-y-auto">
        <p class="text-white-65 text-sm mb-3">Messages ({{ messages.length }})</p>
        <div v-if="messages.length === 0" class="text-white-65 text-sm italic">
          No messages yet. Click "Start Conversation" to begin.
        </div>
        <div v-for="(msg, idx) in messages" :key="idx" class="mb-3">
          <p class="text-xs text-white-65 mb-1">{{ msg.role === 'user' ? 'You' : 'AI' }}</p>
          <p :class="msg.role === 'user' ? 'text-white' : 'text-blue-300'">
            {{ msg.content.slice(0, 200) }}{{ msg.content.length > 200 ? '...' : '' }}
          </p>
        </div>
      </div>

      <!-- Controls -->
      <div class="space-y-4">
        <!-- Start Conversation -->
        <button
          v-if="messages.length === 0"
          class="btn-primary w-full px-6 py-4 rounded-pill font-semibold text-lg"
          :disabled="isProcessing"
          @click="handleStartConversation"
        >
          {{ isProcessing ? 'Starting...' : 'Start Conversation' }}
        </button>

        <!-- Recording Controls (after conversation started) -->
        <template v-else>
          <!-- When AI is speaking -->
          <div v-if="isAISpeaking" class="flex gap-3">
            <button
              class="flex-1 px-4 py-3 rounded-pill font-semibold bg-yellow-500 text-black"
              @click="pauseAudio"
            >
              Pause
            </button>
            <button
              class="flex-1 px-4 py-3 rounded-pill font-semibold bg-red-500 text-white"
              @click="stopAudio"
            >
              Skip
            </button>
          </div>

          <!-- When user can respond -->
          <div v-else-if="!isRecording && !isProcessing" class="space-y-3">
            <button
              class="btn-primary w-full px-6 py-4 rounded-pill font-semibold text-lg"
              @click="handleStartRecording"
            >
              Hold to Speak
            </button>
            <p class="text-white-65 text-sm text-center">Or type a response:</p>
            <div class="flex gap-2">
              <input
                v-model="textInput"
                type="text"
                class="flex-1 glass-input rounded-pill px-4 py-3 text-white placeholder-white-65"
                placeholder="Type your message..."
                @keyup.enter="handleSendText"
              />
              <button
                class="btn-primary px-6 py-3 rounded-pill"
                :disabled="!textInput.trim()"
                @click="handleSendText"
              >
                Send
              </button>
            </div>
          </div>

          <!-- When recording -->
          <button
            v-else-if="isRecording"
            class="w-full px-6 py-4 rounded-pill font-semibold text-lg bg-red-500 text-white animate-pulse"
            @click="handleStopRecording"
          >
            Stop Recording
          </button>

          <!-- When processing -->
          <div v-else class="text-center">
            <p class="text-white-65">Processing...</p>
          </div>
        </template>

        <!-- Test TTS Button -->
        <button
          class="w-full px-4 py-2 rounded-pill text-sm bg-brand-glass text-white-85 border border-brand-border"
          :disabled="isProcessing || isAISpeaking"
          @click="handleTestTTS"
        >
          Test TTS: "Hello, this is a test of the text to speech system."
        </button>

        <!-- Reset Button -->
        <button
          v-if="messages.length > 0"
          class="w-full px-4 py-2 rounded-pill text-sm bg-brand-glass text-white-65 border border-brand-border"
          @click="handleReset"
        >
          Reset Conversation
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false
})

const {
  messages,
  isProcessing,
  isAISpeaking,
  isRecording,
  currentWordIndex,
  currentTranscript,
  getWords,
  error,
  permissionState,
  startConversation,
  recordAndSend,
  stopRecordingAndSend,
  sendMessage,
  pauseAudio,
  stopAudio,
  getAudioLevel,
  checkPermission,
  reset
} = useVoiceChat({ mythNumber: 1 })

// Also get playAIResponse for testing
const voiceSession = useVoiceSession()

const textInput = ref('')
const audioLevel = ref(0)
let animationFrame: number | null = null

// Check permission on mount
onMounted(() => {
  checkPermission()
})

// Audio level animation
const updateAudioLevel = () => {
  if (isRecording.value) {
    audioLevel.value = getAudioLevel()
    animationFrame = requestAnimationFrame(updateAudioLevel)
  }
}

watch(isRecording, (recording) => {
  if (recording) {
    updateAudioLevel()
  } else if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
    audioLevel.value = 0
  }
})

onUnmounted(() => {
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
  }
})

const permissionClass = computed(() => {
  switch (permissionState.value) {
    case 'granted': return 'text-green-400'
    case 'denied': return 'text-red-400'
    default: return 'text-yellow-400'
  }
})

const handleStartConversation = async () => {
  await startConversation()
}

const handleStartRecording = async () => {
  await recordAndSend()
}

const handleStopRecording = async () => {
  await stopRecordingAndSend()
}

const handleSendText = async () => {
  if (!textInput.value.trim()) return
  const text = textInput.value
  textInput.value = ''
  await sendMessage(text, 'text', true)
}

const handleTestTTS = async () => {
  await voiceSession.playAIResponse('Hello, this is a test of the text to speech system.')
}

const handleReset = () => {
  reset()
  textInput.value = ''
}
</script>
