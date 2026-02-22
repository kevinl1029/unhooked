import type { Message } from '~/server/utils/llm/types'
import type { IllusionKey, IllusionLayer } from '~/server/utils/llm/task-types'
import { stripChatControlTokens } from '~/utils/chat-control-tokens'
import type { ModelType } from '~/server/utils/llm/types'

interface VoiceChatOptions {
  illusionKey?: IllusionKey
  illusionLayer?: IllusionLayer
  sessionType?: 'core' | 'check_in' | 'ceremony' | 'reinforcement' | 'boost'
  checkInId?: string
  checkInPrompt?: string
  anchorMoment?: { id: string; transcript: string } | null // For reinforcement sessions
  initialConversationId?: string | null // Pre-created conversation ID (e.g., from /api/reinforcement/start)
  onSessionComplete?: () => void
  enableStreamingTTS?: boolean // Enable streaming TTS when supported
}

type TurnState = 'idle' | 'retrying_primary' | 'failing_over' | 'failed_actionable'

type ResilienceRoute = 'primary' | 'secondary'

interface FailedTurn {
  content: string
  inputModality: 'text' | 'voice'
  speakResponse: boolean
  assistantFirst?: boolean
}

interface StreamingAttemptResult {
  success: boolean
  transient: boolean
  sessionComplete: boolean
  errorMessage: string | null
}

const FINAL_FAILURE_COPY = 'I\'m still here. I had trouble replying just now. Tap Retry and I\'ll pick up right where we left off.'

const parseBoolean = (value: unknown, defaultValue: boolean) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }
  return defaultValue
}

const parsePositiveNumber = (value: unknown, defaultValue: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue
}

const isTransientStatus = (status: number | null | undefined) => {
  if (!status) return true
  if (status === 400 || status === 401 || status === 403) return false
  return status === 503 || status === 408 || status === 429 || status >= 500
}

export const useVoiceChat = (options: VoiceChatOptions = {}) => {
  const {
    illusionKey,
    illusionLayer = 'intellectual',
    sessionType = 'core',
    checkInId,
    checkInPrompt,
    anchorMoment,
    initialConversationId = null,
    onSessionComplete,
    enableStreamingTTS = true
  } = options

  const config = useRuntimeConfig()
  const resilienceEnabled = parseBoolean(config.public.chatResilienceEnabled, true)
  const retryBackoffMinMs = parsePositiveNumber(config.public.chatRetryBackoffMinMs, 600)
  const retryBackoffMaxMs = parsePositiveNumber(config.public.chatRetryBackoffMaxMs, 1200)
  const primaryModel = ((config.public.chatPrimaryProvider as ModelType | undefined) || 'groq')
  const secondaryModel = ((config.public.chatSecondaryProvider as ModelType | undefined) || 'gemini')

  // State
  const messages = ref<Message[]>([])
  const conversationId = ref<string | null>(initialConversationId)
  const isLoading = ref(false)
  const sessionComplete = ref(false)
  const error = ref<string | null>(null)
  const useStreamingTTS = ref(false) // Will be set based on server response
  const turnState = ref<TurnState>('idle')
  const failedTurn = ref<FailedTurn | null>(null)

  // Voice session
  const voiceSession = useVoiceSession()

  // Combined processing state
  const isProcessing = computed(() => {
    return isLoading.value || voiceSession.isProcessing.value
  })

  const retryStatusCopy = computed(() => {
    if (turnState.value === 'retrying_primary') return 'One moment...'
    if (turnState.value === 'failing_over') return 'Still with you...'
    return null
  })

  const hasFailedTurn = computed(() => turnState.value === 'failed_actionable' && !!failedTurn.value)

  const createDebugRequestId = () => {
    const random = Math.random().toString(36).slice(2, 8)
    return `voice-${Date.now()}-${random}`
  }

  const waitRandomBackoff = async () => {
    const lower = Math.min(retryBackoffMinMs, retryBackoffMaxMs)
    const upper = Math.max(retryBackoffMinMs, retryBackoffMaxMs)
    const delay = Math.floor(lower + Math.random() * (upper - lower + 1))
    await new Promise(resolve => setTimeout(resolve, delay))
  }

  const bootstrapWithRetry = async (openingText: string): Promise<{ conversationId: string } | null> => {
    const maxRetries = 3
    const maxWindowMs = 15_000
    const startTime = Date.now()

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await $fetch('/api/session/bootstrap', {
          method: 'POST',
          body: { illusionKey, illusionLayer, sessionType, openingText }
        })
        return result as unknown as { conversationId: string }
      } catch (e) {
        const elapsed = Date.now() - startTime
        if (attempt >= maxRetries || elapsed >= maxWindowMs) {
          console.warn('[useVoiceChat] Bootstrap failed after retries', { attempt, elapsed })
          return null
        }
        // Exponential backoff: 1s, 2s, 4s
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), maxWindowMs - elapsed)
        await new Promise(resolve => setTimeout(resolve, backoffMs))
      }
    }
    return null
  }

  const sendStreamingAttempt = async (
    inputModality: 'text' | 'voice',
    model: ModelType,
    attemptNumber: number,
    route: ResilienceRoute
  ): Promise<StreamingAttemptResult> => {
    const debugRequestId = createDebugRequestId()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          debugRequestId,
          messages: messages.value,
          conversationId: conversationId.value,
          illusionKey,
          illusionLayer,
          sessionType,
          checkInId,
          checkInPrompt,
          anchorMoment,
          model,
          stream: true,
          streamTTS: true,
          inputModality,
          resilienceAttempt: attemptNumber,
          resilienceRoute: route
        })
      })

      if (!response.ok) {
        return {
          success: false,
          transient: isTransientStatus(response.status),
          sessionComplete: false,
          errorMessage: `HTTP ${response.status}`
        }
      }

      const reader = response.body?.getReader()
      if (!reader) {
        return {
          success: false,
          transient: true,
          sessionComplete: false,
          errorMessage: 'No response body reader'
        }
      }

      const streamResult = await voiceSession.playStreamingResponse(reader)

      if (streamResult.conversationId) {
        conversationId.value = streamResult.conversationId
      }

      const assistantContent = voiceSession.getTranscriptText.value.trim()
      const isSuccess =
        streamResult.success
        && streamResult.sawDone
        && !streamResult.sawErrorEvent
        && assistantContent.length > 0

      if (!isSuccess) {
        return {
          success: false,
          transient: streamResult.sawErrorEvent
            ? isTransientStatus(streamResult.errorStatus)
            : true,
          sessionComplete: false,
          errorMessage: streamResult.sawErrorEvent
            ? `stream_error_${streamResult.errorStatus ?? 'unknown'}`
            : 'stream_incomplete'
        }
      }

      messages.value.push({ role: 'assistant', content: assistantContent })
      useStreamingTTS.value = true

      if (streamResult.sessionComplete) {
        sessionComplete.value = true
        onSessionComplete?.()
      }

      console.log('[useVoiceChat] Streaming attempt success', {
        debugRequestId,
        attemptNumber,
        route,
        model,
        conversationId: conversationId.value,
        assistantContentLength: assistantContent.length
      })

      return {
        success: true,
        transient: false,
        sessionComplete: streamResult.sessionComplete,
        errorMessage: null
      }
    } catch (e: any) {
      const status = e?.status ?? e?.data?.status ?? null
      return {
        success: false,
        transient: isTransientStatus(status),
        sessionComplete: false,
        errorMessage: e?.data?.message || e?.message || 'Streaming request failed'
      }
    }
  }

  const runStreamingWithResilience = async (
    inputModality: 'text' | 'voice',
    replayableTurn: FailedTurn | null
  ): Promise<boolean> => {
    const setFinalFailure = () => {
      if (replayableTurn) {
        turnState.value = 'failed_actionable'
        failedTurn.value = replayableTurn
      } else {
        turnState.value = 'idle'
      }
    }

    turnState.value = 'idle'

    const firstAttempt = await sendStreamingAttempt(inputModality, primaryModel, 1, 'primary')
    if (firstAttempt.success) {
      failedTurn.value = null
      return true
    }

    if (!resilienceEnabled || !firstAttempt.transient) {
      setFinalFailure()
      return false
    }

    turnState.value = 'retrying_primary'
    await waitRandomBackoff()

    const secondAttempt = await sendStreamingAttempt(inputModality, primaryModel, 2, 'primary')
    if (secondAttempt.success) {
      turnState.value = 'idle'
      failedTurn.value = null
      return true
    }

    if (!secondAttempt.transient) {
      setFinalFailure()
      return false
    }

    turnState.value = 'failing_over'

    const thirdAttempt = await sendStreamingAttempt(inputModality, secondaryModel, 3, 'secondary')
    if (thirdAttempt.success) {
      turnState.value = 'idle'
      failedTurn.value = null
      return true
    }

    setFinalFailure()

    return false
  }

  // Send a message and get AI response with voice
  const sendMessage = async (
    content: string,
    inputModality: 'text' | 'voice' = 'text',
    speakResponse = true
  ): Promise<boolean> => {
    if (!content.trim()) return false

    error.value = null

    // New user turn should clear any failed-turn actionable UI.
    if (failedTurn.value) {
      failedTurn.value = null
      turnState.value = 'idle'
    }

    // Add user message to local state
    const userMessage: Message = { role: 'user', content }
    messages.value.push(userMessage)

    isLoading.value = true

    // Use streaming TTS if enabled and speaking
    const shouldStreamTTS = enableStreamingTTS && speakResponse

    try {
      if (shouldStreamTTS) {
        const success = await runStreamingWithResilience(inputModality, {
          content,
          inputModality,
          speakResponse
        })
        isLoading.value = false

        if (!success && !hasFailedTurn.value) {
          error.value = 'Failed to send message'
        }
        return success
      }

      // Use non-streaming mode (batch TTS)
      const response = await $fetch('/api/chat', {
        method: 'POST',
        body: {
          messages: messages.value,
          conversationId: conversationId.value,
          illusionKey,
          illusionLayer,
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

      // Add assistant message (never append empty)
      const assistantContent = (response.content || '').trim()
      if (assistantContent.length > 0) {
        messages.value.push({ role: 'assistant', content: assistantContent })
      }

      isLoading.value = false

      // Check for session complete
      if (response.sessionComplete) {
        sessionComplete.value = true
        onSessionComplete?.()
      }

      // Play the response with TTS if requested
      if (speakResponse && assistantContent.length > 0) {
        const textToSpeak = stripChatControlTokens(assistantContent)
        if (textToSpeak.length > 0) {
          await voiceSession.playAIResponse(textToSpeak)
        }
      }

      return assistantContent.length > 0
    } catch (e: any) {
      console.error('[useVoiceChat] Error sending message:', e)
      error.value = e.data?.message || e.message || 'Failed to send message'
      isLoading.value = false
      return false
    }
  }

  const retryFailedTurn = async (): Promise<boolean> => {
    if (!failedTurn.value || isLoading.value) {
      return false
    }

    error.value = null
    isLoading.value = true

    const turnToReplay = failedTurn.value
    const success = await runStreamingWithResilience(turnToReplay.inputModality, turnToReplay)

    isLoading.value = false

    if (!success && !hasFailedTurn.value) {
      error.value = 'Failed to send message'
    }

    return success
  }

  // Start a new conversation with AI speaking first
  const startConversation = async (): Promise<boolean> => {
    error.value = null
    isLoading.value = true

    try {
      // === FAST-START PATH (core sessions only) ===
      if (sessionType === 'core' && illusionKey) {
        try {
          const opening = await $fetch('/api/session/opening', {
            method: 'GET',
            query: { illusionKey, illusionLayer, sessionType }
          })

          if (opening.text) {
            // Add message immediately so text displays during audio playback
            messages.value.push({ role: 'assistant', content: opening.text })

            // Bootstrap in background (non-blocking)
            bootstrapWithRetry(opening.text).then(result => {
              if (result?.conversationId) {
                conversationId.value = result.conversationId
              }
            }).catch(() => {})

            isLoading.value = false

            // === Tier 1: Pre-stored audio ===
            if (opening.audioUrl && opening.wordTimings && opening.contentType) {
              const downloadStart = Date.now()
              try {
                const audioSuccess = await Promise.race([
                  voiceSession.playFromUrl(
                    opening.audioUrl,
                    opening.text,
                    opening.wordTimings,
                    opening.timingSource || 'estimated'
                  ),
                  new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('Audio download timeout')), 3000)
                  )
                ])

                if (audioSuccess) {
                  console.log('[useVoiceChat] Tier 1: pre-stored audio played', {
                    illusionKey, illusionLayer,
                    source: opening.source,
                    downloadMs: Date.now() - downloadStart
                  })
                  return true
                }
              } catch (e: any) {
                console.log('[useVoiceChat] Tier 1 failed, falling to Tier 2', {
                  error: e?.message,
                  downloadMs: Date.now() - downloadStart
                })
              }
            }

            // === Tier 2: Real-time TTS with pre-computed text ===
            try {
              const audioSuccess = await voiceSession.playAIResponse(opening.text)
              if (audioSuccess) {
                console.log('[useVoiceChat] Tier 2: real-time TTS played', {
                  illusionKey, illusionLayer, source: opening.source
                })
                return true
              }
            } catch (audioError: any) {
              console.log('[useVoiceChat] Tier 2 failed, falling to Tier 3', {
                error: audioError?.message
              })
            }

            // Both audio tiers failed — remove message and fall through
            messages.value.pop()
            isLoading.value = true
          }
        } catch (e: any) {
          console.log('[useVoiceChat] Fast-start path failed, falling to Tier 3', {
            error: e?.data?.message || e?.message
          })
        }
      }

      // === Tier 3: Existing flow (full LLM+TTS) ===
      if (enableStreamingTTS) {
        const success = await runStreamingWithResilience('text', {
          content: '',
          inputModality: 'text',
          speakResponse: true,
          assistantFirst: true
        })
        isLoading.value = false

        if (!success && !hasFailedTurn.value) {
          error.value = 'Failed to start conversation'
        }

        return success
      }

      // Non-streaming mode
      const response = await $fetch('/api/chat', {
        method: 'POST',
        body: {
          messages: [],
          conversationId: conversationId.value,
          illusionKey,
          illusionLayer,
          sessionType,
          checkInId,
          checkInPrompt,
          anchorMoment,
          stream: false
        }
      })

      conversationId.value = response.conversationId

      // Add AI's opening message
      const assistantContent = (response.content || '').trim()
      if (assistantContent.length > 0) {
        messages.value.push({ role: 'assistant', content: assistantContent })
      }

      isLoading.value = false

      // Speak the opening message
      if (assistantContent.length > 0) {
        await voiceSession.playAIResponse(assistantContent)
      }

      return assistantContent.length > 0
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
    turnState.value = 'idle'
    failedTurn.value = null
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
    turnState: readonly(turnState),
    retryStatusCopy,
    failedTurnMessage: computed(() => hasFailedTurn.value ? FINAL_FAILURE_COPY : null),
    hasFailedTurn,

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
    retryFailedTurn,
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
    requestPermission: voiceSession.requestPermission,
    preInitAudio: voiceSession.preInitAudio
  }
}
