import type { Message } from '~/server/utils/llm/types'

interface VoiceChatOptions {
  illusionNumber?: number
  illusionKey?: string
  sessionType?: 'core' | 'check_in' | 'ceremony' | 'reinforcement' | 'boost'
  checkInId?: string
  checkInPrompt?: string
  anchorMoment?: { id: string; transcript: string } | null // For reinforcement sessions
  onSessionComplete?: () => void
  enableStreamingTTS?: boolean // Enable streaming TTS when supported
}

export const useVoiceChat = (options: VoiceChatOptions = {}) => {
  const {
    illusionNumber,
    illusionKey,
    sessionType = 'core',
    checkInId,
    checkInPrompt,
    anchorMoment,
    onSessionComplete,
    enableStreamingTTS = true
  } = options

  // State
  const messages = ref<Message[]>([])
  const conversationId = ref<string | null>(null)
  const isLoading = ref(false)
  const sessionComplete = ref(false)
  const error = ref<string | null>(null)
  const useStreamingTTS = ref(false) // Will be set based on server response

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
    console.log('[sendMessage] After push user message, messages.length:', messages.value.length, 'roles:', messages.value.map(m => m.role))

    isLoading.value = true

    // Use streaming TTS if enabled and speaking
    const shouldStreamTTS = enableStreamingTTS && speakResponse

    try {
      if (shouldStreamTTS) {
        // Use streaming mode for TTS
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: messages.value,
            conversationId: conversationId.value,
            illusionNumber,
            illusionKey,
            sessionType,
            checkInId,
            checkInPrompt,
            anchorMoment,
            stream: true,
            streamTTS: true,
            inputModality
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body reader')
        }

        // Process the streaming response
        const result = await voiceSession.playStreamingResponse(reader)

        // Update state based on streaming result
        if (result.conversationId) {
          conversationId.value = result.conversationId
        }

        // Add assistant message from the streamed content
        // Use getTranscriptText which prefers TTS-derived text for consistency with what was displayed
        const assistantContent = voiceSession.getTranscriptText.value
        messages.value.push({ role: 'assistant', content: assistantContent })
        console.log('[sendMessage] After push assistant message, messages.length:', messages.value.length, 'roles:', messages.value.map(m => m.role))

        isLoading.value = false
        useStreamingTTS.value = true

        return result.success
      } else {
        // Use non-streaming mode (batch TTS)
        const response = await $fetch('/api/chat', {
          method: 'POST',
          body: {
            messages: messages.value,
            conversationId: conversationId.value,
            illusionNumber,
            illusionKey,
            sessionType,
            checkInId,
            checkInPrompt,
            anchorMoment,
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
      }
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
      if (enableStreamingTTS) {
        // Use streaming mode for TTS
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [],
            conversationId: null,
            illusionNumber,
            illusionKey,
            sessionType,
            checkInId,
            checkInPrompt,
            anchorMoment,
            stream: true,
            streamTTS: true
          })
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error('No response body reader')
        }

        // Process the streaming response
        const result = await voiceSession.playStreamingResponse(reader)

        // Update state
        if (result.conversationId) {
          conversationId.value = result.conversationId
        }

        // Add AI's opening message
        // Use getTranscriptText which prefers TTS-derived text for consistency with what was displayed
        const assistantContent = voiceSession.getTranscriptText.value
        messages.value.push({ role: 'assistant', content: assistantContent })
        console.log('[startConversation] After push first assistant message, messages.length:', messages.value.length, 'roles:', messages.value.map(m => m.role))

        isLoading.value = false
        useStreamingTTS.value = true

        return result.success
      } else {
        // Non-streaming mode
        const response = await $fetch('/api/chat', {
          method: 'POST',
          body: {
            messages: [],
            conversationId: null,
            illusionNumber,
            illusionKey,
            sessionType,
            checkInId,
            checkInPrompt,
            anchorMoment,
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
      }
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
    useStreamingTTS: readonly(useStreamingTTS),

    // Voice session state passthrough
    isAISpeaking: voiceSession.isAISpeaking,
    isPaused: voiceSession.isPaused,
    isRecording: voiceSession.isRecording,
    isTranscribing: voiceSession.isTranscribing,
    isAudioReady: voiceSession.isAudioReady,
    currentWordIndex: voiceSession.currentWordIndex,
    currentTranscript: voiceSession.currentTranscript,
    getCurrentWord: voiceSession.getCurrentWord,
    getWords: voiceSession.getWords,
    getTranscriptText: voiceSession.getTranscriptText,
    permissionState: voiceSession.permissionState,
    isSupported: voiceSession.isSupported,
    isStreamingMode: voiceSession.isStreamingMode,
    isTextStreaming: voiceSession.isTextStreaming,
    isWaitingForChunks: voiceSession.isWaitingForChunks,

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
