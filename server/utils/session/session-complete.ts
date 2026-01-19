/**
 * Session Complete Handler
 * Orchestrates all post-session tasks when [SESSION_COMPLETE] is detected
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Message } from '../llm/types'
import type { IllusionKey, IllusionLayer, CapturedMoment, UserIntakeData } from '../llm/task-types'
import { assessConviction } from '../llm/tasks/conviction-assessment'
import { selectKeyInsight } from '../llm/tasks/key-insight-selection'
import { summarizeOriginStory, shouldGenerateSummary } from '../llm/tasks/story-summarization'
import { scheduleCheckIns } from '../scheduling/check-in-scheduler'

interface SessionCompleteInput {
  userId: string
  conversationId: string
  illusionKey: IllusionKey
  illusionLayer: IllusionLayer
  messages: Message[]
  supabase: SupabaseClient
}

interface SessionCompleteResult {
  convictionAssessment: {
    newConviction: number
    delta: number
    remainingResistance: string | null
    newTriggers: string[]
    newStakes: string[]
  } | null
  keyInsightId: string | null
  error?: string
}

/**
 * Handle all post-session tasks after [SESSION_COMPLETE] is detected
 *
 * 1. Fetch user story and captured moments for context
 * 2. Run conviction assessment
 * 3. Store assessment in conviction_assessments table
 * 4. Update user_story snapshot
 * 5. Select key insight if multiple candidates
 * 6. Update key insight in user_story
 */
export async function handleSessionComplete(input: SessionCompleteInput): Promise<SessionCompleteResult> {
  const { userId, conversationId, illusionKey, illusionLayer, messages, supabase } = input

  try {
    // 1. Fetch user story for context
    let { data: userStory } = await supabase
      .from('user_story')
      .select('*')
      .eq('user_id', userId)
      .single()

    // Create user_story if it doesn't exist (defensive fallback)
    // This handles edge cases where intake didn't create the row
    if (!userStory) {
      console.log(`[session-complete] Creating missing user_story for user ${userId}`)
      const { data: newUserStory, error: createError } = await supabase
        .from('user_story')
        .insert({
          user_id: userId,
          primary_triggers: [],
          personal_stakes: [],
        })
        .select()
        .single()

      if (createError) {
        console.error('[session-complete] Failed to create user_story:', createError)
        throw new Error('Failed to create user_story - cannot proceed with session completion')
      }

      userStory = newUserStory
    }

    // Get previous conviction for this illusion
    const previousConviction = userStory?.[`${illusionKey}_conviction`] ?? 0

    // Get existing triggers and stakes
    const existingTriggers = userStory?.primary_triggers || []
    const existingStakes = userStory?.personal_stakes || []

    // 2. Fetch previous insights for this illusion
    const { data: previousInsightMoments } = await supabase
      .from('captured_moments')
      .select('transcript')
      .eq('user_id', userId)
      .eq('illusion_key', illusionKey)
      .eq('moment_type', 'insight')
      .order('created_at', { ascending: false })
      .limit(5)

    const previousInsights = previousInsightMoments?.map(m => m.transcript) || []

    // 3. Run conviction assessment
    console.log(`[session-complete] Running conviction assessment for ${illusionKey}`)
    const assessment = await assessConviction({
      conversationTranscript: messages,
      illusionKey,
      previousConviction,
      previousInsights,
      existingTriggers,
      existingStakes,
    })

    // 4. Store assessment in conviction_assessments table
    const { error: assessmentError } = await supabase
      .from('conviction_assessments')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        illusion_key: illusionKey,
        illusion_layer: illusionLayer,
        conviction_score: assessment.newConviction,
        delta: assessment.delta,
        recommended_next_step: assessment.recommendedNextStep,
        reasoning: assessment.reasoning,
        new_triggers: assessment.newTriggers,
        new_stakes: assessment.newStakes,
      })

    if (assessmentError) {
      console.error('[session-complete] Failed to store assessment:', assessmentError)
    }

    // 5. Update user_story with new conviction and merge triggers/stakes
    const storyUpdateData: Record<string, unknown> = {
      [`${illusionKey}_conviction`]: assessment.newConviction,
      updated_at: new Date().toISOString(),
    }

    // Store resistance notes if present
    if (assessment.remainingResistance) {
      storyUpdateData[`${illusionKey}_resistance_notes`] = assessment.remainingResistance
    }

    // Merge new triggers (deduplicate)
    if (assessment.newTriggers.length > 0) {
      const mergedTriggers = [...new Set([...existingTriggers, ...assessment.newTriggers])]
      storyUpdateData.primary_triggers = mergedTriggers
    }

    // Merge new stakes (deduplicate)
    if (assessment.newStakes.length > 0) {
      const mergedStakes = [...new Set([...existingStakes, ...assessment.newStakes])]
      storyUpdateData.personal_stakes = mergedStakes
    }

    await supabase
      .from('user_story')
      .update(storyUpdateData)
      .eq('user_id', userId)

    // 6. Select key insight if multiple candidates exist for this illusion
    const { data: insightCandidates } = await supabase
      .from('captured_moments')
      .select('*')
      .eq('user_id', userId)
      .eq('illusion_key', illusionKey)
      .eq('moment_type', 'insight')
      .order('confidence_score', { ascending: false })

    let keyInsightId: string | null = null

    if (insightCandidates && insightCandidates.length > 0) {
      // Convert to CapturedMoment type
      const moments: CapturedMoment[] = insightCandidates.map(m => ({
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

      console.log(`[session-complete] Selecting key insight from ${moments.length} candidates`)

      const selection = await selectKeyInsight({
        insights: moments,
        illusionKey,
        sessionContext: `Session completed for ${illusionKey} at ${illusionLayer} layer`,
      })

      if (selection.selectedMomentId) {
        keyInsightId = selection.selectedMomentId

        // Update user_story with key insight
        await supabase
          .from('user_story')
          .update({
            [`${illusionKey}_key_insight_id`]: keyInsightId,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
      }
    }

    // 7. Generate origin story summary if we have 2+ origin fragments and no summary yet
    const existingSummary = userStory?.origin_summary as string | null
    const { data: originFragments } = await supabase
      .from('captured_moments')
      .select('*')
      .eq('user_id', userId)
      .eq('moment_type', 'origin_story')
      .order('created_at', { ascending: true })

    if (shouldGenerateSummary(originFragments?.length || 0, existingSummary)) {
      console.log(`[session-complete] Generating origin story summary from ${originFragments?.length} fragments`)

      // Get user intake for context
      const { data: intake } = await supabase
        .from('user_intake')
        .select('product_types, usage_frequency, years_using, previous_attempts, primary_reason, triggers, longest_quit_duration')
        .eq('user_id', userId)
        .single()

      if (intake && originFragments) {
        const intakeData: UserIntakeData = {
          productTypes: intake.product_types || [],
          usageFrequency: intake.usage_frequency || 'unknown',
          yearsUsing: intake.years_using,
          previousAttempts: intake.previous_attempts || 0,
          primaryReason: intake.primary_reason || 'unknown',
          triggers: intake.triggers,
          longestQuitDuration: intake.longest_quit_duration,
        }

        // Convert origin fragments to CapturedMoment type
        const originMoments: CapturedMoment[] = originFragments.map(m => ({
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

        const summary = await summarizeOriginStory({
          originFragments: originMoments,
          intakeData,
        })

        if (summary.summary) {
          // Store summary and origin moment IDs in user_story
          await supabase
            .from('user_story')
            .update({
              origin_summary: summary.summary,
              origin_moment_ids: originFragments.map(m => m.id),
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)

          console.log(`[session-complete] Stored origin summary: "${summary.summary.slice(0, 50)}..."`)
        }
      }
    }

    // 8. Schedule check-ins
    // Fetch user's timezone from user_progress
    const { data: userProgress } = await supabase
      .from('user_progress')
      .select('timezone')
      .eq('user_id', userId)
      .single()

    const userTimezone = userProgress?.timezone || 'America/New_York'

    // Expire any pending post-session check-ins from previous sessions
    // User should only get check-ins about their most recent core session
    try {
      const { error: expireError } = await supabase
        .from('check_in_schedule')
        .update({
          status: 'expired',
          expired_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('check_in_type', 'post_session')
        .in('status', ['scheduled', 'sent', 'opened'])

      if (expireError) {
        console.error('[session-complete] Failed to expire old check-ins:', expireError)
      } else {
        console.log('[session-complete] Expired any pending post-session check-ins from previous sessions')
      }
    } catch (expireErr) {
      console.error('[session-complete] Error expiring old check-ins:', expireErr)
    }

    try {
      const scheduledCheckIns = await scheduleCheckIns({
        userId,
        timezone: userTimezone,
        trigger: 'session_complete',
        sessionId: conversationId,
        illusionKey,
        sessionEndTime: new Date(),
        supabase,
      })

      if (scheduledCheckIns.length > 0) {
        console.log(`[session-complete] Scheduled ${scheduledCheckIns.length} check-in(s)`)
      }
    } catch (checkInError) {
      // Don't fail the whole handler if check-in scheduling fails
      console.error('[session-complete] Failed to schedule check-ins:', checkInError)
    }

    console.log(`[session-complete] Completed for ${illusionKey}: conviction ${previousConviction} -> ${assessment.newConviction} (delta: ${assessment.delta})`)

    return {
      convictionAssessment: {
        newConviction: assessment.newConviction,
        delta: assessment.delta,
        remainingResistance: assessment.remainingResistance,
        newTriggers: assessment.newTriggers,
        newStakes: assessment.newStakes,
      },
      keyInsightId,
    }
  } catch (error) {
    console.error('[session-complete] Handler failed:', error)
    return {
      convictionAssessment: null,
      keyInsightId: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
