/**
 * POST /api/reinforcement/start
 * Start a reinforcement or boost session
 *
 * Handles two types of sessions:
 * 1. Illusion-specific reinforcement (with optional moment anchor)
 * 2. Generic boost (post-ceremony users only)
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

const VALID_ILLUSION_KEYS = ['stress_relief', 'pleasure', 'willpower', 'focus', 'identity']

const ILLUSION_DISPLAY_NAMES: Record<string, string> = {
  stress_relief: 'Stress Relief',
  pleasure: 'Pleasure',
  willpower: 'Willpower',
  focus: 'Focus',
  identity: 'Identity',
}

const ILLUSION_CONVICTION_FIELDS: Record<string, string> = {
  stress_relief: 'stress_relief_conviction',
  pleasure: 'pleasure_conviction',
  willpower: 'willpower_conviction',
  focus: 'focus_conviction',
  identity: 'identity_conviction',
}

interface StartReinforcementRequest {
  illusion_key?: string
  moment_id?: string
  reason?: string
}

interface SessionContext {
  previous_conviction?: number
  captured_moments?: Array<{ id: string; transcript: string; moment_type: string }>
  days_since_last_session?: number
  all_conviction_scores?: Record<string, number>
  recent_moments_all_illusions?: Array<{ illusion_key: string; transcript: string; moment_type: string }>
}

interface ReinforcementResponse {
  conversation_id: string
  session_type: 'reinforcement' | 'boost'
  illusion_key?: string
  anchor_moment?: { id: string; transcript: string }
  context: SessionContext
}

export default defineEventHandler(async (event): Promise<ReinforcementResponse> => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const body = await readBody<StartReinforcementRequest>(event)
  const { illusion_key, moment_id, reason } = body

  const supabase = serverSupabaseServiceRole(event)

  // Handle generic boost session
  if (reason === 'generic_boost') {
    // Check if user has completed all 5 illusions (ceremony_completed_at must be set)
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('ceremony_completed_at')
      .eq('user_id', user.sub)
      .single()

    if (progressError || !progress || !progress.ceremony_completed_at) {
      throw createError({
        statusCode: 403,
        message: 'Generic boost sessions are only available after completing all 5 core illusions',
      })
    }

    // Get all conviction scores
    const { data: userStory, error: storyError } = await supabase
      .from('user_story')
      .select('*')
      .eq('user_id', user.sub)
      .single()

    if (storyError) {
      throw createError({ statusCode: 500, message: storyError.message })
    }

    const allConvictionScores: Record<string, number> = {}
    VALID_ILLUSION_KEYS.forEach((key) => {
      const field = ILLUSION_CONVICTION_FIELDS[key]
      allConvictionScores[key] = userStory[field] || 0
    })

    // Get top 3 moments per completed illusion (15 max total)
    const { data: allMoments, error: momentsError } = await supabase
      .from('captured_moments')
      .select('id, illusion_key, transcript, moment_type, confidence_score, created_at')
      .eq('user_id', user.sub)
      .in('illusion_key', VALID_ILLUSION_KEYS)
      .order('confidence_score', { ascending: false })
      .limit(100) // Get more than we need, then filter

    if (momentsError) {
      throw createError({ statusCode: 500, message: momentsError.message })
    }

    // Group by illusion and take top 3 per illusion
    const momentsByIllusion = new Map<string, any[]>()
    allMoments?.forEach((moment) => {
      if (!momentsByIllusion.has(moment.illusion_key)) {
        momentsByIllusion.set(moment.illusion_key, [])
      }
      const illMoments = momentsByIllusion.get(moment.illusion_key)!
      if (illMoments.length < 3) {
        illMoments.push(moment)
      }
    })

    const recentMomentsAllIllusions = Array.from(momentsByIllusion.values())
      .flat()
      .map((m) => ({
        illusion_key: m.illusion_key,
        transcript: m.transcript,
        moment_type: m.moment_type,
      }))

    // Create conversation record with session_type: 'boost'
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        user_id: user.sub,
        title: 'Boost: Support',
        session_type: 'boost',
      })
      .select()
      .single()

    if (convError) {
      throw createError({ statusCode: 500, message: convError.message })
    }

    return {
      conversation_id: conversation.id,
      session_type: 'boost',
      context: {
        all_conviction_scores: allConvictionScores,
        recent_moments_all_illusions: recentMomentsAllIllusions,
      },
    }
  }

  // Handle illusion-specific reinforcement session
  if (!illusion_key || !VALID_ILLUSION_KEYS.includes(illusion_key)) {
    throw createError({ statusCode: 400, message: 'Invalid or missing illusion_key' })
  }

  // Check if user has completed this illusion
  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('illusions_completed')
    .eq('user_id', user.sub)
    .single()

  if (progressError || !progress) {
    throw createError({ statusCode: 500, message: 'Failed to fetch user progress' })
  }

  // Map illusion_key to illusion_number
  const illusionNumberMap: Record<string, number> = {
    stress_relief: 1,
    pleasure: 2,
    willpower: 3,
    focus: 4,
    identity: 5,
  }
  const illusionNumber = illusionNumberMap[illusion_key]

  if (!progress.illusions_completed?.includes(illusionNumber)) {
    throw createError({
      statusCode: 400,
      message: `User has not completed the ${illusion_key} illusion`,
    })
  }

  // Get previous conviction score from user_story
  const { data: userStory, error: storyError } = await supabase
    .from('user_story')
    .select('*')
    .eq('user_id', user.sub)
    .single()

  if (storyError) {
    throw createError({ statusCode: 500, message: storyError.message })
  }

  const convictionField = ILLUSION_CONVICTION_FIELDS[illusion_key]
  const previousConviction = userStory[convictionField] || 0

  // Get captured moments for this illusion (max 3, weighted selection)
  const { data: moments, error: momentsError } = await supabase
    .from('captured_moments')
    .select('id, transcript, moment_type, confidence_score, last_used_at, created_at')
    .eq('user_id', user.sub)
    .eq('illusion_key', illusion_key)
    .order('confidence_score', { ascending: false })

  if (momentsError) {
    throw createError({ statusCode: 500, message: momentsError.message })
  }

  // Apply weighted selection to get top 3 moments
  const now = Date.now()
  const momentsWithWeights = moments?.map((m) => {
    let weight = m.confidence_score || 0.5
    if (m.last_used_at) {
      const daysSinceUsed = (now - new Date(m.last_used_at).getTime()) / (1000 * 60 * 60 * 24)
      const recencyMultiplier = Math.min(1.0, 0.5 + daysSinceUsed / 14)
      weight *= recencyMultiplier
    }
    return { moment: m, weight }
  }) || []

  momentsWithWeights.sort((a, b) => b.weight - a.weight)
  const topMoments = momentsWithWeights.slice(0, 3).map((mw) => ({
    id: mw.moment.id,
    transcript: mw.moment.transcript,
    moment_type: mw.moment.moment_type,
  }))

  // Calculate days since last session for this illusion
  const { data: lastSession, error: lastSessionError } = await supabase
    .from('conversations')
    .select('completed_at')
    .eq('user_id', user.sub)
    .eq('illusion_key', illusion_key)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .single()

  let daysSinceLastSession: number | undefined
  if (!lastSessionError && lastSession && lastSession.completed_at) {
    const lastSessionDate = new Date(lastSession.completed_at)
    const diffMs = Date.now() - lastSessionDate.getTime()
    daysSinceLastSession = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  }

  // If moment_id provided, get the anchor moment and update last_used_at
  let anchorMoment: { id: string; transcript: string } | undefined
  if (moment_id) {
    const { data: moment, error: momentError } = await supabase
      .from('captured_moments')
      .select('id, transcript')
      .eq('id', moment_id)
      .eq('user_id', user.sub)
      .single()

    if (momentError) {
      // Moment not found or doesn't belong to user - skip anchor
      console.warn('Moment not found:', moment_id)
    } else {
      anchorMoment = { id: moment.id, transcript: moment.transcript }

      // Update last_used_at for this moment
      await supabase
        .from('captured_moments')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', moment_id)
    }
  }

  // Create conversation record with session_type: 'reinforcement'
  const illusionDisplayName = ILLUSION_DISPLAY_NAMES[illusion_key] || illusion_key
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .insert({
      user_id: user.sub,
      title: `Reinforcement: ${illusionDisplayName}`,
      session_type: 'reinforcement',
      illusion_key,
    })
    .select()
    .single()

  if (convError) {
    throw createError({ statusCode: 500, message: convError.message })
  }

  return {
    conversation_id: conversation.id,
    session_type: 'reinforcement',
    illusion_key,
    anchor_moment: anchorMoment,
    context: {
      previous_conviction: previousConviction,
      captured_moments: topMoments,
      days_since_last_session: daysSinceLastSession,
    },
  }
})
