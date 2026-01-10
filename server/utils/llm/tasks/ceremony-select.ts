/**
 * Ceremony Moment Selection Task
 * Selects the most impactful moments for the ceremony journey narrative
 */

import { getTaskExecutor, parseJsonResponse } from '../task-executor'
import type { CapturedMoment } from '../task-types'

export interface CeremonySelectInput {
  allMoments: CapturedMoment[]
  maxMoments?: number // Target count (default 10-15)
}

export interface CeremonySelectOutput {
  selectedIds: string[]
  reasoning: Record<string, string> // momentId -> why selected
}

/**
 * Build the ceremony selection prompt
 */
function buildSelectionPrompt(input: CeremonySelectInput): string {
  const maxMoments = input.maxMoments || 12

  // Group moments by type for the prompt
  const momentsByType: Record<string, CapturedMoment[]> = {}
  for (const moment of input.allMoments) {
    if (!momentsByType[moment.momentType]) {
      momentsByType[moment.momentType] = []
    }
    momentsByType[moment.momentType].push(moment)
  }

  // Format moments for the prompt
  const formattedMoments = input.allMoments.map(m => ({
    id: m.id,
    type: m.momentType,
    transcript: m.transcript,
    mythKey: m.mythKey,
    confidence: m.confidenceScore,
    emotionalValence: m.emotionalValence,
  }))

  return `You are selecting moments for a user's reflective journey ceremony - the culminating experience of their nicotine cessation program.

AVAILABLE MOMENTS:
${JSON.stringify(formattedMoments, null, 2)}

MOMENT TYPE COUNTS:
${Object.entries(momentsByType).map(([type, moments]) => `- ${type}: ${moments.length}`).join('\n')}

SELECTION CRITERIA:
1. Build a narrative arc: origin → struggle/rationalization → insight → transformation/commitment
2. Prioritize emotional impact and authenticity
3. Select moments that show genuine breakthroughs
4. Include at least one origin story if available
5. Include diverse myth coverage if possible
6. Prefer higher confidence scores when choosing between similar moments
7. Target ${maxMoments} moments total (can be fewer if quality requires it)

NARRATIVE ARC STRUCTURE:
- Opening: Origin story moments (how they started, early relationship with nicotine)
- Rising action: Rationalizations and resistance (the lies they told themselves)
- Turning point: Key insights (moments of realization)
- Resolution: Breakthroughs and commitments (transformation moments)

Respond with JSON only:
{
  "selectedIds": ["id1", "id2", ...],
  "reasoning": {
    "id1": "Why this moment was selected",
    "id2": "Why this moment was selected"
  }
}`
}

/**
 * Parse the ceremony selection response
 */
function parseSelectionResponse(response: string): CeremonySelectOutput {
  try {
    const parsed = parseJsonResponse<{
      selectedIds: string[]
      reasoning: Record<string, string>
    }>(response)

    return {
      selectedIds: parsed.selectedIds || [],
      reasoning: parsed.reasoning || {},
    }
  } catch (error) {
    console.error('[ceremony-select] Failed to parse response:', error)
    return {
      selectedIds: [],
      reasoning: {},
    }
  }
}

/**
 * Select moments for ceremony journey
 * Uses narrative arc criteria to choose the most impactful moments
 */
export async function selectCeremonyMoments(input: CeremonySelectInput): Promise<CeremonySelectOutput> {
  // Need at least a few moments to create a journey
  if (input.allMoments.length < 3) {
    // Return all moments if we have too few
    return {
      selectedIds: input.allMoments.map(m => m.id),
      reasoning: Object.fromEntries(
        input.allMoments.map(m => [m.id, 'Included - limited moments available'])
      ),
    }
  }

  try {
    const executor = getTaskExecutor()
    const prompt = buildSelectionPrompt(input)

    const result = await executor.executeTask<CeremonySelectOutput>(
      'ceremony.select',
      prompt,
      parseSelectionResponse
    )

    // Validate that selected IDs exist in input
    const validIds = new Set(input.allMoments.map(m => m.id))
    const validatedIds = result.selectedIds.filter(id => validIds.has(id))

    if (validatedIds.length === 0) {
      // Fallback: select top moments by confidence
      console.warn('[ceremony-select] No valid IDs returned, using fallback selection')
      return fallbackSelection(input)
    }

    return {
      selectedIds: validatedIds,
      reasoning: result.reasoning,
    }
  } catch (error) {
    console.error('[ceremony-select] Selection failed:', error)
    return fallbackSelection(input)
  }
}

/**
 * Fallback selection when LLM fails
 * Selects top moments by confidence, ensuring type diversity
 */
function fallbackSelection(input: CeremonySelectInput): CeremonySelectOutput {
  const maxMoments = input.maxMoments || 12
  const selectedIds: string[] = []
  const reasoning: Record<string, string> = {}

  // Sort by confidence
  const sorted = [...input.allMoments].sort((a, b) =>
    (b.confidenceScore || 0) - (a.confidenceScore || 0)
  )

  // Select one of each type first
  const selectedTypes = new Set<string>()
  for (const moment of sorted) {
    if (!selectedTypes.has(moment.momentType) && selectedIds.length < maxMoments) {
      selectedIds.push(moment.id)
      selectedTypes.add(moment.momentType)
      reasoning[moment.id] = `Fallback: highest confidence ${moment.momentType}`
    }
  }

  // Fill remaining slots with highest confidence
  for (const moment of sorted) {
    if (!selectedIds.includes(moment.id) && selectedIds.length < maxMoments) {
      selectedIds.push(moment.id)
      reasoning[moment.id] = `Fallback: high confidence (${moment.confidenceScore})`
    }
  }

  return { selectedIds, reasoning }
}
