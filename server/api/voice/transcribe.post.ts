import { serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  // Verify authentication
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const config = useRuntimeConfig()
  if (!config.openaiApiKey) {
    throw createError({ statusCode: 500, message: 'OpenAI API key not configured' })
  }

  // Parse multipart form data
  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'No form data provided' })
  }

  // Find the audio file in the form data
  const audioField = formData.find(field => field.name === 'audio')
  if (!audioField || !audioField.data) {
    throw createError({ statusCode: 400, message: 'No audio file provided' })
  }

  // Validate file size (max 25MB for Whisper API)
  const maxSize = 25 * 1024 * 1024
  if (audioField.data.length > maxSize) {
    throw createError({ statusCode: 400, message: 'Audio file too large (max 25MB)' })
  }

  // Determine content type and filename
  const contentType = audioField.type || 'audio/webm'
  const extension = getExtensionFromMimeType(contentType)
  const filename = audioField.filename || `audio.${extension}`

  try {
    // Create a File object for the OpenAI API
    const audioFile = new File([audioField.data], filename, { type: contentType })

    // Call OpenAI Whisper API
    const formDataToSend = new FormData()
    formDataToSend.append('file', audioFile)
    formDataToSend.append('model', 'whisper-1')
    formDataToSend.append('response_format', 'verbose_json')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.openaiApiKey}`
      },
      body: formDataToSend
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Whisper API error:', response.status, errorData)
      throw createError({
        statusCode: response.status,
        message: errorData.error?.message || 'Transcription failed'
      })
    }

    const result = await response.json()

    return {
      text: result.text || '',
      duration: result.duration || null,
      language: result.language || null,
      // Include word-level timestamps if available
      words: result.words || null
    }
  } catch (error: any) {
    // Re-throw if it's already a Nuxt error
    if (error.statusCode) {
      throw error
    }
    console.error('Transcription error:', error)
    throw createError({
      statusCode: 500,
      message: error.message || 'Failed to transcribe audio'
    })
  }
})

function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/flac': 'flac'
  }
  return mimeMap[mimeType] || 'webm'
}
