/**
 * Story Summarization Task
 * Synthesizes user's origin story from captured fragments into a coherent summary
 */

import { getTaskExecutor, parseJsonResponse } from '../task-executor'
import type {
  StorySummarizationInput,
  StorySummarizationOutput,
  CapturedMoment,
  UserIntakeData,
} from '../task-types'

/**
 * Build the story summarization prompt
 */
function buildSummarizationPrompt(input: StorySummarizationInput): string {
  // Format origin fragments
  const fragmentsText = input.originFragments
    .map((fragment, index) => `Fragment ${index + 1}: "${fragment.transcript}"`)
    .join('\n\n')

  // Format intake data for context
  const intakeContext = `
USER BACKGROUND:
- Products used: ${input.intakeData.productTypes.join(', ')}
- Usage frequency: ${input.intakeData.usageFrequency}
- Years using: ${input.intakeData.yearsUsing || 'unknown'}
- Previous quit attempts: ${input.intakeData.previousAttempts}
- Primary reason for quitting: ${input.intakeData.primaryReason}
${input.intakeData.triggers ? `- Known triggers: ${input.intakeData.triggers.join(', ')}` : ''}
${input.intakeData.longestQuitDuration ? `- Longest quit: ${input.intakeData.longestQuitDuration}` : ''}
`

  return `You are synthesizing a user's origin story from fragments they've shared during their nicotine cessation journey.

${intakeContext}

ORIGIN STORY FRAGMENTS (in chronological order):
${fragmentsText}

Create a coherent, empathetic summary of their story that:
1. Weaves together the fragments into a narrative
2. Identifies key themes (stress, social pressure, escape, identity, etc.)
3. Honors their authentic voice and experience
4. Is 2-4 sentences maximum
5. Avoids judgment or clinical language

The summary should feel like you understand them, not like a case file.

Respond with JSON only:
{
  "summary": "2-4 sentence narrative summary",
  "keyThemes": ["theme1", "theme2", ...]
}`
}

/**
 * Parse the story summarization response
 */
function parseSummarizationResponse(response: string): StorySummarizationOutput {
  try {
    const parsed = parseJsonResponse<{
      summary: string
      keyThemes: string[]
    }>(response)

    return {
      summary: parsed.summary || '',
      keyThemes: parsed.keyThemes || [],
    }
  } catch (error) {
    console.error('[story-summarization] Failed to parse response:', error)
    return {
      summary: '',
      keyThemes: [],
    }
  }
}

/**
 * Generate origin story summary from fragments
 * Called when 2+ origin_story type moments are captured
 */
export async function summarizeOriginStory(input: StorySummarizationInput): Promise<StorySummarizationOutput> {
  // Require at least 2 fragments
  if (input.originFragments.length < 2) {
    return {
      summary: '',
      keyThemes: [],
    }
  }

  try {
    const executor = getTaskExecutor()
    const prompt = buildSummarizationPrompt(input)

    const result = await executor.executeTask<StorySummarizationOutput>(
      'story.summarize',
      prompt,
      parseSummarizationResponse
    )

    return result
  } catch (error) {
    console.error('[story-summarization] Summarization failed:', error)
    return {
      summary: '',
      keyThemes: [],
    }
  }
}

/**
 * Check if we should generate a summary
 * Returns true if there are 2+ origin fragments and no summary exists yet
 */
export function shouldGenerateSummary(
  originFragmentCount: number,
  existingSummary: string | null
): boolean {
  return originFragmentCount >= 2 && !existingSummary
}
