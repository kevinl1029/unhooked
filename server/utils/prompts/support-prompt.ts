/**
 * Support Conversation Prompt Builder
 * Builds system prompts for "I'm struggling" and "Need a boost" conversations
 */

interface SupportContext {
  background: {
    productTypes: string[]
    usageFrequency: string
    yearsUsing?: number
    previousAttempts?: number
    triggers?: string[]
    primaryReason?: string
  } | null
  originSummary: string | null
  convictions: Record<string, number | null> | null
  keyInsights: Array<{ illusionKey: string; transcript: string }>
  recentMoments: Array<{ moment_type: string; transcript: string; illusion_key: string }>
  personalStakes: string[]
  primaryTriggers: string[]
  ceremonyCompleted: boolean
  alreadyQuit: boolean
}

export type SupportMode = 'struggling' | 'boost'

const BASE_SUPPORT_PROMPT = `You are a supportive coach helping someone who has completed the Unhooked program for nicotine cessation.

Your role is to:
- Listen with empathy and without judgment
- Remind them of their own insights and breakthroughs
- Help them reconnect with their reasons for quitting
- Offer practical coping strategies when appropriate
- Never lecture or moralize

Key principles:
- Use their own words when possible (from their captured moments)
- Be warm, conversational, and human
- Keep responses concise and supportive
- Ask follow-up questions to understand their situation

You are NOT a medical professional. If someone mentions severe withdrawal, relapse, or mental health concerns, encourage them to seek professional support.`

const STRUGGLING_INTRO = `The user reached out because they're struggling with cravings or difficult moments. They need support right now.

Start by acknowledging they reached out - that takes courage. Then gently ask what's going on.`

const BOOST_INTRO = `The user wants a motivational boost or reminder of why they quit. They're proactively seeking reinforcement.

Start with encouragement and remind them of their journey and insights.`

/**
 * Build the support conversation system prompt
 */
export function buildSupportPrompt(context: SupportContext, mode: SupportMode): string {
  let prompt = BASE_SUPPORT_PROMPT

  // Add mode-specific intro
  prompt += '\n\n## This Conversation\n'
  prompt += mode === 'struggling' ? STRUGGLING_INTRO : BOOST_INTRO

  // Add user background
  if (context.background) {
    prompt += '\n\n## User Background\n'
    prompt += `- Products: ${context.background.productTypes?.join(', ') || 'Unknown'}\n`
    prompt += `- Usage: ${context.background.usageFrequency || 'Unknown'}\n`
    if (context.background.yearsUsing) {
      prompt += `- Years using: ${context.background.yearsUsing}\n`
    }
    if (context.background.primaryReason) {
      prompt += `- Primary reason for quitting: ${context.background.primaryReason}\n`
    }
  }

  // Add origin story
  if (context.originSummary) {
    prompt += '\n\n## Their Story\n'
    prompt += context.originSummary
  }

  // Add personal stakes and triggers
  if (context.personalStakes.length > 0) {
    prompt += '\n\n## What\'s At Stake For Them\n'
    prompt += context.personalStakes.map(s => `- ${s}`).join('\n')
  }

  if (context.primaryTriggers.length > 0) {
    prompt += '\n\n## Their Known Triggers\n'
    prompt += context.primaryTriggers.map(t => `- ${t}`).join('\n')
  }

  // Add key insights (most powerful)
  if (context.keyInsights.length > 0) {
    prompt += '\n\n## Their Key Insights (Use These!)\n'
    prompt += 'These are breakthrough moments from their journey. Reference them naturally:\n\n'
    for (const insight of context.keyInsights) {
      prompt += `[${insight.illusionKey}]: "${insight.transcript}"\n`
    }
  }

  // Add recent moments for additional context
  if (context.recentMoments.length > 0) {
    prompt += '\n\n## Recent Reflections\n'
    const uniqueMoments = context.recentMoments.slice(0, 5)
    for (const moment of uniqueMoments) {
      prompt += `- "${moment.transcript}"\n`
    }
  }

  // Add ceremony status
  if (context.ceremonyCompleted) {
    prompt += '\n\n## Journey Status\n'
    prompt += 'This user has completed their ceremony and is now in reinforcement mode. '
    if (context.alreadyQuit) {
      prompt += 'They quit organically before the ceremony - celebrate this!'
    }
  }

  return prompt
}
