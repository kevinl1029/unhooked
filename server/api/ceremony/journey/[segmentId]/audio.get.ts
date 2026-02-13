/**
 * Journey Segment Audio Endpoint
 * Gets audio for a journey segment, generating TTS on first request if not cached
 * Includes retry logic and text fallback
 */

import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { getTTSProviderFromConfig } from '../../../../utils/tts'

const MAX_RETRIES = 1

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const segmentId = getRouterParam(event, 'segmentId')
  if (!segmentId) {
    throw createError({ statusCode: 400, message: 'Segment ID required' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const config = useRuntimeConfig()

  // 1. Get the journey artifact
  const { data: artifact } = await supabase
    .from('ceremony_artifacts')
    .select('id, content_json, user_id')
    .eq('user_id', user.sub)
    .eq('artifact_type', 'reflective_journey')
    .single()

  if (!artifact) {
    throw createError({ statusCode: 404, message: 'Journey not found' })
  }

  // 2. Find the segment in the playlist (stored in content_json per spec)
  const contentJson = artifact.content_json as {
    segments: Array<{
      id: string
      type: string
      text: string
      moment_id?: string
      audio_path?: string
      duration_ms?: number
      word_timings?: Array<{ word: string; start: number; end: number }>
    }>
  }
  const segments = contentJson?.segments || []

  const segmentIndex = segments.findIndex(s => s.id === segmentId)
  if (segmentIndex === -1) {
    throw createError({ statusCode: 404, message: 'Segment not found' })
  }

  const segment = segments[segmentIndex]

  // 3. If it's a user_moment, get the user's recorded audio
  if (segment.type === 'user_moment' && segment.moment_id) {
    const { data: moment } = await supabase
      .from('captured_moments')
      .select('audio_clip_path, audio_duration_ms, transcript')
      .eq('id', segment.moment_id)
      .eq('user_id', user.sub)
      .single()

    if (moment?.audio_clip_path) {
      // Generate signed URL
      const { data: signedUrl } = await supabase.storage
        .from('voice-clips')
        .createSignedUrl(moment.audio_clip_path, 3600) // 1 hour expiry

      if (signedUrl) {
        return {
          audio_url: signedUrl.signedUrl,
          duration_ms: moment.audio_duration_ms || 0,
          word_timings: [], // User recordings don't have word timings
          is_user_moment: true,
        }
      }
    }

    // No audio for this moment - return text fallback
    return {
      audio_unavailable: true,
      text: moment?.transcript || segment.text,
      is_user_moment: true,
    }
  }

  // 4. For narration segments, check if audio already generated
  if (segment.audio_path) {
    // Audio already exists, return signed URL
    const { data: signedUrl } = await supabase.storage
      .from('ceremony-artifacts')
      .createSignedUrl(segment.audio_path, 3600)

    if (signedUrl) {
      return {
        audio_url: signedUrl.signedUrl,
        duration_ms: segment.duration_ms || 0,
        word_timings: segment.word_timings || [],
      }
    }
  }

  // 5. Generate TTS for narration segment (lazy generation)
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const ttsProvider = getTTSProviderFromConfig()
      const result = await ttsProvider.synthesize({
        text: segment.text,
      })

      // Store the audio in Supabase storage
      const audioPath = `${user.sub}/journey/${segmentId}.mp3`
      const { error: uploadError } = await supabase.storage
        .from('ceremony-artifacts')
        .upload(audioPath, result.audioBuffer, {
          contentType: result.contentType,
          upsert: true,
        })

      if (uploadError) {
        console.error('[journey-audio] Upload failed:', uploadError)
        throw new Error('Failed to upload audio')
      }

      // Update the segment with audio info
      segments[segmentIndex] = {
        ...segment,
        audio_path: audioPath,
        duration_ms: result.estimatedDurationMs,
        word_timings: result.wordTimings,
      }

      // Save updated content_json to artifact
      await supabase
        .from('ceremony_artifacts')
        .update({
          content_json: { segments },
          updated_at: new Date().toISOString(),
        })
        .eq('id', artifact.id)

      // Get signed URL for the uploaded audio
      const { data: signedUrl } = await supabase.storage
        .from('ceremony-artifacts')
        .createSignedUrl(audioPath, 3600)

      return {
        audio_url: signedUrl?.signedUrl || '',
        duration_ms: result.estimatedDurationMs || 0,
        word_timings: result.wordTimings || [],
      }
    } catch (error) {
      lastError = error as Error
      console.error(`[journey-audio] TTS attempt ${attempt + 1} failed:`, error)
    }
  }

  // All retries failed - return text fallback
  console.error('[journey-audio] All TTS attempts failed, returning text fallback')
  return {
    audio_unavailable: true,
    text: segment.text,
    error: lastError?.message,
  }
})
