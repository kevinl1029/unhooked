/**
 * Save Final Recording Endpoint
 * Saves the user's final recording with preview capability
 * Unlimited re-record attempts allowed
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData) {
    throw createError({ statusCode: 400, message: 'Form data required' })
  }

  // Extract fields from form data
  let audioBlob: Buffer | null = null
  let audioContentType = 'audio/webm'
  let transcript = ''
  let isPreview = false

  for (const field of formData) {
    if (field.name === 'audio' && field.data) {
      audioBlob = field.data
      audioContentType = field.type || 'audio/webm'
    } else if (field.name === 'transcript') {
      transcript = field.data?.toString() || ''
    } else if (field.name === 'is_preview') {
      isPreview = field.data?.toString() === 'true'
    }
  }

  if (!audioBlob) {
    throw createError({ statusCode: 400, message: 'Audio file required' })
  }

  // Validate MIME type - only accept audio/webm and audio/ogg
  const allowedMimeTypes = ['audio/webm', 'audio/ogg']
  const isValidMimeType = allowedMimeTypes.some(type => audioContentType.includes(type))

  if (!isValidMimeType) {
    throw createError({
      statusCode: 400,
      message: `Invalid audio format. Only audio/webm and audio/ogg are supported. Received: ${audioContentType}`
    })
  }

  // Validate file size - max 10MB
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
  if (audioBlob.length > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      message: `File too large. Maximum size is 10MB. Received: ${(audioBlob.length / 1024 / 1024).toFixed(1)}MB`
    })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Check if ceremony already completed (via user_progress table)
  const { data: userProgress } = await supabase
    .from('user_progress')
    .select('ceremony_completed_at')
    .eq('user_id', user.sub)
    .single()

  if (userProgress?.ceremony_completed_at) {
    throw createError({ statusCode: 400, message: 'Ceremony already completed' })
  }

  // Determine file extension from content type
  const extension = audioContentType.includes('webm') ? 'webm'
    : audioContentType.includes('mp4') ? 'm4a'
    : audioContentType.includes('mpeg') ? 'mp3'
    : 'webm'

  // Generate path - use preview path if preview mode
  const timestamp = Date.now()
  const audioPath = isPreview
    ? `${user.sub}/final-recording-preview-${timestamp}.${extension}`
    : `${user.sub}/final-recording.${extension}`

  // Upload audio to storage
  const { error: uploadError } = await supabase.storage
    .from('ceremony-artifacts')
    .upload(audioPath, audioBlob, {
      contentType: audioContentType,
      upsert: true,
    })

  if (uploadError) {
    console.error('[save-final-recording] Upload failed:', uploadError)
    throw createError({ statusCode: 500, message: 'Failed to upload recording' })
  }

  // Get signed URL for playback
  const { data: signedUrl } = await supabase.storage
    .from('ceremony-artifacts')
    .createSignedUrl(audioPath, 3600) // 1 hour expiry

  if (isPreview) {
    // Preview mode - just return the URL for playback, don't save artifact
    return {
      audio_path: audioPath,
      audio_url: signedUrl?.signedUrl || '',
      transcript,
      is_preview: true,
    }
  }

  // Save mode - check for existing artifact first
  const { data: existingArtifact } = await supabase
    .from('ceremony_artifacts')
    .select('id')
    .eq('user_id', user.sub)
    .eq('artifact_type', 'final_recording')
    .single()

  let artifactId: string

  if (existingArtifact) {
    // Update existing artifact (allows re-recording)
    const { error: updateError } = await supabase
      .from('ceremony_artifacts')
      .update({
        audio_path: audioPath,
        content_text: transcript,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingArtifact.id)

    if (updateError) {
      console.error('[save-final-recording] Artifact update failed:', updateError)
      throw createError({ statusCode: 500, message: 'Failed to save recording' })
    }
    artifactId = existingArtifact.id
  } else {
    // Create new artifact
    const { data: artifact, error: artifactError } = await supabase
      .from('ceremony_artifacts')
      .insert({
        user_id: user.sub,
        artifact_type: 'final_recording',
        audio_path: audioPath,
        content_text: transcript,
      })
      .select('id')
      .single()

    if (artifactError) {
      console.error('[save-final-recording] Artifact save failed:', artifactError)
      throw createError({ statusCode: 500, message: 'Failed to save recording' })
    }
    artifactId = artifact.id
  }

  // Clean up any preview files
  const { data: previewFiles } = await supabase.storage
    .from('ceremony-artifacts')
    .list(user.sub, {
      search: 'final-recording-preview',
    })

  if (previewFiles && previewFiles.length > 0) {
    const pathsToDelete = previewFiles.map(f => `${user.sub}/${f.name}`)
    await supabase.storage
      .from('ceremony-artifacts')
      .remove(pathsToDelete)
  }

  return {
    artifact_id: artifactId,
    audio_path: audioPath,
    audio_url: signedUrl?.signedUrl || '',
    transcript,
  }
})
