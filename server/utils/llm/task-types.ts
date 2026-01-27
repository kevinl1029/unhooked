/**
 * LLM Task Types
 * Defines types for the task-based model routing system
 */

import type { Message } from './types'

// ============================================
// LLM Task Definitions
// ============================================

export type LLMTask =
  | 'conversation'
  | 'moment.detect'
  | 'conviction.assess'
  | 'checkin.personalize'
  | 'story.summarize'
  | 'ceremony.narrative'
  | 'ceremony.select'
  | 'key_insight.select'

// Extended model types to support specific model versions
export type TaskModelType =
  | 'gemini-pro'
  | 'gemini-flash'
  | 'claude-sonnet'
  | 'claude-haiku'
  | 'gpt-4'
  | 'gpt-4-turbo'

export interface TaskModelConfig {
  task: LLMTask
  model: TaskModelType
  temperature?: number
  maxTokens?: number
}

// Default configuration for each task
export const DEFAULT_TASK_MODELS: TaskModelConfig[] = [
  { task: 'conversation', model: 'gemini-pro', temperature: 0.7 },
  { task: 'moment.detect', model: 'gemini-flash', temperature: 0.3, maxTokens: 500 },
  { task: 'conviction.assess', model: 'gemini-pro', temperature: 0.3, maxTokens: 1000 },
  { task: 'checkin.personalize', model: 'gemini-flash', temperature: 0.7, maxTokens: 300 },
  { task: 'story.summarize', model: 'gemini-pro', temperature: 0.5, maxTokens: 500 },
  { task: 'ceremony.narrative', model: 'gemini-pro', temperature: 0.8, maxTokens: 2000 },
  { task: 'ceremony.select', model: 'gemini-pro', temperature: 0.3, maxTokens: 1000 },
  { task: 'key_insight.select', model: 'gemini-pro', temperature: 0.3, maxTokens: 500 },
]

// ============================================
// Moment Detection Types
// ============================================

export type MomentType =
  | 'origin_story'
  | 'rationalization'
  | 'insight'
  | 'emotional_breakthrough'
  | 'real_world_observation'
  | 'identity_statement'
  | 'commitment'
  | 'fear_resistance'

export type EmotionalValence = 'positive' | 'negative' | 'neutral' | 'mixed'

export type SessionType = 'core' | 'check_in' | 'ceremony' | 'reinforcement' | 'boost'

export type IllusionLayer = 'intellectual' | 'emotional' | 'identity'

export interface MomentDetectionInput {
  userMessage: string
  recentHistory: Message[]
  currentIllusionKey: string
  sessionType: SessionType
}

export interface MomentDetectionOutput {
  shouldCapture: boolean
  momentType: MomentType | null
  confidence: number
  emotionalValence: EmotionalValence | null
  keyPhrase: string | null
  reasoning: string
}

// ============================================
// Conviction Assessment Types
// ============================================

export interface ConvictionAssessmentInput {
  conversationTranscript: Message[]
  illusionKey: string
  previousConviction: number
  previousInsights: string[]
  existingTriggers: string[]
  existingStakes: string[]
}

export interface ConvictionAssessmentOutput {
  newConviction: number
  delta: number
  remainingResistance: string | null
  recommendedNextStep: 'deepen' | 'move_on' | 'revisit_later'
  reasoning: string
  newTriggers: string[]
  newStakes: string[]
}

// ============================================
// Key Insight Selection Types
// ============================================

export interface CapturedMoment {
  id: string
  userId: string
  conversationId: string | null
  messageId: string | null
  momentType: MomentType
  transcript: string
  audioClipPath: string | null
  audioDurationMs: number | null
  illusionKey: string | null
  sessionType: SessionType | null
  illusionLayer: IllusionLayer | null
  confidenceScore: number
  emotionalValence: EmotionalValence | null
  isUserHighlighted: boolean
  timesPlayedBack: number
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface KeyInsightSelectionInput {
  insights: CapturedMoment[]
  illusionKey: string
  sessionContext: string
}

export interface KeyInsightSelectionOutput {
  selectedMomentId: string
  reasoning: string
}

// ============================================
// Check-In Personalization Types
// ============================================

export type CheckInType = 'post_session' | 'morning' | 'evening'

export interface CheckInPersonalizationInput {
  checkInType: CheckInType
  triggerIllusionKey?: string
  recentMoments: CapturedMoment[]
  illusionsCompleted: string[]
  currentIllusionKey: string
  userFirstName?: string
}

export interface CheckInPersonalizationOutput {
  prompt: string
  captureGoal: string
}

// ============================================
// Story Summarization Types
// ============================================

export interface UserIntakeData {
  productTypes: string[]
  usageFrequency: string
  yearsUsing: number | null
  previousAttempts: number
  longestQuitDuration: string | null
  primaryReason: string
  triggers: string[] | null
}

export interface StorySummarizationInput {
  originFragments: CapturedMoment[]
  intakeData: UserIntakeData
}

export interface StorySummarizationOutput {
  summary: string
  keyThemes: string[]
}

// ============================================
// Ceremony Types
// ============================================

export interface JourneySegment {
  id: string
  type: 'narration' | 'user_moment'
  text: string // For TTS generation or display
  momentId?: string // If type is user_moment
}

export interface CeremonyNarrativeInput {
  selectedMoments: CapturedMoment[]
  userFirstName?: string
  alreadyQuit?: boolean // Adjusts narrative if they quit before ceremony
  originSummary?: string // User's origin story summary
}

export interface CeremonyNarrativeOutput {
  narrative: string // Full narrative text (600-800 words)
  segments: JourneySegment[] // Broken into segments for playback
}

export interface CeremonyMomentSelectInput {
  allMoments: CapturedMoment[]
  maxMoments: number
}

export interface CeremonyMomentSelectOutput {
  selectedIds: string[]
  reasoning: Record<string, string>
}

// ============================================
// Cheat Sheet Types
// ============================================

export interface IllusionCheatSheetEntry {
  illusionKey: string
  name: string
  illusion: string
  truth: string
  userInsight?: string
  insightMomentId?: string
}

export interface CheatSheetData {
  entries: IllusionCheatSheetEntry[]
  generatedAt: string
}

/**
 * Validates that data matches the CheatSheetData interface
 */
export function validateCheatSheet(data: unknown): data is CheatSheetData {
  if (!data || typeof data !== 'object') return false

  const sheet = data as Record<string, unknown>

  if (!Array.isArray(sheet.entries)) return false
  if (typeof sheet.generatedAt !== 'string') return false

  for (const entry of sheet.entries) {
    if (typeof entry !== 'object' || entry === null) return false
    const e = entry as Record<string, unknown>

    if (typeof e.illusionKey !== 'string') return false
    if (typeof e.name !== 'string') return false
    if (typeof e.illusion !== 'string') return false
    if (typeof e.truth !== 'string') return false
    if (e.userInsight !== undefined && typeof e.userInsight !== 'string') return false
    if (e.insightMomentId !== undefined && typeof e.insightMomentId !== 'string') return false
  }

  return true
}

// ============================================
// Illusion Reference Data
// ============================================

export const ILLUSION_KEYS = [
  'stress_relief',
  'pleasure',
  'willpower',
  'focus',
  'identity',
] as const

export type IllusionKey = typeof ILLUSION_KEYS[number]

export const ILLUSION_DATA: Record<IllusionKey, { number: number; displayName: string; shortName: string }> = {
  stress_relief: { number: 1, displayName: 'The Stress Relief Illusion', shortName: 'Stress' },
  pleasure: { number: 2, displayName: 'The Pleasure Illusion', shortName: 'Pleasure' },
  willpower: { number: 3, displayName: 'The Willpower Illusion', shortName: 'Willpower' },
  focus: { number: 4, displayName: 'The Focus Illusion', shortName: 'Focus' },
  identity: { number: 5, displayName: 'The Identity Illusion', shortName: 'Identity' },
}

/**
 * Convert illusion number to illusion key
 */
export function illusionNumberToKey(illusionNumber: number): IllusionKey | null {
  const entry = Object.entries(ILLUSION_DATA).find(([_, data]) => data.number === illusionNumber)
  return entry ? (entry[0] as IllusionKey) : null
}

/**
 * Convert illusion key to illusion number
 */
export function illusionKeyToNumber(illusionKey: string): number | null {
  const data = ILLUSION_DATA[illusionKey as IllusionKey]
  return data ? data.number : null
}

