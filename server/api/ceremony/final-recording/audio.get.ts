/**
 * Final Recording Audio Endpoint
 * Returns a signed URL for the user's final recording audio
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Get final recording artifact
  const { data: artifact, error: fetchError } = await supabase
    .from('ceremony_artifacts')
    .select('id, audio_path, audio_duration_ms')
    .eq('user_id', user.sub)
    .eq('artifact_type', 'final_recording')
    .single()

  if (fetchError || !artifact) {
    throw createError({
      statusCode: 404,
      message: 'Final recording not found',
    })
  }

  if (!artifact.audio_path) {
    throw createError({
      statusCode: 404,
      message: 'Audio file not found',
    })
  }

  // Generate signed URL (1 hour expiry)
  const { data: signedUrlData, error: signError } = await supabase.storage
    .from('ceremony-artifacts')
    .createSignedUrl(artifact.audio_path, 3600)

  if (signError || !signedUrlData) {
    console.error('Failed to create signed URL:', signError)
    throw createError({
      statusCode: 500,
      message: 'Failed to generate audio URL',
    })
  }

  return {
    audio_url: signedUrlData.signedUrl,
    duration_ms: artifact.audio_duration_ms,
  }
})
