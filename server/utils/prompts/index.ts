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

export function buildSystemPrompt(mythNumber: number, userContext?: UserContext): string {
  let prompt = BASE_SYSTEM_PROMPT

  if (userContext) {
    prompt += buildPersonalization(userContext)
  }

  const mythPrompt = MYTH_PROMPTS[mythNumber]
  if (mythPrompt) {
    prompt += '\n\n' + mythPrompt
  }

  return prompt
}

export function buildPersonalizationContext(userContext: UserContext): string {
  return buildPersonalization(userContext)
}
