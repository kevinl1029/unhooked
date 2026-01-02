import type { Message } from '~/server/utils/llm/types'

interface VoiceChatOptions {
  mythNumber?: number
  onSessionComplete?: () => void
}

export const useVoiceChat = (options: VoiceChatOptions = {}) => {
  const { mythNumber, onSessionComplete } = options

  // State
  const messages = ref<Message[]>([])
  const conversationId = ref<string | null>(null)
  const isLoading = ref(false)
  const sessionComplete = ref(false)
  const error = ref<string | null>(null)

  // Voice session
  const voiceSession = useVoiceSession()

  // Combined processing state
  const isProcessing = computed(() => {
    return isLoading.value || voiceSession.isProcessing.value
  })

  // Send a message and get AI response with voice
  const sendMessage = async (
    content: string,
    inputModality: 'text' | 'voice' = 'text',
    speakResponse = true
  ): Promise<boolean> => {
    if (!content.trim()) return false

    error.value = null

    // Add user message to local state
    const userMessage: Message = { role: 'user', content }
    messages.value.push(userMessage)

    isLoading.value = true

    try {
      // Send to chat API
      const response = await $fetch('/api/chat', {
        method: 'POST',
        body: {
          messages: messages.value,
          conversationId: conversationId.value,
          mythNumber,
          stream: false,
          inputModality
        }
      })

      // Update conversation ID
      if (response.conversationId) {
        conversationId.value = response.conversationId
      }

      // Add assistant message
      const assistantContent = response.content
      messages.value.push({ role: 'assistant', content: assistantContent })

      isLoading.value = false

      // Check for session complete
      if (response.sessionComplete) {
        sessionComplete.value = true
        onSessionComplete?.()
      }

      // Play the response with TTS if requested
      if (speakResponse) {
        // Strip the [SESSION_COMPLETE] token before speaking
        const textToSpeak = assistantContent.replace('[SESSION_COMPLETE]', '').trim()
        await voiceSession.playAIResponse(textToSpeak)
      }

      return true
    } catch (e: any) {
      console.error('[useVoiceChat] Error sending message:', e)
      error.value = e.data?.message || e.message || 'Failed to send message'
      // Remove the optimistically added user message
      messages.value.pop()
      isLoading.value = false
      return false
    }
  }

  // Start a new conversation with AI speaking first
  const startConversation = async (): Promise<boolean> => {
    error.value = null
    isLoading.value = true

    try {
      // Send empty messages to trigger AI's opening message
      const response = await $fetch('/api/chat', {
        method: 'POST',
        body: {
          messages: [],
          conversationId: null,
          mythNumber,
          stream: false
        }
      })

      conversationId.value = response.conversationId

      // Add AI's opening message
      const assistantContent = response.content
      messages.value.push({ role: 'assistant', content: assistantContent })

      isLoading.value = false

      // Speak the opening message
      await voiceSession.playAIResponse(assistantContent)

      return true
    } catch (e: any) {
      console.error('[useVoiceChat] Error starting conversation:', e)
      error.value = e.data?.message || e.message || 'Failed to start conversation'
      isLoading.value = false
      return false
    }
  }

  // Record user voice, transcribe, and send
  const recordAndSend = async (): Promise<boolean> => {
    // Start recording
    const started = await voiceSession.recordUserResponse()
    if (!started) {
      error.value = voiceSession.error.value || 'Failed to start recording'
      return false
    }
    return true
  }

  // Stop recording, transcribe, and send the message
  const stopRecordingAndSend = async (): Promise<boolean> => {
    const transcript = await voiceSession.stopUserRecording()

    if (!transcript) {
      error.value = voiceSession.error.value || 'Could not transcribe audio'
      return false
    }

    // Send the transcribed message
    return sendMessage(transcript, 'voice', true)
  }

  // Load an existing conversation
  const loadConversation = async (id: string): Promise<boolean> => {
    isLoading.value = true
    error.value = null

    try {
      const conversation = await $fetch(`/api/conversations/${id}`)
      conversationId.value = conversation.id
      messages.value = conversation.messages || []
      sessionComplete.value = conversation.session_completed || false
      isLoading.value = false
      return true
    } catch (e: any) {
      console.error('[useVoiceChat] Error loading conversation:', e)
      error.value = e.data?.message || e.message || 'Failed to load conversation'
      isLoading.value = false
      return false
    }
  }

  // Reset for a new conversation
  const reset = () => {
    messages.value = []
    conversationId.value = null
    sessionComplete.value = false
    error.value = null
    voiceSession.cleanup()
  }

  // Cleanup on unmount
  onUnmounted(() => {
    voiceSession.cleanup()
  })

  return {
    // State
    messages: readonly(messages),
    conversationId: readonly(conversationId),
    isLoading: readonly(isLoading),
    isProcessing,
    sessionComplete: readonly(sessionComplete),
    error: readonly(error),

    // Voice session state passthrough
    isAISpeaking: voiceSession.isAISpeaking,
    isRecording: voiceSession.isRecording,
    currentWordIndex: voiceSession.currentWordIndex,
    currentTranscript: voiceSession.currentTranscript,
    getCurrentWord: voiceSession.getCurrentWord,
    getWords: voiceSession.getWords,
    permissionState: voiceSession.permissionState,
    isSupported: voiceSession.isSupported,

    // Methods
    sendMessage,
    startConversation,
    recordAndSend,
    stopRecordingAndSend,
    loadConversation,
    reset,

    // Voice control methods
    pauseAudio: voiceSession.pauseAudio,
    resumeAudio: voiceSession.resumeAudio,
    stopAudio: voiceSession.stopAudio,
    getAudioLevel: voiceSession.getAudioLevel,
    checkPermission: voiceSession.checkPermission,
    requestPermission: voiceSession.requestPermission
  }
}
