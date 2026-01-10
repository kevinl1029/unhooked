/**
 * Ceremony Narrative Generation Task
 * Generates the reflective journey narrative for the ceremony
 */

import { getTaskExecutor, parseJsonResponse } from '../task-executor'
import type { CapturedMoment } from '../task-types'

export interface CeremonyNarrativeInput {
  selectedMoments: CapturedMoment[]
  userFirstName?: string
  alreadyQuit?: boolean // Adjusts narrative if they quit before ceremony
  originSummary?: string // User's origin story summary
}

export interface JourneySegment {
  id: string
  type: 'narration' | 'user_moment'
  text: string // For TTS generation or display
  momentId?: string // If type is user_moment
}

export interface CeremonyNarrativeOutput {
  narrative: string // Full narrative text (600-800 words)
  segments: JourneySegment[] // Broken into segments for playback
}

/**
 * Build the narrative generation prompt
 */
function buildNarrativePrompt(input: CeremonyNarrativeInput): string {
  const userName = input.userFirstName || 'friend'
  const alreadyQuit = input.alreadyQuit || false

  // Group moments by type
  const momentsByType: Record<string, CapturedMoment[]> = {}
  for (const moment of input.selectedMoments) {
    if (!momentsByType[moment.momentType]) {
      momentsByType[moment.momentType] = []
    }
    momentsByType[moment.momentType].push(moment)
  }

  // Format moments for the prompt
  const formattedMoments = input.selectedMoments.map(m => ({
    id: m.id,
    type: m.momentType,
    transcript: m.transcript,
    mythKey: m.mythKey,
  }))

  const quitContext = alreadyQuit
    ? `\n\nIMPORTANT: This user has ALREADY QUIT before the ceremony. Adjust the narrative to celebrate their organic quit. Use phrases like "You didn't even need the ritual. You just... stopped." and "Your body knew before your mind caught up."`
    : ''

  const originContext = input.originSummary
    ? `\n\nUSER'S ORIGIN STORY:\n${input.originSummary}`
    : ''

  return `You are generating a reflective journey narrative for ${userName}'s ceremony - the culminating experience of their nicotine cessation program.

SELECTED MOMENTS (in narrative order):
${JSON.stringify(formattedMoments, null, 2)}
${originContext}
${quitContext}

NARRATIVE STRUCTURE:
1. Opening (warm, acknowledging their journey)
2. Origin reflection (where it started)
3. The myths they believed (rationalizations)
4. Moments of clarity (insights and breakthroughs)
5. Transformation (how they've changed)
6. Looking forward (their commitment to freedom)

GUIDELINES:
- Write in second person ("you")
- Weave their actual words (transcripts) naturally into the narrative
- Keep tone warm, reflective, not clinical
- Total narrative should be 600-800 words
- Create natural pause points between sections
- Reference specific moments by including [MOMENT:id] markers where their audio clips should play
- The narrative should feel like a gentle recap of their journey

OUTPUT FORMAT:
Generate a JSON response with:
1. "narrative" - the full text narrative
2. "segments" - array of segments, each with:
   - "id" - unique segment ID (use seg_1, seg_2, etc.)
   - "type" - either "narration" (AI speaks) or "user_moment" (their clip plays)
   - "text" - the text for this segment (for narration) or context text (for user_moment)
   - "momentId" - only for user_moment type, the moment ID to play

Example segment structure:
[
  { "id": "seg_1", "type": "narration", "text": "Let's look back at where this all began..." },
  { "id": "seg_2", "type": "user_moment", "text": "You shared this about how it started:", "momentId": "moment-abc" },
  { "id": "seg_3", "type": "narration", "text": "And then you had this realization..." }
]

Respond with JSON only:
{
  "narrative": "Full narrative text here...",
  "segments": [...]
}`
}

/**
 * Parse the narrative response
 */
function parseNarrativeResponse(response: string): CeremonyNarrativeOutput {
  try {
    const parsed = parseJsonResponse<{
      narrative: string
      segments: JourneySegment[]
    }>(response)

    // Validate segments have required fields
    const validSegments = (parsed.segments || []).filter(seg =>
      seg.id && seg.type && seg.text
    )

    return {
      narrative: parsed.narrative || '',
      segments: validSegments,
    }
  } catch (error) {
    console.error('[ceremony-narrative] Failed to parse response:', error)
    return {
      narrative: '',
      segments: [],
    }
  }
}

/**
 * Generate ceremony journey narrative
 */
export async function generateCeremonyNarrative(input: CeremonyNarrativeInput): Promise<CeremonyNarrativeOutput> {
  // Need moments to create a narrative
  if (input.selectedMoments.length === 0) {
    return {
      narrative: '',
      segments: [],
    }
  }

  try {
    const executor = getTaskExecutor()
    const prompt = buildNarrativePrompt(input)

    const result = await executor.executeTask<CeremonyNarrativeOutput>(
      'ceremony.narrative',
      prompt,
      parseNarrativeResponse
    )

    // Validate moment IDs in segments
    const validMomentIds = new Set(input.selectedMoments.map(m => m.id))
    const validatedSegments = result.segments.map(seg => {
      if (seg.type === 'user_moment' && seg.momentId && !validMomentIds.has(seg.momentId)) {
        // Convert invalid user_moment to narration
        console.warn(`[ceremony-narrative] Invalid momentId ${seg.momentId}, converting to narration`)
        return {
          ...seg,
          type: 'narration' as const,
          momentId: undefined,
        }
      }
      return seg
    })

    return {
      narrative: result.narrative,
      segments: validatedSegments,
    }
  } catch (error) {
    console.error('[ceremony-narrative] Narrative generation failed:', error)
    return fallbackNarrative(input)
  }
}

/**
 * Fallback narrative when LLM fails
 * Creates a simple structure from available moments
 */
function fallbackNarrative(input: CeremonyNarrativeInput): CeremonyNarrativeOutput {
  const userName = input.userFirstName || 'friend'
  const segments: JourneySegment[] = []

  // Opening
  segments.push({
    id: 'seg_1',
    type: 'narration',
    text: `${userName}, let's take a moment to reflect on your journey. You've come so far.`,
  })

  // Add each moment with intro
  input.selectedMoments.forEach((moment, index) => {
    segments.push({
      id: `seg_intro_${index}`,
      type: 'narration',
      text: `Here's something you shared:`,
    })
    segments.push({
      id: `seg_moment_${index}`,
      type: 'user_moment',
      text: moment.transcript,
      momentId: moment.id,
    })
  })

  // Closing
  segments.push({
    id: 'seg_closing',
    type: 'narration',
    text: `These are your words, your insights, your transformation. You did this.`,
  })

  const narrative = segments
    .filter(s => s.type === 'narration')
    .map(s => s.text)
    .join(' ')

  return { narrative, segments }
}
