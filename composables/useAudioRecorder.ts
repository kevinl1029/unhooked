export const useAudioRecorder = () => {
  const isRecording = ref(false)
  const isPaused = ref(false)
  const error = ref<string | null>(null)
  const permissionState = ref<PermissionState | null>(null)
  const isSupported = ref(false)

  // Internal refs
  let mediaRecorder: MediaRecorder | null = null
  let audioChunks: Blob[] = []
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let dataArray: Uint8Array | null = null
  let mediaStream: MediaStream | null = null

  // Check browser support on client-side only
  if (import.meta.client) {
    isSupported.value = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder)
  }

  // Get preferred MIME type for recording
  const getMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg'
    ]
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type
      }
    }
    return 'audio/webm' // fallback
  }

  // Check microphone permission status
  const checkPermission = async (): Promise<PermissionState> => {
    if (import.meta.server) return 'prompt'

    try {
      // Try the Permissions API first (not supported on all browsers)
      if (navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
        permissionState.value = result.state
        return result.state
      }
    } catch {
      // Permissions API not supported, return 'prompt' as default
    }

    permissionState.value = 'prompt'
    return 'prompt'
  }

  // Request microphone permission
  const requestPermission = async (): Promise<boolean> => {
    if (import.meta.server) return false

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      // Stop the stream immediately - we just needed to trigger the permission
      stream.getTracks().forEach(track => track.stop())
      permissionState.value = 'granted'
      return true
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        permissionState.value = 'denied'
        error.value = 'Microphone permission denied'
      } else if (err.name === 'NotFoundError') {
        error.value = 'No microphone found'
      } else {
        error.value = 'Failed to access microphone'
      }
      return false
    }
  }

  // Start recording
  const start = async (): Promise<boolean> => {
    if (import.meta.server) return false

    // Re-check support in case it wasn't set yet
    if (!isSupported.value) {
      isSupported.value = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder)
    }

    if (!isSupported.value) {
      error.value = 'Audio recording not supported in this browser'
      console.error('[useAudioRecorder] Browser does not support audio recording')
      return false
    }

    if (isRecording.value) {
      return true // Already recording
    }

    error.value = null
    audioChunks = []

    try {
      console.log('[useAudioRecorder] Requesting microphone access...')
      // Get audio stream
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      console.log('[useAudioRecorder] Microphone access granted')

      permissionState.value = 'granted'

      // Set up audio context and analyser for visualizations
      audioContext = new AudioContext()
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.8

      const source = audioContext.createMediaStreamSource(mediaStream)
      source.connect(analyser)

      dataArray = new Uint8Array(analyser.frequencyBinCount)

      // Create MediaRecorder
      const mimeType = getMimeType()
      mediaRecorder = new MediaRecorder(mediaStream, { mimeType })

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data)
        }
      }

      mediaRecorder.onerror = (event: Event) => {
        const mediaError = event as MediaRecorderErrorEvent
        error.value = mediaError.error?.message || 'Recording error'
        cleanup()
      }

      // Start recording with timeslice for periodic data chunks
      mediaRecorder.start(1000) // Get data every 1 second
      isRecording.value = true
      isPaused.value = false
      console.log('[useAudioRecorder] Recording started')

      return true
    } catch (err: any) {
      console.error('[useAudioRecorder] Error starting recording:', err)
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        permissionState.value = 'denied'
        error.value = 'Microphone permission denied'
      } else if (err.name === 'NotFoundError') {
        error.value = 'No microphone found'
      } else {
        error.value = err.message || 'Failed to start recording'
      }
      cleanup()
      return false
    }
  }

  // Stop recording and return audio blob
  const stop = async (): Promise<Blob | null> => {
    if (!mediaRecorder || !isRecording.value) {
      return null
    }

    return new Promise((resolve) => {
      mediaRecorder!.onstop = () => {
        const mimeType = mediaRecorder!.mimeType || 'audio/webm'
        const blob = new Blob(audioChunks, { type: mimeType })
        cleanup()
        resolve(blob)
      }

      mediaRecorder!.stop()
      isRecording.value = false
      isPaused.value = false
    })
  }

  // Pause recording
  const pause = () => {
    if (mediaRecorder && isRecording.value && mediaRecorder.state === 'recording') {
      mediaRecorder.pause()
      isPaused.value = true
    }
  }

  // Resume recording
  const resume = () => {
    if (mediaRecorder && isRecording.value && mediaRecorder.state === 'paused') {
      mediaRecorder.resume()
      isPaused.value = false
    }
  }

  // Get current audio level (0-1 range) for visualizations
  const getAudioLevel = (): number => {
    if (!analyser || !dataArray) return 0

    analyser.getByteFrequencyData(dataArray)

    // Calculate average amplitude
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i]
    }
    const average = sum / dataArray.length

    // Normalize to 0-1 range (255 is max for Uint8Array)
    return Math.min(average / 128, 1)
  }

  // Get frequency data for waveform visualization
  const getFrequencyData = (): Uint8Array | null => {
    if (!analyser || !dataArray) return null
    analyser.getByteFrequencyData(dataArray)
    return dataArray
  }

  // Cleanup resources
  const cleanup = () => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop())
      mediaStream = null
    }

    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close()
      audioContext = null
    }

    analyser = null
    dataArray = null
    mediaRecorder = null
    audioChunks = []
    isRecording.value = false
    isPaused.value = false
  }

  // Cleanup on unmount
  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    isRecording: readonly(isRecording),
    isPaused: readonly(isPaused),
    error: readonly(error),
    permissionState: readonly(permissionState),
    isSupported: readonly(isSupported),

    // Methods
    checkPermission,
    requestPermission,
    start,
    stop,
    pause,
    resume,
    getAudioLevel,
    getFrequencyData,
    cleanup
  }
}
