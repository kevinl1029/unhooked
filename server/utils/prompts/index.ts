// Prompt builder utilities for myth-focused sessions
import { BASE_SYSTEM_PROMPT, buildPersonalizationContext as buildPersonalization } from './base-system'
import type { UserContext } from './base-system'
import { MYTH_1_STRESS_PROMPT } from './myths/myth-1-stress'
import { MYTH_2_PLEASURE_PROMPT } from './myths/myth-2-pleasure'
import { MYTH_3_WILLPOWER_PROMPT } from './myths/myth-3-willpower'
import { MYTH_4_FOCUS_PROMPT } from './myths/myth-4-focus'
import { MYTH_5_IDENTITY_PROMPT } from './myths/myth-5-identity'

export type { UserContext }

export const MYTH_NAMES: Record<number, string> = {
  1: 'The Stress Myth',
  2: 'The Pleasure Myth',
  3: 'The Willpower Myth',
  4: 'The Focus Myth',
  5: 'The Identity Myth',
}

const MYTH_PROMPTS: Record<number, string> = {
  1: MYTH_1_STRESS_PROMPT,
  2: MYTH_2_PLEASURE_PROMPT,
  3: MYTH_3_WILLPOWER_PROMPT,
  4: MYTH_4_FOCUS_PROMPT,
  5: MYTH_5_IDENTITY_PROMPT,
}

export function buildSystemPrompt(mythNumber: number, userContext?: UserContext, isNewConversation = false): string {
  let prompt = BASE_SYSTEM_PROMPT

  if (userContext) {
    prompt += buildPersonalization(userContext)
  }

  const mythPrompt = MYTH_PROMPTS[mythNumber]
  if (mythPrompt) {
    prompt += '\n\n' + mythPrompt
  }

  // Add opening instruction for new conversations
  if (isNewConversation) {
    const openingMessage = MYTH_OPENING_MESSAGES[mythNumber]
    if (openingMessage) {
      prompt += '\n\n## Starting This Session\n\n'
      prompt += 'This is the beginning of this myth session. Start the conversation with this opening:\n\n'
      prompt += `"${openingMessage}"\n\n`
      prompt += 'Use this as your first message to welcome them and begin exploring this myth.'
    }
  }

  return prompt
}

export function buildPersonalizationContext(userContext: UserContext): string {
  return buildPersonalization(userContext)
}

// Opening messages for each myth session
// These are shown immediately when user enters a session, creating the first exchange
export const MYTH_OPENING_MESSAGES: Record<number, string> = {
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

// Get the opening greeting for a specific myth
export function getMythOpening(mythNumber: number): string {
  return MYTH_OPENING_MESSAGES[mythNumber] || `Let's explore ${MYTH_NAMES[mythNumber]} together. What brings you to this session?`
}
