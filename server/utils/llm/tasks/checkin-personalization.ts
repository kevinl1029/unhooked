/**
 * Check-In Personalization Task
 * Generates personalized check-in prompts based on user's recent sessions and captured moments
 */

import { getTaskExecutor, parseJsonResponse } from '../task-executor'
import type {
  CheckInPersonalizationInput,
  CheckInPersonalizationOutput,
  CapturedMoment,
  CheckInType,
} from '../task-types'
import { ILLUSION_DATA, type IllusionKey } from '../task-types'

/**
 * Build the check-in personalization prompt
 */
function buildPersonalizationPrompt(input: CheckInPersonalizationInput): string {
  const currentIllusionData = ILLUSION_DATA[input.currentIllusionKey as IllusionKey]
  const currentIllusionName = currentIllusionData?.displayName || input.currentIllusionKey

  // Format recent moments
  const momentsText = input.recentMoments.length > 0
    ? input.recentMoments
        .slice(0, 5) // Max 5 moments for context
        .map(m => `- [${m.momentType}] "${m.transcript}"`)
        .join('\n')
    : 'No recent moments captured'

  // Format completed illusions
  const completedIllusionsText = input.illusionsCompleted.length > 0
    ? input.illusionsCompleted
        .map(key => ILLUSION_DATA[key as IllusionKey]?.shortName || key)
        .join(', ')
    : 'None yet'

  // Get check-in type context
  const checkInContext = getCheckInTypeContext(input.checkInType)

  // Trigger illusion context (for post-session check-ins)
  let triggerIllusionContext = ''
  if (input.triggerIllusionKey) {
    const triggerIllusionData = ILLUSION_DATA[input.triggerIllusionKey as IllusionKey]
    triggerIllusionContext = `\nTHIS CHECK-IN FOLLOWS A SESSION ON: ${triggerIllusionData?.displayName || input.triggerIllusionKey}`
  }

  const userName = input.userFirstName ? input.userFirstName : 'the user'

  return `You are creating a personalized check-in prompt for ${userName} in their nicotine cessation journey.

CHECK-IN TYPE: ${input.checkInType}
${checkInContext}
${triggerIllusionContext}

CURRENT ILLUSION BEING WORKED ON: ${currentIllusionName}

ILLUSIONS COMPLETED: ${completedIllusionsText}

RECENT MOMENTS FROM THEIR JOURNEY:
${momentsText}

Create a brief, personalized check-in prompt that:
1. Feels natural and conversational, not clinical
2. References something specific from their journey when possible
3. Is appropriate for the time of day (${input.checkInType})
4. Invites reflection without being demanding
5. Is 1-3 sentences maximum

Also specify what we're hoping to capture from their response.

Respond with JSON only:
{
  "prompt": "the personalized check-in message",
  "captureGoal": "what type of moment or insight we're hoping to elicit"
}`
}

/**
 * Get context for different check-in types
 */
function getCheckInTypeContext(checkInType: CheckInType): string {
  switch (checkInType) {
    case 'morning':
      return `CONTEXT: Morning check-in (9am). User is starting their day.
Goal: Set intention, notice any morning cravings, reflect on how they feel about the day ahead.`

    case 'evening':
      return `CONTEXT: Evening check-in (7pm). User is winding down their day.
Goal: Reflect on the day, notice any patterns, celebrate wins or process challenges.`

    case 'post_session':
      return `CONTEXT: Post-session check-in (2 hours after completing an illusion session).
Goal: Let insights settle, notice if they've thought about what was discussed, capture any new realizations.`

    default:
      return `CONTEXT: General check-in.
Goal: Stay connected to their journey and capture any new insights.`
  }
}

/**
 * Parse the check-in personalization response
 */
function parsePersonalizationResponse(response: string): CheckInPersonalizationOutput {
  try {
    const parsed = parseJsonResponse<{
      prompt: string
      captureGoal: string
    }>(response)

    return {
      prompt: parsed.prompt || getDefaultPrompt('morning'),
      captureGoal: parsed.captureGoal || 'general reflection',
    }
  } catch (error) {
    console.error('[checkin-personalization] Failed to parse response:', error)
    return {
      prompt: getDefaultPrompt('morning'),
      captureGoal: 'general reflection',
    }
  }
}

/**
 * Get default prompts for fallback
 */
function getDefaultPrompt(checkInType: CheckInType): string {
  switch (checkInType) {
    case 'morning':
      return 'Good morning. How are you feeling about today?'
    case 'evening':
      return 'Day\'s winding down. Anything on your mind from today?'
    case 'post_session':
      return 'Had any thoughts since we last talked?'
    default:
      return 'Quick check-in. How are things going?'
  }
}

/**
 * Generate a personalized check-in prompt
 * Called when scheduling each check-in (or just before sending)
 */
export async function personalizeCheckIn(input: CheckInPersonalizationInput): Promise<CheckInPersonalizationOutput> {
  try {
    const executor = getTaskExecutor()
    const prompt = buildPersonalizationPrompt(input)

    const result = await executor.executeTask<CheckInPersonalizationOutput>(
      'checkin.personalize',
      prompt,
      parsePersonalizationResponse
    )

    return result
  } catch (error) {
    console.error('[checkin-personalization] Personalization failed:', error)
    // Return default prompt on failure
    return {
      prompt: getDefaultPrompt(input.checkInType),
      captureGoal: 'general reflection',
    }
  }
}
