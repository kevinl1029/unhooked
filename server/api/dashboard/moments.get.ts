/**
 * GET /api/dashboard/moments
 * Returns the optimal moment card for the dashboard based on conviction scores
 *
 * Algorithm:
 * 1. Find the illusion with the lowest conviction score
 * 2. Tiebreaker: most recently completed illusion
 * 3. Select moment using weighted random (higher confidence_score, older last_used_at)
 * 4. Return empty if no moments exist
 * 5. Return special payload if illusion has no moments
 */
import { serverSupabaseServiceRole, serverSupabaseUser } from '#supabase/server'

// Map illusion keys to display names
const ILLUSION_DISPLAY_NAMES: Record<string, string> = {
  stress_relief: 'Stress Relief',
  pleasure: 'Pleasure',
  willpower: 'Willpower',
  focus: 'Focus',
  identity: 'Identity',
}

// Map illusion keys to field names in user_story
const ILLUSION_CONVICTION_FIELDS: Record<string, string> = {
  stress_relief: 'stress_relief_conviction',
  pleasure: 'pleasure_conviction',
  willpower: 'willpower_conviction',
  focus: 'focus_conviction',
  identity: 'identity_conviction',
}

interface IllusionCompletion {
  illusion_key: string
  conviction: number
  completed_at: string
}

interface MomentCard {
  moment_id: string
  quote: string
  illusion_key: string
  illusion_name: string
  relative_time: string
  created_at: string
}

interface NoMomentsResponse {
  no_moments: true
  illusion_key: string
  illusion_name: string
}

/**
 * Calculate relative time string from a date
 */
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays <= 30) return `${diffDays} days ago`
  return 'Over a month ago'
}

/**
 * Truncate quote to max length with ellipsis
 */
function truncateQuote(quote: string, maxLength: number = 240): string {
  if (quote.length <= maxLength) return quote
  return quote.substring(0, maxLength) + '...'
}

export default defineEventHandler(async (event): Promise<MomentCard | NoMomentsResponse | null> => {
  const user = await serverSupabaseUser(event)
  if (!user || !user.sub) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  const supabase = serverSupabaseServiceRole(event)

  // 1. Get user_story with conviction scores
  const { data: userStory, error: storyError } = await supabase
    .from('user_story')
    .select('*')
    .eq('user_id', user.sub)
    .single()

  if (storyError) {
    // No user story yet - no moments to show
    if (storyError.code === 'PGRST116') {
      return null
    }
    throw createError({ statusCode: 500, message: storyError.message })
  }

  // 2. Get completed illusions from user_progress
  const { data: progress, error: progressError } = await supabase
    .from('user_progress')
    .select('illusions_completed')
    .eq('user_id', user.sub)
    .single()

  if (progressError || !progress || !progress.illusions_completed || progress.illusions_completed.length === 0) {
    // No completed illusions yet
    return null
  }

  // 3. Get completion dates for completed illusions
  const illusionKeys = progress.illusions_completed.map((num: number) => {
    const keyMap: Record<number, string> = {
      1: 'stress_relief',
      2: 'pleasure',
      3: 'willpower',
      4: 'focus',
      5: 'identity',
    }
    return keyMap[num]
  }).filter(Boolean)

  if (illusionKeys.length === 0) {
    return null
  }

  // 4. Get completion timestamps from conversations
  const { data: completedConversations, error: convoError } = await supabase
    .from('conversations')
    .select('illusion_key, completed_at')
    .eq('user_id', user.sub)
    .in('illusion_key', illusionKeys)
    .eq('session_type', 'core')
    .eq('session_completed', true)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })

  if (convoError) {
    throw createError({ statusCode: 500, message: convoError.message })
  }

  // 5. Build list of completed illusions with conviction scores and completion dates
  const completedIllusions: IllusionCompletion[] = []
  const completionMap = new Map<string, string>()

  // Get most recent completion date per illusion
  completedConversations?.forEach((conv: any) => {
    if (conv.illusion_key && conv.completed_at && !completionMap.has(conv.illusion_key)) {
      completionMap.set(conv.illusion_key, conv.completed_at)
    }
  })

  illusionKeys.forEach((key: string) => {
    const convictionField = ILLUSION_CONVICTION_FIELDS[key]
    const conviction = userStory[convictionField] || 0
    const completed_at = completionMap.get(key) || new Date().toISOString()

    completedIllusions.push({
      illusion_key: key,
      conviction,
      completed_at,
    })
  })

  if (completedIllusions.length === 0) {
    return null
  }

  // 6. Find illusion with lowest conviction (tiebreaker: most recently completed)
  completedIllusions.sort((a, b) => {
    if (a.conviction !== b.conviction) {
      return a.conviction - b.conviction // Lowest first
    }
    // Tiebreaker: most recent completion first
    return new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
  })

  const targetIllusion = completedIllusions[0]

  // 7. Get moments for this illusion
  const { data: moments, error: momentsError } = await supabase
    .from('captured_moments')
    .select('id, transcript, confidence_score, last_used_at, created_at')
    .eq('user_id', user.sub)
    .eq('illusion_key', targetIllusion.illusion_key)
    .order('confidence_score', { ascending: false })

  if (momentsError) {
    throw createError({ statusCode: 500, message: momentsError.message })
  }

  // 8. If no moments for this illusion, return special payload
  if (!moments || moments.length === 0) {
    return {
      no_moments: true,
      illusion_key: targetIllusion.illusion_key,
      illusion_name: ILLUSION_DISPLAY_NAMES[targetIllusion.illusion_key] || targetIllusion.illusion_key,
    }
  }

  // 9. Select moment using weighted random
  // Weight by confidence_score (higher = more likely)
  // Deprioritize recently-used moments (older last_used_at = more likely)

  const now = Date.now()
  const momentsWithWeights = moments.map(m => {
    // Base weight from confidence score (0.0 to 1.0)
    let weight = m.confidence_score || 0.5

    // If last_used_at exists, reduce weight based on recency
    if (m.last_used_at) {
      const daysSinceUsed = (now - new Date(m.last_used_at).getTime()) / (1000 * 60 * 60 * 24)
      // Exponentially increase weight as time passes (0.5x at day 0, 1.0x at day 7+)
      const recencyMultiplier = Math.min(1.0, 0.5 + (daysSinceUsed / 14))
      weight *= recencyMultiplier
    }

    return { moment: m, weight }
  })

  // Select using weighted random
  const totalWeight = momentsWithWeights.reduce((sum, mw) => sum + mw.weight, 0)
  let random = Math.random() * totalWeight
  let selectedMoment = momentsWithWeights[0].moment

  for (const mw of momentsWithWeights) {
    random -= mw.weight
    if (random <= 0) {
      selectedMoment = mw.moment
      break
    }
  }

  // 10. Format and return moment card
  const momentCard: MomentCard = {
    moment_id: selectedMoment.id,
    quote: truncateQuote(selectedMoment.transcript, 240),
    illusion_key: targetIllusion.illusion_key,
    illusion_name: ILLUSION_DISPLAY_NAMES[targetIllusion.illusion_key] || targetIllusion.illusion_key,
    relative_time: getRelativeTime(new Date(selectedMoment.created_at)),
    created_at: selectedMoment.created_at,
  }

  return momentCard
})
