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

export type SessionType = 'core' | 'check_in' | 'ceremony' | 'reinforcement'

export type MythLayer = 'intellectual' | 'emotional' | 'identity'

export interface MomentDetectionInput {
  userMessage: string
  recentHistory: Message[]
  currentMythKey: string
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
  mythKey: string
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
  mythKey: string | null
  sessionType: SessionType | null
  mythLayer: MythLayer | null
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
  mythKey: string
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
  triggerMythKey?: string
  recentMoments: CapturedMoment[]
  mythsCompleted: string[]
  currentMythKey: string
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

export interface CeremonyMomentSelection {
  origin: CapturedMoment[]
  rationalizations: CapturedMoment[]
  insights: CapturedMoment[]
  breakthroughs: CapturedMoment[]
  observations: CapturedMoment[]
  commitments: CapturedMoment[]
}

export interface CeremonyNarrativeInput {
  selectedMoments: CeremonyMomentSelection
  userFirstName?: string
  alreadyQuit?: boolean
}

export interface AudioSegment {
  text: string
  momentIdToInsert?: string
}

export interface CeremonyNarrativeOutput {
  narrative: string
  audioSegments: AudioSegment[]
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

export interface MythCheatSheetEntry {
  myth_key: string
  myth_number: number
  display_name: string
  the_myth: string
  the_truth: string
  your_insight: string | null
  your_insight_audio_path: string | null
}

export interface MythsCheatSheet {
  myths: MythCheatSheetEntry[]
  generated_at: string
}

/**
 * Validates that data matches the MythsCheatSheet interface
 */
export function validateCheatSheet(data: unknown): data is MythsCheatSheet {
  if (!data || typeof data !== 'object') return false

  const sheet = data as Record<string, unknown>

  if (!Array.isArray(sheet.myths)) return false
  if (typeof sheet.generated_at !== 'string') return false

  for (const myth of sheet.myths) {
    if (typeof myth !== 'object' || myth === null) return false
    const m = myth as Record<string, unknown>

    if (typeof m.myth_key !== 'string') return false
    if (typeof m.myth_number !== 'number') return false
    if (typeof m.display_name !== 'string') return false
    if (typeof m.the_myth !== 'string') return false
    if (typeof m.the_truth !== 'string') return false
    if (m.your_insight !== null && typeof m.your_insight !== 'string') return false
    if (m.your_insight_audio_path !== null && typeof m.your_insight_audio_path !== 'string') return false
  }

  return true
}

// ============================================
// Myth Reference Data
// ============================================

export const MYTH_KEYS = [
  'stress_relief',
  'pleasure',
  'willpower',
  'focus',
  'identity',
] as const

export type MythKey = typeof MYTH_KEYS[number]

export const MYTH_DATA: Record<MythKey, { number: number; displayName: string; shortName: string }> = {
  stress_relief: { number: 1, displayName: 'The Stress Relief Myth', shortName: 'Stress' },
  pleasure: { number: 2, displayName: 'The Pleasure Myth', shortName: 'Pleasure' },
  willpower: { number: 3, displayName: 'The Willpower Myth', shortName: 'Willpower' },
  focus: { number: 4, displayName: 'The Focus Myth', shortName: 'Focus' },
  identity: { number: 5, displayName: 'The Identity Myth', shortName: 'Identity' },
}

/**
 * Convert myth number to myth key
 */
export function mythNumberToKey(mythNumber: number): MythKey | null {
  const entry = Object.entries(MYTH_DATA).find(([_, data]) => data.number === mythNumber)
  return entry ? (entry[0] as MythKey) : null
}

/**
 * Convert myth key to myth number
 */
export function mythKeyToNumber(mythKey: string): number | null {
  const data = MYTH_DATA[mythKey as MythKey]
  return data ? data.number : null
}
