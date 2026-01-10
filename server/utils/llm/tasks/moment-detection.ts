/**
 * Moment Detection Task
 * Analyzes user messages for capture-worthy therapeutic moments
 */

import { getTaskExecutor, parseJsonResponse } from '../task-executor'
import type { Message } from '../types'
import type {
  MomentDetectionInput,
  MomentDetectionOutput,
  MomentType,
  EmotionalValence,
} from '../task-types'
import { MYTH_DATA, type MythKey } from '../task-types'

// Minimum word count to trigger moment detection
const MIN_WORD_COUNT = 20

// Maximum detection calls per session
const MAX_DETECTIONS_PER_SESSION = 20

// Confidence thresholds
export const TRANSCRIPT_CAPTURE_THRESHOLD = 0.7
export const AUDIO_CAPTURE_THRESHOLD = 0.85

/**
 * Check if a message meets the minimum word count for detection
 */
export function shouldAttemptDetection(message: string): boolean {
  const wordCount = message.trim().split(/\s+/).length
  return wordCount >= MIN_WORD_COUNT
}

/**
 * Build the moment detection prompt
 */
function buildDetectionPrompt(input: MomentDetectionInput): string {
  const mythData = MYTH_DATA[input.currentMythKey as MythKey]
  const mythDisplayName = mythData?.displayName || input.currentMythKey

  const recentHistoryText = input.recentHistory
    .slice(-6) // Last 4-6 messages
    .map(m => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n')

  return `Analyze this user message for therapeutic significance in a nicotine cessation context.

USER MESSAGE: "${input.userMessage}"

RECENT CONTEXT:
${recentHistoryText}

CURRENT MYTH BEING DISCUSSED: ${input.currentMythKey} (${mythDisplayName})

Identify if this message contains any of these moment types:
- ORIGIN_STORY: How they started, context of addiction beginning
- RATIONALIZATION: Stories they tell themselves about why they use
- INSIGHT: A reframe or realization expressed in their own words
- EMOTIONAL_BREAKTHROUGH: Strong emotion (anger, grief, relief, surprise at realization)
- REAL_WORLD_OBSERVATION: Something they noticed in their actual life
- IDENTITY_STATEMENT: How they describe themselves in relation to addiction
- COMMITMENT: Statements about what they want or who they want to be
- FEAR_RESISTANCE: Fears about quitting, resistance to accepting a reframe

Only flag moments with genuine therapeutic significance. Routine acknowledgments ("yeah", "okay", "I see") are NOT moments.

Respond with JSON only:
{
  "shouldCapture": boolean,
  "momentType": "origin_story" | "rationalization" | "insight" | "emotional_breakthrough" | "real_world_observation" | "identity_statement" | "commitment" | "fear_resistance" | null,
  "confidence": 0.0-1.0,
  "emotionalValence": "positive" | "negative" | "neutral" | "mixed" | null,
  "keyPhrase": "the specific phrase worth capturing" | null,
  "reasoning": "brief explanation of why this is or isn't significant"
}`
}

/**
 * Parse the moment detection response
 */
function parseDetectionResponse(response: string): MomentDetectionOutput {
  try {
    const parsed = parseJsonResponse<{
      shouldCapture: boolean
      momentType: string | null
      confidence: number
      emotionalValence: string | null
      keyPhrase: string | null
      reasoning: string
    }>(response)

    // Normalize moment type to lowercase snake_case
    let normalizedMomentType: MomentType | null = null
    if (parsed.momentType) {
      normalizedMomentType = parsed.momentType.toLowerCase().replace(/-/g, '_') as MomentType
    }

    // Normalize emotional valence
    let normalizedValence: EmotionalValence | null = null
    if (parsed.emotionalValence) {
      normalizedValence = parsed.emotionalValence.toLowerCase() as EmotionalValence
    }

    // Coerce confidence to valid range
    const confidence = Math.max(0, Math.min(1, parsed.confidence || 0))

    return {
      shouldCapture: parsed.shouldCapture && confidence >= TRANSCRIPT_CAPTURE_THRESHOLD,
      momentType: normalizedMomentType,
      confidence,
      emotionalValence: normalizedValence,
      keyPhrase: parsed.keyPhrase || null,
      reasoning: parsed.reasoning || '',
    }
  } catch (error) {
    // Silent fail - return non-capture result
    console.error('[moment-detection] Failed to parse response:', error)
    return {
      shouldCapture: false,
      momentType: null,
      confidence: 0,
      emotionalValence: null,
      keyPhrase: null,
      reasoning: 'Failed to parse detection response',
    }
  }
}

/**
 * Detect moments in a user message
 * This runs in parallel with AI response generation
 */
export async function detectMoment(input: MomentDetectionInput): Promise<MomentDetectionOutput> {
  // Check minimum word count
  if (!shouldAttemptDetection(input.userMessage)) {
    return {
      shouldCapture: false,
      momentType: null,
      confidence: 0,
      emotionalValence: null,
      keyPhrase: null,
      reasoning: 'Message too short for detection',
    }
  }

  try {
    const executor = getTaskExecutor()
    const prompt = buildDetectionPrompt(input)

    const result = await executor.executeTask<MomentDetectionOutput>(
      'moment.detect',
      prompt,
      parseDetectionResponse
    )

    return result
  } catch (error) {
    // Silent fail on detection errors
    console.error('[moment-detection] Detection failed:', error)
    return {
      shouldCapture: false,
      momentType: null,
      confidence: 0,
      emotionalValence: null,
      keyPhrase: null,
      reasoning: 'Detection failed silently',
    }
  }
}

/**
 * Session detection tracker to enforce rate limits
 */
export class SessionDetectionTracker {
  private detectionCounts: Map<string, number> = new Map()

  /**
   * Check if we can perform another detection for this session
   */
  canDetect(conversationId: string): boolean {
    const count = this.detectionCounts.get(conversationId) || 0
    return count < MAX_DETECTIONS_PER_SESSION
  }

  /**
   * Increment the detection count for a session
   */
  incrementCount(conversationId: string): void {
    const count = this.detectionCounts.get(conversationId) || 0
    this.detectionCounts.set(conversationId, count + 1)
  }

  /**
   * Get the current count for a session
   */
  getCount(conversationId: string): number {
    return this.detectionCounts.get(conversationId) || 0
  }

  /**
   * Reset count for a session (called when session ends)
   */
  resetCount(conversationId: string): void {
    this.detectionCounts.delete(conversationId)
  }
}

// Singleton tracker instance
let sessionTracker: SessionDetectionTracker | null = null

export function getSessionDetectionTracker(): SessionDetectionTracker {
  if (!sessionTracker) {
    sessionTracker = new SessionDetectionTracker()
  }
  return sessionTracker
}
