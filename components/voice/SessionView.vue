<template>
  <div class="flex flex-col h-full overflow-hidden">
    <!-- Permission Request Overlay -->
    <div
      v-if="showPermissionOverlay"
      class="absolute inset-0 z-50 flex items-center justify-center bg-brand-bg-dark/90 backdrop-blur-sm"
    >
      <div class="glass rounded-card p-8 max-w-md mx-4 text-center border border-brand-border">
        <div class="w-16 h-16 mx-auto mb-6 rounded-full bg-brand-accent/20 flex items-center justify-center">
          <svg class="w-8 h-8 text-brand-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </div>
        <h2 class="text-xl font-bold text-white mb-3">Enable Voice</h2>
        <p class="text-white-65 mb-6">
          This session uses voice conversation. Allow microphone access to speak with your AI coach.
        </p>
        <div class="space-y-3">
          <button
            class="btn-primary w-full px-6 py-3 rounded-pill font-semibold"
            @click="handleRequestPermission"
          >
            Enable Microphone
          </button>
          <button
            class="w-full px-6 py-3 rounded-pill font-semibold text-white-65 hover:text-white transition"
            @click="handleUseTextOnly"
          >
            Use Text Instead
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-h-0 relative">
      <!-- Messages Area -->
      <div ref="messagesContainer" class="flex-1 overflow-y-auto px-4 py-4">
        <template v-if="messages.length === 0 && !isProcessing && !hasFailedTurn">
          <div class="h-full flex items-center justify-center">
            <p class="text-white-65">Starting conversation...</p>
          </div>
        </template>

        <template v-else>
          <!-- Message bubbles -->
          <div
            v-for="(msg, idx) in displayMessages"
            :key="idx"
            class="mb-4"
          >
            <!-- User message -->
            <div v-if="msg.role === 'user'" class="flex justify-end">
              <div class="max-w-[85%] md:max-w-[70%]">
                <div class="glass-input rounded-2xl rounded-br-sm px-4 py-3">
                  <p class="text-white">{{ msg.content }}</p>
                </div>
              </div>
            </div>

            <!-- Assistant message -->
            <div v-else class="flex justify-start">
              <div class="max-w-[85%] md:max-w-[70%] overflow-hidden">
                <div class="glass border border-brand-border rounded-2xl rounded-bl-sm px-4 py-3 overflow-hidden">
                  <!-- Always use word-by-word display for consistent rendering -->
                  <!-- Always pass transcript for full text display; use currentWordIndex for highlighting -->
                  <VoiceWordByWordTranscript
                    :transcript="msg.content"
                    :current-word-index="isAISpeaking && idx === displayMessages.length - 1 ? currentWordIndex : Infinity"
                    :auto-scroll="isAISpeaking && idx === displayMessages.length - 1"
                    container-class="text-base leading-relaxed break-words"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Transcribing indicator (user side - right aligned) -->
          <div v-if="isTranscribing" class="flex justify-end mb-4">
            <div class="glass-input rounded-2xl rounded-br-sm px-4 py-3">
              <div class="flex gap-1">
                <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
              </div>
            </div>
          </div>

          <!-- Assistant processing indicator (left aligned) -->
          <div v-else-if="isProcessing && !isAISpeaking" class="flex justify-start mb-4">
            <div class="glass border border-brand-border rounded-2xl rounded-bl-sm px-4 py-3">
              <div class="flex gap-1">
                <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
                <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
                <span class="w-2 h-2 bg-white-65 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
              </div>
            </div>
          </div>

          <!-- Retry/failover status bubble -->
          <div
            v-if="retryStatusCopy && !hasFailedTurn && isProcessing && !isAISpeaking && !showStreamingTranscript"
            class="flex justify-start mb-4"
          >
            <div class="glass border border-brand-border rounded-2xl rounded-bl-sm px-4 py-3">
              <p class="text-white-65">{{ retryStatusCopy }}</p>
            </div>
          </div>

          <!-- Final actionable failure bubble -->
          <div v-if="hasFailedTurn && failedTurnMessage" class="flex justify-start mb-4">
            <div class="max-w-[85%] md:max-w-[70%]">
              <div class="glass border border-brand-border rounded-2xl rounded-bl-sm px-4 py-3">
                <p class="text-white mb-3">{{ failedTurnMessage }}</p>
                <button
                  class="btn-primary btn-primary-compact rounded-pill font-semibold"
                  :disabled="isProcessing"
                  @click="handleRetryFailedTurn"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Error Display -->
      <div v-if="error" class="px-4 py-2 bg-red-500/20 border-t border-red-500/50">
        <p class="text-red-200 text-sm">{{ error }}</p>
      </div>

      <!-- Voice Controls - fixed min-height to prevent layout jumps between states -->
      <!-- Hide entirely once session completion is triggered to avoid "Session complete" text flash -->
      <div
        v-if="!readOnly && !hideVoiceControls && !hasFailedTurn"
        class="px-4 py-4 border-t border-brand-border min-h-[136px] flex flex-col justify-center"
      >
        <!-- AI Speaking State - always show pause/skip while AI is speaking, even during session end -->
        <div v-if="isAISpeaking" class="text-center space-y-3">
          <VoiceAudioWaveform
            :is-active="true"
            :audio-level="0.6"
            :bar-count="isMobile ? 12 : 20"
            container-class="h-10"
          />
          <div class="flex justify-center gap-4">
            <button
              class="px-6 py-3 rounded-pill font-semibold bg-brand-glass text-white border border-brand-border"
              @click="handlePauseAudio"
            >
              Pause
            </button>
            <button
              class="px-6 py-3 rounded-pill font-semibold bg-brand-glass text-white-65 border border-brand-border"
              @click="handleSkipAudio"
            >
              Skip
            </button>
          </div>
        </div>

        <!-- Paused State - allow resume/skip even during session end -->
        <div v-else-if="isPaused" class="text-center space-y-3">
          <p class="text-white-65 text-sm">Paused</p>
          <div class="flex justify-center gap-4">
            <button
              class="px-6 py-3 rounded-pill font-semibold bg-brand-glass text-white border border-brand-border"
              @click="handleResumeAudio"
            >
              Resume
            </button>
            <button
              class="px-6 py-3 rounded-pill font-semibold bg-brand-glass text-white-65 border border-brand-border"
              @click="handleSkipAudio"
            >
              Skip
            </button>
          </div>
        </div>

        <!-- Session Ending State - show message while waiting for completion card -->
        <div v-else-if="isSessionEnding" class="text-center">
          <p class="text-white-65">Session complete</p>
        </div>

        <!-- Recording State - only show if session is NOT ending -->
        <div v-else-if="isRecording && !isPausedByCeremony" class="text-center space-y-3">
          <VoiceAudioWaveform
            :is-active="true"
            :audio-level="audioLevel"
            :bar-count="isMobile ? 12 : 20"
            container-class="h-10"
            active-bar-class="bg-gradient-to-t from-red-500 to-red-400"
          />
          <VoiceMicButton
            :is-recording="true"
            size="md"
            :show-text-fallback="false"
            @stop="handleStopRecording"
          />
        </div>

        <!-- Ready State - only show if session is NOT ending and NOT paused by ceremony -->
        <div v-else-if="!isProcessing && !isPausedByCeremony" class="text-center space-y-3">
          <VoiceMicButton
            :is-recording="false"
            :disabled="isProcessing"
            size="md"
            :show-text-fallback="!textMode"
            @start="handleStartRecording"
            @text-fallback="textMode = true"
          />
        </div>

        <!-- Processing State -->
        <div v-else class="text-center">
          <p class="text-white-65">Processing...</p>
        </div>

        <!-- Text Input Mode - only show if session is NOT ending and NOT paused by ceremony -->
        <div v-if="textMode && !isRecording && !isAISpeaking && !isSessionEnding && !isPausedByCeremony" class="mt-4">
          <div class="flex gap-2">
            <input
              v-model="textInput"
              type="text"
              class="flex-1 glass-input rounded-pill px-4 py-3 text-white placeholder-white-65"
              placeholder="Type your message..."
              :disabled="isProcessing || isPausedByCeremony"
              @keyup.enter="handleSendText"
            />
            <button
              class="btn-primary px-6 py-3 rounded-pill"
              :disabled="!textInput.trim() || isProcessing || isPausedByCeremony"
              @click="handleSendText"
            >
              Send
            </button>
          </div>
          <button
            class="mt-2 text-white-65 text-sm hover:text-white transition"
            @click="textMode = false"
          >
            Switch to voice
          </button>
        </div>
      </div>

      <!-- Failed turn controls: keep one primary in-chat CTA (Retry) and a quieter alternate path -->
      <div
        v-else-if="!readOnly && !hideVoiceControls && hasFailedTurn"
        class="px-4 py-4 border-t border-brand-border min-h-[136px] flex flex-col justify-center"
      >
        <div v-if="!textMode" class="text-center">
          <button
            class="text-white-65 text-sm hover:text-white transition"
            @click="textMode = true"
          >
            Send a new message instead
          </button>
        </div>

        <div v-else class="mt-2">
          <div class="flex gap-2">
            <input
              v-model="textInput"
              type="text"
              class="flex-1 glass-input rounded-pill px-4 py-3 text-white placeholder-white-65"
              placeholder="Type your message..."
              :disabled="isProcessing || isPausedByCeremony"
              @keyup.enter="handleSendText"
            />
            <button
              class="btn-primary px-6 py-3 rounded-pill"
              :disabled="!textInput.trim() || isProcessing || isPausedByCeremony"
              @click="handleSendText"
            >
              Send
            </button>
          </div>
          <button
            class="mt-2 text-white-65 text-sm hover:text-white transition"
            @click="textMode = false"
          >
            Back to Retry
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Message } from '~/server/utils/llm/types'
import type { IllusionKey, IllusionLayer } from '~/server/utils/llm/task-types'
import { stripChatControlTokens } from '~/utils/chat-control-tokens'

interface Props {
  readOnly?: boolean
  existingConversationId?: string | null
  existingMessages?: Message[]
  sessionType?: 'core' | 'check_in' | 'ceremony' | 'reinforcement' | 'boost'
  illusionKey?: IllusionKey
  illusionLayer?: IllusionLayer
  anchorMoment?: { id: string; transcript: string } | null
}

const props = withDefaults(defineProps<Props>(), {
  readOnly: false,
  existingConversationId: null,
  existingMessages: () => [],
  sessionType: 'core',
  illusionKey: undefined,
  illusionLayer: 'intellectual',
  anchorMoment: null
})

const emit = defineEmits<{
  sessionComplete: [nextIllusion: number | null]
  recordingPrompt: []
  conversationIdUpdate: [conversationId: string | null]
  error: [message: string]
}>()

// Wake lock to prevent screen dimming during session
const { request: requestWakeLock, release: releaseWakeLock } = useWakeLock()

// Voice chat composable
const {
  messages,
  conversationId,
  isProcessing,
  isTranscribing,
  isAISpeaking,
  isRecording,
  currentWordIndex,
  currentTranscript,
  isStreamingMode,
  isTextStreaming,
  retryStatusCopy,
  failedTurnMessage,
  hasFailedTurn,
  getWords,
  getTranscriptText,
  error,
  permissionState,
  isSupported,
  startConversation,
  sendMessage,
  recordAndSend,
  stopRecordingAndSend,
  loadConversation,
  pauseAudio,
  resumeAudio,
  isPaused,
  stopAudio,
  getAudioLevel,
  checkPermission,
  requestPermission,
  retryFailedTurn,
  preInitAudio,
  reset
} = useVoiceChat({
  sessionType: props.sessionType,
  illusionKey: props.illusionKey,
  illusionLayer: props.illusionLayer,
  anchorMoment: props.anchorMoment,
  initialConversationId: props.existingConversationId,
  onSessionComplete: () => {
    // Will be handled via watch
  }
})

// Local state
const messagesContainer = ref<HTMLElement>()
const textMode = ref(false)
const textInput = ref('')
const audioLevel = ref(0)
const showPermissionOverlay = ref(false)
const sessionCompleteDetected = ref(false)
const recordingPromptDetected = ref(false)
const audioHasStartedForCompletion = ref(false)
const sessionCompletionTriggered = ref(false) // True once handleSessionComplete starts
const isPausedByCeremony = ref(false)
let audioLevelFrame: number | null = null

// Responsive check
const isMobile = ref(false)

// Computed: session is ending - locks input controls when [SESSION_COMPLETE] detected
// This prevents users from recording new messages after the AI's final message
const isSessionEnding = computed(() => sessionCompleteDetected.value)

// Computed: hide voice controls entirely once completion is triggered
// This avoids the brief "Session complete" text flash before the card appears
const hideVoiceControls = computed(() => sessionCompletionTriggered.value)

onMounted(() => {
  isMobile.value = window.innerWidth < 768
  window.addEventListener('resize', () => {
    isMobile.value = window.innerWidth < 768
  })
})

// Display messages with ceremony tokens stripped
// Show the live transcript while text is streaming OR while streaming TTS audio is playing
const displayMessages = computed(() => {
  const allMessages = messages.value
    .map(msg => ({
      ...msg,
      content: stripChatControlTokens(msg.content)
    }))
    .filter(msg => !(msg.role === 'assistant' && msg.content.length === 0))

  // Show streaming transcript while text is being streamed OR while streaming TTS audio plays
  // isTextStreaming: text tokens arriving from LLM
  // isStreamingMode: streaming TTS audio is playing
  // isPaused: audio is paused but not finished
  const showStreamingTranscript = (isTextStreaming.value || isStreamingMode.value || isPaused.value) && currentTranscript.value

  if (showStreamingTranscript) {
    // Always use currentTranscript for the message content (full text from LLM)
    // The word-by-word component handles TTS word alignment separately via getWords
    const displayContent = stripChatControlTokens(currentTranscript.value)

    // Check if last message is already the streaming assistant message
    const lastMsg = allMessages[allMessages.length - 1]
    // Add streaming message only if last message isn't assistant
    // When speaking or paused, update existing message instead of adding new one
    const isActivePlayback = isAISpeaking.value || isPaused.value
    if (lastMsg?.role !== 'assistant') {
      // Add streaming message
      allMessages.push({
        role: 'assistant',
        content: displayContent
      })
    } else if (isActivePlayback) {
      // Update the last assistant message with current streaming content
      lastMsg.content = displayContent
    }
  }

  return allMessages
})

const showStreamingTranscript = computed(() => {
  return Boolean((isTextStreaming.value || isStreamingMode.value || isPaused.value) && currentTranscript.value)
})

// Initialize on mount
onMounted(async () => {
  // Request wake lock to prevent screen dimming during session
  await requestWakeLock()

  // Check if we have existing messages/conversation
  if (props.existingMessages.length > 0 && props.existingConversationId) {
    // Load existing conversation (transcript view or resume)
    await loadConversation(props.existingConversationId)
  } else {
    // New conversation - check permission first
    await checkPermission()

    if (permissionState.value === 'granted') {
      // Permission already granted, start conversation
      await startConversation()
    } else if (permissionState.value === 'denied') {
      // Permission denied, use text mode
      textMode.value = true
      await startConversation()
    } else {
      // Need to request permission
      showPermissionOverlay.value = true
    }
  }
})

// Audio level animation
const updateAudioLevel = () => {
  if (isRecording.value) {
    audioLevel.value = getAudioLevel()
    audioLevelFrame = requestAnimationFrame(updateAudioLevel)
  }
}

watch(isRecording, (recording) => {
  if (recording) {
    updateAudioLevel()
  } else {
    if (audioLevelFrame) {
      cancelAnimationFrame(audioLevelFrame)
      audioLevelFrame = null
    }
    audioLevel.value = 0
  }
})

// Auto-scroll when messages change
watch(
  () => messages.value.length,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  }
)

// Keep parent in sync with active conversation ID (required for ceremony completion API)
watch(
  () => conversationId.value,
  (id) => {
    emit('conversationIdUpdate', id)
  },
  { immediate: true }
)

// Watch for session tokens in messages
watch(
  () => messages.value,
  (msgs) => {
    const lastMsg = msgs[msgs.length - 1]
    if (lastMsg?.role === 'assistant') {
      // Detect [SESSION_COMPLETE] token
      if (lastMsg.content.includes('[SESSION_COMPLETE]')) {
        sessionCompleteDetected.value = true
        // If audio is already playing when we detect SESSION_COMPLETE,
        // mark that audio has started (the watch won't catch it since isAISpeaking
        // was already true before sessionCompleteDetected became true)
        if (isAISpeaking.value) {
          audioHasStartedForCompletion.value = true
        }
      }

      // Detect [RECORDING_PROMPT] token
      if (lastMsg.content.includes('[RECORDING_PROMPT]') && !recordingPromptDetected.value) {
        recordingPromptDetected.value = true
        emit('recordingPrompt')
      }
    }
  },
  { deep: true }
)

// Track when audio starts playing for the completion message
watch(
  () => isAISpeaking.value,
  (speaking) => {
    if (speaking && sessionCompleteDetected.value) {
      audioHasStartedForCompletion.value = true
    }
  }
)

// Wait for audio to finish before triggering session complete
watch(
  () => isAISpeaking.value,
  (speaking) => {
    // Only trigger when:
    // 1. Session complete was detected
    // 2. Audio has started playing (so we know TTS was initiated)
    // 3. Audio is now finished (speaking = false)
    if (!speaking && sessionCompleteDetected.value && audioHasStartedForCompletion.value) {
      handleSessionComplete()
    }
  }
)

onUnmounted(() => {
  if (audioLevelFrame) {
    cancelAnimationFrame(audioLevelFrame)
  }
  // Release wake lock when leaving the session
  releaseWakeLock()
})

// Methods
const scrollToBottom = () => {
  const el = messagesContainer.value
  if (el) {
    el.scrollTop = el.scrollHeight
  }
}

const handleRequestPermission = async () => {
  // Pre-initialize AudioContext while still in user gesture context.
  // iOS Safari requires this to allow audio playback.
  await preInitAudio()

  const granted = await requestPermission()
  showPermissionOverlay.value = false

  if (granted) {
    await startConversation()
  } else {
    textMode.value = true
    await startConversation()
  }
}

const handleUseTextOnly = async () => {
  // Pre-initialize AudioContext while still in user gesture context.
  await preInitAudio()

  showPermissionOverlay.value = false
  textMode.value = true
  await startConversation()
}

const handleStartRecording = async () => {
  // Ensure AudioContext is ready for upcoming TTS playback (user gesture context)
  await preInitAudio()
  await recordAndSend()
}

const handleStopRecording = async () => {
  // Ensure AudioContext is ready for upcoming TTS playback (user gesture context)
  await preInitAudio()
  await stopRecordingAndSend()
}

const handlePauseAudio = () => {
  pauseAudio()
}

const handleResumeAudio = () => {
  resumeAudio()
}

const handleSkipAudio = () => {
  stopAudio()
}

const handleSendText = async () => {
  if (!textInput.value.trim() || isProcessing.value) return

  // Ensure AudioContext is ready for upcoming TTS playback (user gesture context)
  await preInitAudio()

  const text = textInput.value
  textInput.value = ''

  // Send with voice response
  await sendMessage(text, 'text', true)
}

const handleRetryFailedTurn = async () => {
  await preInitAudio()
  await retryFailedTurn()
}

const sendTextMessage = async (content: string) => {
  if (!content.trim()) {
    return false
  }
  await preInitAudio()
  return sendMessage(content, 'text', true)
}

const handleSessionComplete = async () => {
  // Hide voice controls immediately to avoid "Session complete" text flash
  sessionCompletionTriggered.value = true

  // Parent routes own completion behavior by session type.
  emit('sessionComplete', null)
}

// Expose pause/resume methods for ceremony orchestration
const pause = () => {
  isPausedByCeremony.value = true
}

const resume = () => {
  isPausedByCeremony.value = false
}

defineExpose({
  pause,
  resume,
  sendTextMessage
})
</script>
