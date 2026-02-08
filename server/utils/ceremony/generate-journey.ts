/**
 * Reusable journey artifact generation utility
 * Can be called from both the ceremony/generate-journey endpoint (retry)
 * and from /api/chat when [JOURNEY_GENERATE] token is detected
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'
import { generateCeremonyNarrative } from '../llm/tasks/ceremony-narrative'
import { selectCeremonyMoments } from '../llm/tasks/ceremony-select'
import type { CapturedMoment } from '../llm/task-types'

interface PlaylistSegment {
  id: string
  type: 'narration' | 'user_moment'
  text: string
  transcript: string
  duration_ms?: number
  moment_id?: string
  audio_generated: boolean
}

type SupabaseServiceRole = SupabaseClient<Database>

/**
 * Generate journey artifact for a user
 * Creates ceremony_artifacts row with generation_status='ready'
 * Returns artifact ID on success, null on failure
 */
export async function generateJourneyArtifact(
  userId: string,
  supabase: SupabaseServiceRole
): Promise<string | null> {
  try {
    console.log(`[generate-journey] Starting journey generation for user ${userId}`)

    // Check if artifact already exists
    const { data: existingArtifact } = await supabase
      .from('ceremony_artifacts')
      .select('id, generation_status')
      .eq('user_id', userId)
      .eq('artifact_type', 'reflective_journey')
      .single()

    if (existingArtifact) {
      if (existingArtifact.generation_status === 'ready') {
        console.log(`[generate-journey] Journey already exists for user ${userId}`)
        return existingArtifact.id
      } else if (existingArtifact.generation_status === 'generating') {
        console.log(`[generate-journey] Journey already generating for user ${userId}`)
        return existingArtifact.id
      }
      // If status is 'failed' or 'pending', we'll update it below
    }

    // Create or update artifact row with 'generating' status
    const artifactId = existingArtifact?.id || crypto.randomUUID()

    if (existingArtifact) {
      await supabase
        .from('ceremony_artifacts')
        .update({ generation_status: 'generating' })
        .eq('id', artifactId)
    } else {
      await supabase
        .from('ceremony_artifacts')
        .insert({
          id: artifactId,
          user_id: userId,
          artifact_type: 'reflective_journey',
          generation_status: 'generating',
          content_text: '',
          content_json: {},
        })
    }

    // Fetch user story for origin context
    const { data: userStory } = await supabase
      .from('user_story')
      .select('origin_summary')
      .eq('user_id', userId)
      .single()

    // Fetch all captured moments
    const { data: allMomentsRaw } = await supabase
      .from('captured_moments')
      .select('*')
      .eq('user_id', userId)
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
      illusionKey: m.illusion_key,
      sessionType: m.session_type,
      illusionLayer: m.illusion_layer,
      confidenceScore: m.confidence_score,
      emotionalValence: m.emotional_valence,
      isUserHighlighted: m.is_user_highlighted,
      timesPlayedBack: m.times_played_back,
      lastUsedAt: m.last_used_at,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    }))

    if (allMoments.length < 3) {
      console.log(`[generate-journey] Not enough moments (${allMoments.length}) for user ${userId}`)
      await supabase
        .from('ceremony_artifacts')
        .update({ generation_status: 'failed' })
        .eq('id', artifactId)
      return null
    }

    // Use AI to select moments
    const selection = await selectCeremonyMoments({
      allMoments,
      maxMoments: 12,
    })
    const selectedIdSet = new Set(selection.selectedIds)
    const selectedMoments = allMoments.filter(m => selectedIdSet.has(m.id))

    // Generate narrative
    const narrative = await generateCeremonyNarrative({
      selectedMoments,
      originSummary: userStory?.origin_summary || undefined,
    })

    if (!narrative.narrative || narrative.segments.length === 0) {
      console.error(`[generate-journey] Failed to generate narrative for user ${userId}`)
      await supabase
        .from('ceremony_artifacts')
        .update({ generation_status: 'failed' })
        .eq('id', artifactId)
      return null
    }

    // Convert to playlist format
    const playlistSegments: PlaylistSegment[] = narrative.segments.map(seg => ({
      id: seg.id,
      type: seg.type,
      text: seg.text,
      transcript: seg.text,
      moment_id: seg.momentId,
      audio_generated: false,
    }))

    // Update artifact with content and mark as ready
    await supabase
      .from('ceremony_artifacts')
      .update({
        content_text: narrative.narrative,
        content_json: { segments: playlistSegments },
        included_moment_ids: selectedMoments.map(m => m.id),
        generation_status: 'ready',
      })
      .eq('id', artifactId)

    console.log(`[generate-journey] Successfully generated journey for user ${userId}`)
    return artifactId
  } catch (error) {
    console.error(`[generate-journey] Error generating journey for user ${userId}:`, error)

    // Try to mark as failed if we have an artifact ID
    try {
      const { data: artifact } = await supabase
        .from('ceremony_artifacts')
        .select('id')
        .eq('user_id', userId)
        .eq('artifact_type', 'reflective_journey')
        .single()

      if (artifact) {
        await supabase
          .from('ceremony_artifacts')
          .update({ generation_status: 'failed' })
          .eq('id', artifact.id)
      }
    } catch (updateError) {
      console.error(`[generate-journey] Failed to update status to failed:`, updateError)
    }

    return null
  }
}
