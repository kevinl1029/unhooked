/**
 * Key Insight Selection Task
 * Selects the most impactful insight from multiple candidates for a myth
 */

import { getTaskExecutor, parseJsonResponse } from '../task-executor'
import type {
  KeyInsightSelectionInput,
  KeyInsightSelectionOutput,
  CapturedMoment,
} from '../task-types'
import { MYTH_DATA, type MythKey } from '../task-types'

/**
 * Build the key insight selection prompt
 */
function buildSelectionPrompt(input: KeyInsightSelectionInput): string {
  const mythData = MYTH_DATA[input.mythKey as MythKey]
  const mythDisplayName = mythData?.displayName || input.mythKey

  // Format insights as numbered list
  const insightsText = input.insights
    .map((insight, index) => {
      return `[${index + 1}] ID: ${insight.id}
   Type: ${insight.momentType}
   Transcript: "${insight.transcript}"
   Confidence: ${insight.confidenceScore}
   Emotional Valence: ${insight.emotionalValence || 'unknown'}`
    })
    .join('\n\n')

  return `You are selecting the most impactful insight from a user's nicotine cessation journey for "${mythDisplayName}".

SESSION CONTEXT:
${input.sessionContext}

CANDIDATE INSIGHTS:
${insightsText}

Select the single most powerful insight that:
1. Best captures a genuine "aha moment" or reframe
2. Uses the user's own authentic language
3. Would be most meaningful to remind them of later
4. Shows the deepest level of understanding (not just intellectual agreement)

Respond with JSON only:
{
  "selectedMomentId": "the UUID of the selected insight",
  "reasoning": "brief explanation of why this insight was chosen over others"
}`
}

/**
 * Parse the key insight selection response
 */
function parseSelectionResponse(response: string): KeyInsightSelectionOutput {
  try {
    const parsed = parseJsonResponse<{
      selectedMomentId: string
      reasoning: string
    }>(response)

    return {
      selectedMomentId: parsed.selectedMomentId || '',
      reasoning: parsed.reasoning || '',
    }
  } catch (error) {
    console.error('[key-insight-selection] Failed to parse response:', error)
    return {
      selectedMomentId: '',
      reasoning: 'Failed to parse selection response',
    }
  }
}

/**
 * Select the key insight from multiple candidates
 * Called at session end when multiple insights exist for the same myth
 */
export async function selectKeyInsight(input: KeyInsightSelectionInput): Promise<KeyInsightSelectionOutput> {
  // If only one insight, just return it
  if (input.insights.length === 1) {
    return {
      selectedMomentId: input.insights[0].id,
      reasoning: 'Only one insight available',
    }
  }

  // If no insights, return empty
  if (input.insights.length === 0) {
    return {
      selectedMomentId: '',
      reasoning: 'No insights to select from',
    }
  }

  try {
    const executor = getTaskExecutor()
    const prompt = buildSelectionPrompt(input)

    const result = await executor.executeTask<KeyInsightSelectionOutput>(
      'key_insight.select',
      prompt,
      parseSelectionResponse
    )

    // Validate that the selected ID is actually in our input
    const validIds = input.insights.map(i => i.id)
    if (!validIds.includes(result.selectedMomentId)) {
      // Fallback to highest confidence insight
      const highestConfidence = input.insights.reduce((best, current) =>
        current.confidenceScore > best.confidenceScore ? current : best
      )
      return {
        selectedMomentId: highestConfidence.id,
        reasoning: 'LLM selected invalid ID, falling back to highest confidence',
      }
    }

    return result
  } catch (error) {
    console.error('[key-insight-selection] Selection failed:', error)
    // Fallback to highest confidence insight
    const highestConfidence = input.insights.reduce((best, current) =>
      current.confidenceScore > best.confidenceScore ? current : best
    )
    return {
      selectedMomentId: highestConfidence.id,
      reasoning: 'Selection failed, using highest confidence insight',
    }
  }
}
