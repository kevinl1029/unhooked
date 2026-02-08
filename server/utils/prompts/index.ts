// Prompt builder utilities for illusion-focused sessions
// Note: BASE_SYSTEM_PROMPT, buildPersonalizationContext, and UserContext are NOT re-exported
// here to avoid Nuxt auto-import duplicate warnings. Import directly from './base-system' if needed.
import { BASE_SYSTEM_PROMPT, buildPersonalizationContext as buildPersonalization } from './base-system'
import type { UserContext } from './base-system'
import { ILLUSION_1_STRESS_PROMPT } from './illusions/illusion-1-stress'
import { ILLUSION_2_PLEASURE_PROMPT } from './illusions/illusion-2-pleasure'
import { ILLUSION_3_WILLPOWER_PROMPT } from './illusions/illusion-3-willpower'
import { ILLUSION_4_FOCUS_PROMPT } from './illusions/illusion-4-focus'
import { ILLUSION_5_IDENTITY_PROMPT } from './illusions/illusion-5-identity'
import type { IllusionKey } from '../llm/task-types'

// Extended options for buildSystemPrompt
export interface BuildSystemPromptOptions {
  illusionKey: IllusionKey
  userContext?: UserContext
  isNewConversation?: boolean
  // Phase 4C additions
  personalizationContext?: string  // From context-builder.ts
  bridgeContext?: string           // From bridge.ts
  abandonedSessionContext?: string // For abandoned session moments
}

export const ILLUSION_NAMES: Record<IllusionKey, string> = {
  stress_relief: 'The Stress Illusion',
  pleasure: 'The Pleasure Illusion',
  willpower: 'The Willpower Illusion',
  focus: 'The Focus Illusion',
  identity: 'The Identity Illusion',
}

const ILLUSION_PROMPTS: Record<IllusionKey, string> = {
  stress_relief: ILLUSION_1_STRESS_PROMPT,
  pleasure: ILLUSION_2_PLEASURE_PROMPT,
  willpower: ILLUSION_3_WILLPOWER_PROMPT,
  focus: ILLUSION_4_FOCUS_PROMPT,
  identity: ILLUSION_5_IDENTITY_PROMPT,
}

/**
 * Build system prompt with full personalization support
 * Supports both legacy signature and new options-based signature
 */
export function buildSystemPrompt(
  options: BuildSystemPromptOptions
): string {
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
  const illusionPrompt = ILLUSION_PROMPTS[options.illusionKey]
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
    const openingMessage = ILLUSION_OPENING_MESSAGES[options.illusionKey]
    if (openingMessage) {
      prompt += '\n\n## Starting This Session\n\n'
      prompt += 'This is the beginning of this illusion session. Start the conversation with this opening:\n\n'
      prompt += `"${openingMessage}"\n\n`
      prompt += 'Use this as your first message to welcome them and begin exploring this illusion.'
    }
  }

  return prompt
}

// Note: buildPersonalizationContext is NOT re-exported here to avoid Nuxt auto-import
// duplicate warnings. Import directly from './base-system' if needed.

// Opening messages for each illusion session
// These are shown immediately when user enters a session, creating the first exchange
export const ILLUSION_OPENING_MESSAGES: Record<IllusionKey, string> = {
  stress_relief: `Hey there. I want to explore something with you that might feel really true right now: the idea that nicotine helps with stress.

Before we dive in, I'm curious—what made you want to start with this one? When you think about nicotine and stress, what comes to mind?`,

  pleasure: `Welcome. Let's talk about pleasure and enjoyment.

A lot of people feel like nicotine genuinely gives them something pleasurable—like it's a reward or a treat. I want to understand your experience with that. When you think about "enjoying" nicotine, what does that actually feel like for you?`,

  willpower: `Hey. So this session is about the idea that quitting requires massive willpower and is incredibly hard.

I'm guessing you've either tried before and it felt brutal, or you've been putting it off because you're dreading how hard it'll be. Tell me—what's your relationship with that belief? What makes quitting feel so difficult?`,

  focus: `Welcome. Let's dig into something a lot of people tell me: "I need nicotine to focus" or "I can't function without it."

Does that resonate with you? When you're working, studying, or trying to get something done, what role does nicotine play for you?`,

  identity: `Hey. This session is a bit different—it's about identity. About beliefs like "I have an addictive personality" or "I'm just wired differently" or "I'm not like other people who can quit easily."

Do any of those thoughts sound familiar? What do you believe about yourself when it comes to nicotine and quitting?`
}

// Get the opening greeting for a specific illusion
export function getIllusionOpening(illusionKey: IllusionKey): string {
  return ILLUSION_OPENING_MESSAGES[illusionKey] || `Let's explore ${ILLUSION_NAMES[illusionKey]} together. What brings you to this session?`
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
