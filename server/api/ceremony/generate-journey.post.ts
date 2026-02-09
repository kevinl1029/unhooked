/**
 * Journey Generation Endpoint (Retry)
 * Retries journey generation for a user (e.g., from dashboard if generation failed)
 * Uses the reusable generateJourneyArtifact() utility
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { generateJourneyArtifact } from '../../utils/ceremony/generate-journey'

interface PlaylistSegment {
  id: string
  type: 'narration' | 'user_moment'
  text: string
  transcript: string
  duration_ms?: number
  moment_id?: string
  audio_generated: boolean
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // Trigger generation using reusable utility
  const artifactId = await generateJourneyArtifact(user.sub, supabase)

  if (!artifactId) {
    throw createError({ statusCode: 500, message: 'Failed to generate journey' })
  }

  // Fetch the generated artifact
  const { data: artifact } = await supabase
    .from('ceremony_artifacts')
    .select('id, content_text, content_json, generation_status')
    .eq('id', artifactId)
    .single()

  if (!artifact) {
    throw createError({ statusCode: 500, message: 'Failed to retrieve journey' })
  }

  const segments = (artifact.content_json as { segments: PlaylistSegment[] })?.segments || []

  return {
    journey_text: artifact.content_text,
    playlist: {
      segments,
    },
    artifact_id: artifact.id,
    selected_moment_count: segments.filter(s => s.type === 'user_moment').length,
    status: artifact.generation_status,
  }
})
