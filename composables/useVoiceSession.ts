import type { WordTiming } from '~/server/utils/tts/types'

interface TTSResponse {
  audio: string // base64
  contentType: string
  wordTimings: WordTiming[]
  estimatedDurationMs: number
  voice: string
  provider: 'openai' | 'elevenlabs' | 'groq'
  timingSource: 'actual' | 'estimated'
}

interface TranscribeResponse {
  text: string
  duration: number | null
  language: string | null
}

export const useVoiceSession = () => {
  // State
  const isAISpeaking = ref(false)
  const isPaused = ref(false)
  const isRecording = ref(false)
  const isProcessing = ref(false)
  const isTranscribing = ref(false) // True specifically during speech-to-text transcription
  const isAudioReady = ref(false)
  const currentWordIndex = ref(-1)
  const currentTranscript = ref('')
  const error = ref<string | null>(null)

  // Audio playback refs
  let audioElement: HTMLAudioElement | null = null
  let wordTimings: WordTiming[] = []
  let playbackStartTime = 0
  let wordTimingInterval: ReturnType<typeof setInterval> | null = null

  // Audio recorder
  const recorder = useAudioRecorder()

  // Streaming TTS support
  const streamingTTSResult = ref<{ sessionComplete: boolean; usedStreamingTTS: boolean } | null>(null)

  // Track whether we're currently receiving streamed text (regardless of TTS mode)
  const isTextStreaming = ref(false)

  const streamingTTS = useStreamingTTS({
    onTextUpdate: (text) => {
      currentTranscript.value = text
    },
    onComplete: (_fullText, sessionComplete, usedStreamingTTS) => {
      // Store the result for playStreamingResponse to use
      streamingTTSResult.value = { sessionComplete, usedStreamingTTS }
      // Text streaming is done
      isTextStreaming.value = false
    },
    onError: (err) => {
      error.value = err
      isTextStreaming.value = false
    },
    onAudioComplete: () => {
      // Audio playback finished - update state
      console.log('[onAudioComplete] Audio finished - setting isAISpeaking=false, streamingModeFlag=false, isPaused=false')
      isAISpeaking.value = false
      streamingModeFlag.value = false
      isPaused.value = false
    },
    onAudioStart: () => {
      // First audio chunk started playing - update state immediately
      console.log('[onAudioStart] Audio started - setting isAISpeaking=true, streamingModeFlag=true')
      isAISpeaking.value = true
      streamingModeFlag.value = true
    }
  })
  // Flag to track if we're in streaming TTS mode (set when result confirms streaming was used)
  const streamingModeFlag = ref(false)
  // isStreamingMode is true when audio is playing OR the flag is set
  // This ensures word highlighting starts immediately when audio starts, not after stream completes
  const isStreamingMode = computed(() => streamingModeFlag.value || streamingTTS.isPlaying.value)

  // Synthesize text to speech and play it
  const playAIResponse = async (text: string): Promise<boolean> => {
    if (!text.trim()) return false

    error.value = null
    isProcessing.value = true
    isAudioReady.value = false
    currentTranscript.value = text
    currentWordIndex.value = -1

    try {
      // Call TTS API
      const response = await $fetch<TTSResponse>('/api/voice/synthesize', {
        method: 'POST',
        body: { text }
      })

      wordTimings = response.wordTimings
      const hasActualTimings = response.timingSource === 'actual'
      isProcessing.value = false

      // Create audio element and play
      const audioBlob = base64ToBlob(response.audio, response.contentType)
      const audioUrl = URL.createObjectURL(audioBlob)

      // Clean up previous audio
      if (audioElement) {
        audioElement.pause()
        URL.revokeObjectURL(audioElement.src)
      }

      audioElement = new Audio(audioUrl)

      return new Promise((resolve) => {
        audioElement!.onloadedmetadata = () => {
          // Only scale word timings if they were estimated (not actual from ElevenLabs)
          // ElevenLabs provides actual word timings that don't need rescaling
          if (!hasActualTimings) {
            const actualDurationMs = audioElement!.duration * 1000
            if (wordTimings.length > 0 && actualDurationMs > 0) {
              const estimatedDurationMs = wordTimings[wordTimings.length - 1].endMs
              if (estimatedDurationMs > 0) {
                const scaleFactor = actualDurationMs / estimatedDurationMs
                wordTimings = wordTimings.map(timing => ({
                  word: timing.word,
                  startMs: Math.round(timing.startMs * scaleFactor),
                  endMs: Math.round(timing.endMs * scaleFactor)
                }))
              }
            }
          }
          // Audio is now ready to play
          isAudioReady.value = true
        }

        audioElement!.onplay = () => {
          isAISpeaking.value = true
          playbackStartTime = Date.now()
          startWordTracking()
        }

        audioElement!.onended = () => {
          isAISpeaking.value = false
          currentWordIndex.value = wordTimings.length - 1 // Show last word
          stopWordTracking()
          URL.revokeObjectURL(audioUrl)
          resolve(true)
        }

        audioElement!.onerror = (e) => {
          console.error('[useVoiceSession] Audio playback error:', e)
          error.value = 'Failed to play audio'
          isAISpeaking.value = false
          stopWordTracking()
          URL.revokeObjectURL(audioUrl)
          resolve(false)
        }

        audioElement!.play().catch((e) => {
          console.error('[useVoiceSession] Audio play() failed:', e)
          error.value = 'Failed to start audio playback'
          isAISpeaking.value = false
          resolve(false)
        })
      })
    } catch (e: any) {
      console.error('[useVoiceSession] TTS error:', e)
      error.value = e.data?.message || e.message || 'Failed to synthesize speech'
      isProcessing.value = false
      return false
    }
  }

  /**
   * Play streaming TTS response from SSE stream
   * This is used when streamTTS=true and provider supports it (Groq)
   * Falls back to batch TTS if server doesn't support streaming TTS
   */
  const playStreamingResponse = async (
    reader: ReadableStreamDefaultReader<Uint8Array>
  ): Promise<{ success: boolean; sessionComplete: boolean; conversationId: string | null }> => {
    console.log('[playStreamingResponse] START - setting isTextStreaming=true, clearing currentTranscript')
    error.value = null
    streamingTTSResult.value = null
    currentTranscript.value = ''
    currentWordIndex.value = -1
    isTextStreaming.value = true

    try {
      // Process the stream (text tokens + optional audio chunks)
      await streamingTTS.processStream(reader)

      const convId = streamingTTS.conversationId.value
      const result = streamingTTSResult.value

      // Check if streaming TTS was actually used
      if (result?.usedStreamingTTS) {
        // Streaming TTS was used - audio is playing/will play
        streamingModeFlag.value = true
        isAISpeaking.value = true
        // Note: streamingModeFlag stays true until onAudioComplete callback is called
        return {
          success: true,
          sessionComplete: result.sessionComplete,
          conversationId: convId
        }
      } else {
        // Streaming TTS was NOT used by server - fall back to batch TTS
        // The text is already in currentTranscript from onTextUpdate
        const textToSpeak = currentTranscript.value
        if (textToSpeak.trim()) {
          // Keep isTextStreaming true during batch TTS so the message stays visible
          // (playAIResponse sets isAudioReady=false which would hide it otherwise)
          isTextStreaming.value = true
          // Use batch TTS to synthesize and play the complete response
          const success = await playAIResponse(textToSpeak)
          // Now we can turn off text streaming - audio is ready/playing
          isTextStreaming.value = false
          return {
            success,
            sessionComplete: result?.sessionComplete || false,
            conversationId: convId
          }
        } else {
          return {
            success: true,
            sessionComplete: result?.sessionComplete || false,
            conversationId: convId
          }
        }
      }
    } catch (e: any) {
      console.error('[useVoiceSession] Streaming TTS error:', e)
      error.value = e.message || 'Streaming playback failed'
      streamingModeFlag.value = false
      isTextStreaming.value = false
      return {
        success: false,
        sessionComplete: false,
        conversationId: null
      }
    }
  }

  // Start word tracking during playback
  const startWordTracking = () => {
    stopWordTracking() // Clear any existing interval

    wordTimingInterval = setInterval(() => {
      if (!isAISpeaking.value || !audioElement) {
        stopWordTracking()
        return
      }

      const currentTime = audioElement.currentTime * 1000 // Convert to ms

      // Find the current word based on playback time
      for (let i = wordTimings.length - 1; i >= 0; i--) {
        if (currentTime >= wordTimings[i].startMs) {
          if (currentWordIndex.value !== i) {
            currentWordIndex.value = i
          }
          break
        }
      }
    }, 50) // Update every 50ms for smooth tracking
  }

  const stopWordTracking = () => {
    if (wordTimingInterval) {
      clearInterval(wordTimingInterval)
      wordTimingInterval = null
    }
  }

  // Pause audio playback
  const pauseAudio = async () => {
    if (!isAISpeaking.value) return

    // Pause streaming TTS if active
    if (streamingTTS.isPlaying.value) {
      await streamingTTS.pause()
    }

    // Pause batch mode audio if active
    if (audioElement) {
      audioElement.pause()
    }

    stopWordTracking()
    isAISpeaking.value = false
    isPaused.value = true
  }

  // Resume audio playback
  const resumeAudio = async () => {
    if (!isPaused.value) return

    // Resume streaming TTS if it was being used
    if (streamingModeFlag.value) {
      await streamingTTS.resume()
      isAISpeaking.value = true
      isPaused.value = false
      return
    }

    // Resume batch mode audio
    if (audioElement) {
      try {
        await audioElement.play()
        isAISpeaking.value = true
        isPaused.value = false
        startWordTracking()
      } catch (e) {
        console.error('[useVoiceSession] Resume failed:', e)
        error.value = 'Failed to resume audio'
      }
    }
  }

  // Stop audio completely
  const stopAudio = () => {
    // Stop batch mode audio
    if (audioElement) {
      audioElement.pause()
      audioElement.currentTime = 0
      stopWordTracking()
    }

    // Stop streaming TTS audio (this triggers onAudioComplete via the callback)
    if (streamingTTS.isPlaying.value) {
      streamingTTS.stop(true) // Pass true to trigger onAudioComplete
    } else {
      // If not playing, just reset state
      isAISpeaking.value = false
      streamingModeFlag.value = false
    }

    // Always reset paused state when stopping
    isPaused.value = false
  }

  // Start recording user's voice
  const recordUserResponse = async (): Promise<boolean> => {
    error.value = null

    // Stop any playing audio first
    stopAudio()

    const started = await recorder.start()
    if (started) {
      isRecording.value = true
    } else {
      error.value = recorder.error.value || 'Failed to start recording'
    }
    return started
  }

  // Stop recording and transcribe
  const stopUserRecording = async (): Promise<string | null> => {
    if (!isRecording.value) return null

    isRecording.value = false
    isProcessing.value = true
    isTranscribing.value = true // User's speech is being transcribed
    error.value = null

    try {
      const blob = await recorder.stop()
      if (!blob) {
        error.value = 'No audio recorded'
        isProcessing.value = false
        isTranscribing.value = false
        return null
      }

      // Send to transcription API
      const formData = new FormData()
      formData.append('audio', blob, 'recording.webm')

      const response = await $fetch<TranscribeResponse>('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      })

      isProcessing.value = false
      isTranscribing.value = false

      if (!response.text || response.text.trim() === '') {
        error.value = 'Could not understand audio. Please try again.'
        return null
      }

      return response.text
    } catch (e: any) {
      console.error('[useVoiceSession] Transcription error:', e)
      error.value = e.data?.message || e.message || 'Failed to transcribe audio'
      isProcessing.value = false
      isTranscribing.value = false
      return null
    }
  }

  // Get current word for highlighting
  const getCurrentWord = computed(() => {
    // In streaming mode, use streaming TTS word index
    if (isStreamingMode.value) {
      const idx = streamingTTS.currentWordIndex.value
      const timings = streamingTTS.allWordTimings.value
      if (idx < 0 || idx >= timings.length) return null
      return timings[idx]?.word || null
    }

    // Batch mode
    if (currentWordIndex.value < 0 || currentWordIndex.value >= wordTimings.length) {
      return null
    }
    return wordTimings[currentWordIndex.value]?.word || null
  })

  // Get current word index (unified for both modes)
  const effectiveWordIndex = computed(() => {
    if (isStreamingMode.value) {
      return streamingTTS.currentWordIndex.value
    }
    return currentWordIndex.value
  })

  // Get words array for display
  // In streaming mode, use TTS-derived words for perfect sync with audio highlighting
  const getWords = computed(() => {
    if (isStreamingMode.value && streamingTTS.ttsWords.value.length > 0) {
      return streamingTTS.ttsWords.value
    }
    return currentTranscript.value.split(/\s+/).filter(w => w.length > 0)
  })

  // Get word timings (unified for both modes)
  const effectiveWordTimings = computed(() => {
    if (isStreamingMode.value) {
      return streamingTTS.allWordTimings.value
    }
    return wordTimings
  })

  // Get transcript text for final message content
  // Always use the original LLM transcript for message content because:
  // 1. It's in the correct sentence order (TTS chunks can arrive out of order)
  // 2. It includes all text (TTS might have minor variations)
  const getTranscriptText = computed(() => {
    return currentTranscript.value
  })

  // Get audio level from recorder (for visualizations)
  const getAudioLevel = (): number => {
    return recorder.getAudioLevel()
  }

  // Cleanup
  const cleanup = () => {
    stopAudio()
    recorder.cleanup()
    streamingTTS.reset()
    if (audioElement) {
      URL.revokeObjectURL(audioElement.src)
      audioElement = null
    }
    wordTimings = []
    currentWordIndex.value = -1
    currentTranscript.value = ''
    streamingModeFlag.value = false
  }

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    isAISpeaking: readonly(isAISpeaking),
    isPaused: readonly(isPaused),
    isRecording: readonly(isRecording),
    isProcessing: readonly(isProcessing),
    isTranscribing: readonly(isTranscribing),
    isAudioReady: readonly(isAudioReady),
    currentWordIndex: effectiveWordIndex,
    currentTranscript: readonly(currentTranscript),
    error: readonly(error),
    getCurrentWord,
    getWords,
    getTranscriptText,
    effectiveWordTimings,
    isStreamingMode,
    isTextStreaming: readonly(isTextStreaming),

    // Streaming TTS state passthrough
    isStreamingPlaying: streamingTTS.isPlaying,
    isWaitingForChunks: streamingTTS.isWaitingForChunks,

    // Recorder state passthrough
    permissionState: recorder.permissionState,
    isSupported: recorder.isSupported,

    // Methods
    playAIResponse,
    playStreamingResponse,
    pauseAudio,
    resumeAudio,
    stopAudio,
    recordUserResponse,
    stopUserRecording,
    getAudioLevel,
    checkPermission: recorder.checkPermission,
    requestPermission: recorder.requestPermission,
    preInitAudio: streamingTTS.preInitAudio,
    cleanup
  }
}

// Helper to convert base64 to Blob
function base64ToBlob(base64: string, contentType: string): Blob {
  const byteCharacters = atob(base64)
  const byteArrays: Uint8Array[] = []

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512)
    const byteNumbers = new Array(slice.length)

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }

    byteArrays.push(new Uint8Array(byteNumbers))
  }

  return new Blob(byteArrays, { type: contentType })
}
