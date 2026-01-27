/**
 * POST /api/reinforcement/assess
 * Run conviction assessment after a reinforcement session
 *
 * Assesses the user's current conviction level and tracks changes over time.
 * Similar to core session assessment but adds shift_quality classification.
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'
import { assessConviction } from '~/server/utils/llm/tasks/conviction-assessment'
import type { Message } from '~/server/utils/llm/types'

const VALID_ILLUSION_KEYS = ['stress_relief', 'pleasure', 'willpower', 'focus', 'identity']

const ILLUSION_CONVICTION_FIELDS: Record<string, string> = {
  stress_relief: 'stress_relief_conviction',
  pleasure: 'pleasure_conviction',
  willpower: 'willpower_conviction',
  focus: 'focus_conviction',
  identity: 'identity_conviction',
}

const ILLUSION_RESISTANCE_FIELDS: Record<string, string> = {
  stress_relief: 'stress_relief_resistance_notes',
  pleasure: 'pleasure_resistance_notes',
  willpower: 'willpower_resistance_notes',
  focus: 'focus_resistance_notes',
  identity: 'identity_resistance_notes',
}

const ILLUSION_KEY_INSIGHT_FIELDS: Record<string, string> = {
  stress_relief: 'stress_relief_key_insight_id',
  pleasure: 'pleasure_key_insight_id',
  willpower: 'willpower_key_insight_id',
  focus: 'focus_key_insight_id',
  identity: 'identity_key_insight_id',
}

interface AssessReinforcementRequest {
  conversation_id: string
  illusion_key: string
}

type ShiftQuality = 'restored' | 'deepened' | 'still_struggling' | 'new_insight'

interface ReinforcementAssessmentResponse {
  current_conviction: number
  delta_from_previous: number
  shift_quality: ShiftQuality
}

/**
 * Determine shift quality based on conviction delta and assessment
 */
function determineShiftQuality(
  delta: number,
  currentConviction: number,
  previousConviction: number,
  hasNewInsights: boolean
): ShiftQuality {
  // New insight emerged during session
  if (hasNewInsights) {
    return 'new_insight'
  }

  // Conviction increased - deepened understanding
  if (delta > 0) {
    return 'deepened'
  }

  // Conviction restored (maintained high level) or regained after drop
  if (currentConviction >= 7 && delta >= -1) {
    return 'restored'
  }

  // Still struggling - conviction dropped or remains low
  return 'still_struggling'
}

export default defineEventHandler(async (event): Promise<ReinforcementAssessmentResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<AssessReinforcementRequest>(event)
  const { conversation_id, illusion_key } = body

  if (!conversation_id || !illusion_key) {
    throw createError({ statusCode: 400, message: 'Missing required fields: conversation_id, illusion_key' })
  }

  if (!VALID_ILLUSION_KEYS.includes(illusion_key)) {
    throw createError({ statusCode: 400, message: 'Invalid illusion_key' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // 1. Verify conversation exists and belongs to user
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('id, user_id, illusion_key, session_type')
    .eq('id', conversation_id)
    .single()

  if (convError || !conversation) {
    throw createError({ statusCode: 404, message: 'Conversation not found' })
  }

  if (conversation.user_id !== user.sub) {
    throw createError({ statusCode: 404, message: 'Conversation not found' })
  }

  // 2. Get conversation messages for assessment
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversation_id)
    .order('created_at', { ascending: true })

  if (messagesError) {
    throw createError({ statusCode: 500, message: 'Failed to fetch conversation messages' })
  }

  const conversationTranscript: Message[] = (messages || []).map(m => ({
    role: m.role as 'system' | 'user' | 'assistant',
    content: m.content,
  }))

  // 3. Get previous conviction and context from user_story
  const { data: userStory, error: storyError } = await supabase
    .from('user_story')
    .select('*')
    .eq('user_id', user.sub)
    .single()

  if (storyError || !userStory) {
    throw createError({ statusCode: 500, message: 'Failed to fetch user story' })
  }

  const convictionField = ILLUSION_CONVICTION_FIELDS[illusion_key]
  const previousConviction = userStory[convictionField] || 0

  const existingTriggers = userStory.primary_triggers || []
  const existingStakes = userStory.personal_stakes || []

  // 4. Get previous insights for this illusion
  const { data: previousInsightMoments } = await supabase
    .from('captured_moments')
    .select('id, transcript')
    .eq('user_id', user.sub)
    .eq('illusion_key', illusion_key)
    .eq('moment_type', 'insight')
    .order('created_at', { ascending: false })
    .limit(5)

  const previousInsights = previousInsightMoments?.map(m => m.transcript) || []
  const previousInsightIds = new Set(previousInsightMoments?.map(m => m.id) || [])

  // 5. Run conviction assessment using existing logic
  console.log(`[reinforcement-assess] Running assessment for ${illusion_key}`)
  const assessment = await assessConviction({
    conversationTranscript,
    illusionKey: illusion_key,
    previousConviction,
    previousInsights,
    existingTriggers,
    existingStakes,
  })

  // 6. Check if new insights emerged (moments captured after this session started)
  const { data: newInsights } = await supabase
    .from('captured_moments')
    .select('id')
    .eq('user_id', user.sub)
    .eq('conversation_id', conversation_id)
    .eq('illusion_key', illusion_key)
    .eq('moment_type', 'insight')

  const hasNewInsights = (newInsights || []).some(m => !previousInsightIds.has(m.id))

  // 7. Determine shift quality
  const shiftQuality = determineShiftQuality(
    assessment.delta,
    assessment.newConviction,
    previousConviction,
    hasNewInsights
  )

  // 8. Store assessment in conviction_assessments table
  const { error: assessmentError } = await supabase
    .from('conviction_assessments')
    .insert({
      user_id: user.sub,
      conversation_id,
      illusion_key,
      illusion_layer: null, // Reinforcement sessions don't have layers
      conviction_score: assessment.newConviction,
      delta: assessment.delta,
      recommended_next_step: assessment.recommendedNextStep,
      reasoning: assessment.reasoning,
      new_triggers: assessment.newTriggers,
      new_stakes: assessment.newStakes,
    })

  if (assessmentError) {
    console.error('[reinforcement-assess] Failed to store assessment:', assessmentError)
  }

  // 9. Update user_story fields
  const storyUpdateData: Record<string, unknown> = {
    [convictionField]: assessment.newConviction,
    updated_at: new Date().toISOString(),
  }

  // Store resistance notes if present
  if (assessment.remainingResistance) {
    const resistanceField = ILLUSION_RESISTANCE_FIELDS[illusion_key]
    storyUpdateData[resistanceField] = assessment.remainingResistance
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

  // Update key insight if a better one emerged
  if (hasNewInsights && newInsights && newInsights.length > 0) {
    // Get the highest confidence new insight
    const { data: bestNewInsight } = await supabase
      .from('captured_moments')
      .select('id, confidence_score')
      .eq('user_id', user.sub)
      .eq('conversation_id', conversation_id)
      .eq('illusion_key', illusion_key)
      .eq('moment_type', 'insight')
      .order('confidence_score', { ascending: false })
      .limit(1)
      .single()

    if (bestNewInsight) {
      const keyInsightField = ILLUSION_KEY_INSIGHT_FIELDS[illusion_key]
      storyUpdateData[keyInsightField] = bestNewInsight.id
    }
  }

  const { error: updateError } = await supabase
    .from('user_story')
    .update(storyUpdateData)
    .eq('user_id', user.sub)

  if (updateError) {
    console.error('[reinforcement-assess] Failed to update user_story:', updateError)
  }

  console.log(
    `[reinforcement-assess] Completed: ${illusion_key} conviction ${previousConviction} -> ${assessment.newConviction} (${shiftQuality})`
  )

  return {
    current_conviction: assessment.newConviction,
    delta_from_previous: assessment.delta,
    shift_quality: shiftQuality,
  }
})
