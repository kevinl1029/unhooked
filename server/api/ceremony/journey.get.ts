/**
 * Journey Endpoint
 * Returns the user's reflective journey playlist for playback
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Get journey artifact
  const { data: artifact, error: fetchError } = await supabase
    .from('ceremony_artifacts')
    .select('id, playlist, content_text, audio_duration_ms, created_at')
    .eq('user_id', user.sub)
    .eq('artifact_type', 'reflective_journey')
    .single()

  if (fetchError || !artifact) {
    throw createError({
      statusCode: 404,
      message: 'Journey not found. Complete your ceremony to generate your journey.',
    })
  }

  // Parse playlist - stored directly in playlist column
  const playlistData = artifact.playlist as Array<{
    id: string
    type: 'narration' | 'user_moment'
    text: string
    transcript: string
    duration_ms?: number
    moment_id?: string
  }> | null

  if (!playlistData || playlistData.length === 0) {
    throw createError({
      statusCode: 404,
      message: 'Journey playlist not found',
    })
  }

  return {
    artifact_id: artifact.id,
    playlist: {
      segments: playlistData,
    },
    journey_text: artifact.content_text || '',
    total_duration_ms: artifact.audio_duration_ms,
    generated_at: artifact.created_at,
  }
})
