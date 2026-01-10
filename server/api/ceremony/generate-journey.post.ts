/**
 * Journey Generation Endpoint
 * Generates the reflective journey narrative as a playlist for client-side playback
 * TTS generation is lazy - segments are generated on first play
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { generateCeremonyNarrative, selectCeremonyMoments } from '../../utils/llm'
import type { CapturedMoment } from '../../utils/llm/task-types'

interface PlaylistSegment {
  id: string
  type: 'narration' | 'user_moment'
  text: string
  transcript: string
  duration_ms?: number // Set after TTS generation
  moment_id?: string
  audio_generated: boolean
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody(event)
  const { selected_moment_ids } = body as {
    selected_moment_ids?: string[]
  }

  const supabase = serverSupabaseServiceRole(event)

  // 1. Fetch user story
  const { data: userStory } = await supabase
    .from('user_story')
    .select('origin_summary, ceremony_completed_at, already_quit')
    .eq('user_id', user.sub)
    .single()

  if (userStory?.ceremony_completed_at) {
    throw createError({ statusCode: 400, message: 'Ceremony already completed' })
  }

  // 2. Fetch all moments
  const { data: allMomentsRaw } = await supabase
    .from('captured_moments')
    .select('*')
    .eq('user_id', user.sub)
    .order('created_at', { ascending: true })

  const allMoments: CapturedMoment[] = (allMomentsRaw || []).map(m => ({
    id: m.id,
    userId: m.user_id,
    conversationId: m.conversation_id,
    messageId: m.message_id,
    momentType: m.moment_type,
    transcript: m.transcript,
    audioClipPath: m.audio_clip_path,
    audioDurationMs: m.audio_duration_ms,
    mythKey: m.myth_key,
    sessionType: m.session_type,
    mythLayer: m.myth_layer,
    confidenceScore: m.confidence_score,
    emotionalValence: m.emotional_valence,
    isUserHighlighted: m.is_user_highlighted,
    timesPlayedBack: m.times_played_back,
    lastUsedAt: m.last_used_at,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  }))

  if (allMoments.length < 3) {
    throw createError({ statusCode: 400, message: 'Not enough moments for ceremony' })
  }

  // 3. Select moments (use provided IDs or AI selection)
  let selectedMoments: CapturedMoment[]

  if (selected_moment_ids && selected_moment_ids.length > 0) {
    // Use provided selection
    const selectedIdSet = new Set(selected_moment_ids)
    selectedMoments = allMoments.filter(m => selectedIdSet.has(m.id))
  } else {
    // Use AI selection
    const selection = await selectCeremonyMoments({
      allMoments,
      maxMoments: 12,
    })
    const selectedIdSet = new Set(selection.selectedIds)
    selectedMoments = allMoments.filter(m => selectedIdSet.has(m.id))
  }

  // 4. Generate narrative
  const narrative = await generateCeremonyNarrative({
    selectedMoments,
    alreadyQuit: userStory?.already_quit || false,
    originSummary: userStory?.origin_summary || undefined,
  })

  if (!narrative.narrative || narrative.segments.length === 0) {
    throw createError({ statusCode: 500, message: 'Failed to generate narrative' })
  }

  // 5. Convert to playlist format
  const playlistSegments: PlaylistSegment[] = narrative.segments.map(seg => ({
    id: seg.id,
    type: seg.type,
    text: seg.text,
    transcript: seg.text,
    moment_id: seg.momentId,
    audio_generated: false,
  }))

  // 6. Create or update artifact
  const { data: artifact, error: artifactError } = await supabase
    .from('ceremony_artifacts')
    .upsert({
      user_id: user.sub,
      artifact_type: 'reflective_journey',
      content_text: narrative.narrative,
      playlist: playlistSegments,
      included_moment_ids: selectedMoments.map(m => m.id),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,artifact_type',
    })
    .select('id')
    .single()

  if (artifactError) {
    console.error('[generate-journey] Failed to save artifact:', artifactError)
    throw createError({ statusCode: 500, message: 'Failed to save journey' })
  }

  return {
    journey_text: narrative.narrative,
    playlist: {
      segments: playlistSegments,
    },
    artifact_id: artifact.id,
    selected_moment_count: selectedMoments.length,
  }
})
