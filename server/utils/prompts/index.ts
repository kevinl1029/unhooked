// Prompt builder utilities for illusion-focused sessions
import { BASE_SYSTEM_PROMPT, buildPersonalizationContext as buildPersonalization } from './base-system'
import type { UserContext } from './base-system'
import { ILLUSION_1_STRESS_PROMPT } from './illusions/illusion-1-stress'
import { ILLUSION_2_PLEASURE_PROMPT } from './illusions/illusion-2-pleasure'
import { ILLUSION_3_WILLPOWER_PROMPT } from './illusions/illusion-3-willpower'
import { ILLUSION_4_FOCUS_PROMPT } from './illusions/illusion-4-focus'
import { ILLUSION_5_IDENTITY_PROMPT } from './illusions/illusion-5-identity'

export type { UserContext }

// Extended options for buildSystemPrompt
export interface BuildSystemPromptOptions {
  illusionNumber: number
  userContext?: UserContext
  isNewConversation?: boolean
  // Phase 4C additions
  personalizationContext?: string  // From context-builder.ts
  bridgeContext?: string           // From bridge.ts
  abandonedSessionContext?: string // For abandoned session moments
}

export const ILLUSION_NAMES: Record<number, string> = {
  1: 'The Stress Illusion',
  2: 'The Pleasure Illusion',
  3: 'The Willpower Illusion',
  4: 'The Focus Illusion',
  5: 'The Identity Illusion',
}

const ILLUSION_PROMPTS: Record<number, string> = {
  1: ILLUSION_1_STRESS_PROMPT,
  2: ILLUSION_2_PLEASURE_PROMPT,
  3: ILLUSION_3_WILLPOWER_PROMPT,
  4: ILLUSION_4_FOCUS_PROMPT,
  5: ILLUSION_5_IDENTITY_PROMPT,
}

/**
 * Build system prompt with full personalization support
 * Supports both legacy signature and new options-based signature
 */
export function buildSystemPrompt(
  illusionNumberOrOptions: number | BuildSystemPromptOptions,
  userContext?: UserContext,
  isNewConversation = false
): string {
  // Handle both old and new signatures
  let options: BuildSystemPromptOptions

  if (typeof illusionNumberOrOptions === 'number') {
    // Legacy signature: buildSystemPrompt(illusionNumber, userContext, isNewConversation)
    options = {
      illusionNumber: illusionNumberOrOptions,
      userContext,
      isNewConversation,
    }
  } else {
    // New options-based signature
    options = illusionNumberOrOptions
  }

  let prompt = BASE_SYSTEM_PROMPT

  // Add basic user context (from intake)
  if (options.userContext) {
    prompt += buildPersonalization(options.userContext)
  }

  // Add rich personalization context (Phase 4C - from context-builder)
  if (options.personalizationContext) {
    prompt += options.personalizationContext
  }

  // Add illusion-specific prompt
  const illusionPrompt = ILLUSION_PROMPTS[options.illusionNumber]
  if (illusionPrompt) {
    prompt += '\n\n' + illusionPrompt
  }

  // Add bridge context for returning users (Phase 4C)
  if (options.bridgeContext) {
    prompt += '\n\n## Continuing From Previous Session\n'
    prompt += options.bridgeContext
  }

  // Add abandoned session context (Phase 4C)
  if (options.abandonedSessionContext) {
    prompt += '\n\n## Prior Session Context\n'
    prompt += options.abandonedSessionContext
  }

  // Add opening instruction for new conversations
  if (options.isNewConversation && !options.bridgeContext && !options.abandonedSessionContext) {
    const openingMessage = ILLUSION_OPENING_MESSAGES[options.illusionNumber]
    if (openingMessage) {
      prompt += '\n\n## Starting This Session\n\n'
      prompt += 'This is the beginning of this illusion session. Start the conversation with this opening:\n\n'
      prompt += `"${openingMessage}"\n\n`
      prompt += 'Use this as your first message to welcome them and begin exploring this illusion.'
    }
  }

  return prompt
}

export function buildPersonalizationContext(userContext: UserContext): string {
  return buildPersonalization(userContext)
}

// Opening messages for each illusion session
// These are shown immediately when user enters a session, creating the first exchange
export const ILLUSION_OPENING_MESSAGES: Record<number, string> = {
  1: `Hey there. I want to explore something with you that might feel really true right now: the idea that nicotine helps with stress.

Before we dive in, I'm curious—what made you want to start with this one? When you think about nicotine and stress, what comes to mind?`,

  2: `Welcome. Let's talk about pleasure and enjoyment.

A lot of people feel like nicotine genuinely gives them something pleasurable—like it's a reward or a treat. I want to understand your experience with that. When you think about "enjoying" nicotine, what does that actually feel like for you?`,

  3: `Hey. So this session is about the idea that quitting requires massive willpower and is incredibly hard.

I'm guessing you've either tried before and it felt brutal, or you've been putting it off because you're dreading how hard it'll be. Tell me—what's your relationship with that belief? What makes quitting feel so difficult?`,

  4: `Welcome. Let's dig into something a lot of people tell me: "I need nicotine to focus" or "I can't function without it."

Does that resonate with you? When you're working, studying, or trying to get something done, what role does nicotine play for you?`,

  5: `Hey. This session is a bit different—it's about identity. About beliefs like "I have an addictive personality" or "I'm just wired differently" or "I'm not like other people who can quit easily."

Do any of those thoughts sound familiar? What do you believe about yourself when it comes to nicotine and quitting?`
}

// Get the opening greeting for a specific illusion
export function getIllusionOpening(illusionNumber: number): string {
  return ILLUSION_OPENING_MESSAGES[illusionNumber] || `Let's explore ${ILLUSION_NAMES[illusionNumber]} together. What brings you to this session?`
}

/**
 * Build system prompt for check-in conversations
 * Check-ins are brief, supportive micro-conversations
 */
export function buildCheckInSystemPrompt(checkInPrompt: string): string {
  return `You are a supportive AI coach helping someone through their nicotine cessation journey.

This is a brief CHECK-IN conversation, not a full session. The user is responding to a reflection prompt.

## Your Role
- Be warm, brief, and supportive
- Acknowledge what they share without over-explaining
- Keep responses to 1-2 short sentences
- Don't lecture or teach - just connect
- If they share something meaningful, reflect it back simply

## The Check-In Prompt
The user is responding to: "${checkInPrompt}"

## Response Guidelines
- Maximum 2 short sentences
- Natural, conversational tone
- End with encouragement or acknowledgment, not a question
- Don't try to start a long conversation

## First Message
Start by speaking the check-in prompt naturally, as if you're asking them directly:
"${checkInPrompt}"

Wait for their response before saying anything else.`
}

// ============================================
// Backward-compatible aliases (deprecated)
// ============================================

/** @deprecated Use BuildSystemPromptOptions with illusionNumber instead */
export interface LegacyBuildSystemPromptOptions {
  mythNumber: number
  userContext?: UserContext
  isNewConversation?: boolean
  personalizationContext?: string
  bridgeContext?: string
  abandonedSessionContext?: string
}

/** @deprecated Use ILLUSION_NAMES instead */
export const MYTH_NAMES = ILLUSION_NAMES
/** @deprecated Use ILLUSION_OPENING_MESSAGES instead */
export const MYTH_OPENING_MESSAGES = ILLUSION_OPENING_MESSAGES
/** @deprecated Use getIllusionOpening instead */
export const getMythOpening = getIllusionOpening
