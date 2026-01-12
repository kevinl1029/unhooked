/**
 * Conviction Assessment Task
 * Evaluates user's belief shift after a session and extracts new triggers/stakes
 */

import { getTaskExecutor, parseJsonResponse } from '../task-executor'
import type { Message } from '../types'
import type {
  ConvictionAssessmentInput,
  ConvictionAssessmentOutput,
} from '../task-types'
import { ILLUSION_DATA, type IllusionKey } from '../task-types'

/**
 * Build the conviction assessment prompt
 */
function buildAssessmentPrompt(input: ConvictionAssessmentInput): string {
  const illusionData = ILLUSION_DATA[input.illusionKey as IllusionKey]
  const illusionDisplayName = illusionData?.displayName || input.illusionKey

  // Format conversation transcript
  const transcriptText = input.conversationTranscript
    .filter(m => m.role !== 'system') // Exclude system messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n')

  // Format previous insights
  const previousInsightsText = input.previousInsights.length > 0
    ? input.previousInsights.map(i => `- "${i}"`).join('\n')
    : 'None recorded'

  // Format existing triggers and stakes
  const existingTriggersText = input.existingTriggers.length > 0
    ? input.existingTriggers.join(', ')
    : 'None recorded'

  const existingStakesText = input.existingStakes.length > 0
    ? input.existingStakes.join(', ')
    : 'None recorded'

  return `You are assessing a user's belief shift after a nicotine cessation session focused on "${illusionDisplayName}".

THE ILLUSION: Nicotine provides ${getIllusionDescription(input.illusionKey)}
THE TRUTH: ${getIllusionTruth(input.illusionKey)}

PREVIOUS CONVICTION LEVEL: ${input.previousConviction}/10
PREVIOUS INSIGHTS THEY'VE EXPRESSED:
${previousInsightsText}

EXISTING TRIGGERS WE KNOW ABOUT:
${existingTriggersText}

EXISTING PERSONAL STAKES:
${existingStakesText}

SESSION TRANSCRIPT:
${transcriptText}

Assess their current belief state AND extract any new information:

1. CONVICTION (0-10): How deeply do they now believe the truth vs. the illusion?
   - 0-2: Still fully believes the illusion
   - 3-4: Intellectually questioning but emotionally attached
   - 5-6: Sees the logic but hasn't felt it
   - 7-8: Genuine shift, some residual doubt
   - 9-10: Fully sees through the illusion, embodied understanding

2. REMAINING RESISTANCE: What are they still holding onto, if anything?

3. RECOMMENDED NEXT STEP: Always "move_on" — conviction tracks but does not gate progress

4. NEW TRIGGERS: Any new situations/emotions that trigger their use mentioned in this session?
   (Only include genuinely new triggers not already in the existing list)

5. NEW STAKES: Any new personal motivations (kids, health, career, relationship) mentioned?
   (Only include genuinely new stakes not already in the existing list)

Respond with JSON only:
{
  "newConviction": number,
  "delta": number,
  "remainingResistance": "description" | null,
  "recommendedNextStep": "move_on",
  "reasoning": "explanation of assessment",
  "newTriggers": ["trigger1", "trigger2"] or [],
  "newStakes": ["stake1"] or []
}`
}

/**
 * Get illusion description for prompt
 */
function getIllusionDescription(illusionKey: string): string {
  const descriptions: Record<string, string> = {
    stress_relief: 'stress relief and helps manage anxiety',
    pleasure: 'genuine pleasure and enjoyment',
    willpower: 'something that requires willpower to overcome',
    focus: 'improved focus and concentration',
    identity: 'part of who you are as a person',
  }
  return descriptions[illusionKey] || 'some benefit'
}

/**
 * Get illusion truth for prompt
 */
function getIllusionTruth(illusionKey: string): string {
  const truths: Record<string, string> = {
    stress_relief: 'Nicotine creates the stress it appears to relieve. The "relief" is just ending withdrawal.',
    pleasure: 'The "pleasure" is just the absence of the discomfort nicotine itself created. Non-smokers don\'t need it to feel good.',
    willpower: 'Quitting isn\'t about willpower. Once you see through the illusion, there\'s nothing to resist.',
    focus: 'Nicotine impairs your baseline focus. The "boost" just returns you to where non-smokers already are.',
    identity: 'You weren\'t born a smoker. The identity was manufactured by addiction. The real you is underneath.',
  }
  return truths[illusionKey] || 'The illusion is false.'
}

/**
 * Parse the conviction assessment response
 */
function parseAssessmentResponse(response: string): ConvictionAssessmentOutput {
  try {
    const parsed = parseJsonResponse<{
      newConviction: number | null
      delta: number | null
      remainingResistance: string | null
      recommendedNextStep: string
      reasoning: string
      newTriggers: string[] | null
      newStakes: string[] | null
    }>(response)

    // Coerce conviction to valid range (0-10)
    let conviction = parsed.newConviction ?? 5
    conviction = Math.max(0, Math.min(10, Math.round(conviction)))

    // Calculate delta (might be provided or we compute it)
    const delta = parsed.delta ?? 0

    // Normalize recommended next step
    let recommendedNextStep: 'deepen' | 'move_on' | 'revisit_later' = 'move_on'
    if (parsed.recommendedNextStep === 'deepen' || parsed.recommendedNextStep === 'revisit_later') {
      recommendedNextStep = parsed.recommendedNextStep
    }

    return {
      newConviction: conviction,
      delta,
      remainingResistance: parsed.remainingResistance || null,
      recommendedNextStep,
      reasoning: parsed.reasoning || '',
      newTriggers: parsed.newTriggers || [],
      newStakes: parsed.newStakes || [],
    }
  } catch (error) {
    console.error('[conviction-assessment] Failed to parse response:', error)
    // Return default values on parse failure
    return {
      newConviction: 5,
      delta: 0,
      remainingResistance: null,
      recommendedNextStep: 'move_on',
      reasoning: 'Failed to parse assessment response',
      newTriggers: [],
      newStakes: [],
    }
  }
}

/**
 * Assess conviction after a session
 * Called when [SESSION_COMPLETE] token is detected
 */
export async function assessConviction(input: ConvictionAssessmentInput): Promise<ConvictionAssessmentOutput> {
  try {
    const executor = getTaskExecutor()
    const prompt = buildAssessmentPrompt(input)

    const result = await executor.executeTask<ConvictionAssessmentOutput>(
      'conviction.assess',
      prompt,
      parseAssessmentResponse
    )

    // Recalculate delta based on actual previous conviction
    const actualDelta = result.newConviction - input.previousConviction

    return {
      ...result,
      delta: actualDelta,
    }
  } catch (error) {
    console.error('[conviction-assessment] Assessment failed:', error)
    // Return default on failure
    return {
      newConviction: input.previousConviction,
      delta: 0,
      remainingResistance: null,
      recommendedNextStep: 'move_on',
      reasoning: 'Assessment failed',
      newTriggers: [],
      newStakes: [],
    }
  }
}
