/**
 * Bridge Message Builder
 * Creates context for AI to acknowledge previous session when user continues
 */

import type { CrossLayerContext } from '../personalization/cross-layer-context'

/**
 * Build bridge context instruction for AI's first message
 * This instructs the AI to acknowledge the user's previous session naturally
 */
export function buildBridgeContext(crossLayerContext: CrossLayerContext): string {
  if (crossLayerContext.previousLayerInsights.length === 0) {
    return ''
  }

  const lastInsight = crossLayerContext.previousLayerInsights[crossLayerContext.previousLayerInsights.length - 1]

  let bridgeText = `
The user is continuing from a previous session on this illusion.
Last time, they expressed: "${lastInsight.quote}"
`

  if (crossLayerContext.breakthroughs.length > 0) {
    bridgeText += `They had a breakthrough: "${crossLayerContext.breakthroughs[0]}"\n`
  }

  if (crossLayerContext.resistancePoints.length > 0) {
    bridgeText += `They showed some resistance around: "${crossLayerContext.resistancePoints[0]}"\n`
  }

  if (crossLayerContext.convictionAtPreviousLayers.length > 0) {
    const latest = crossLayerContext.convictionAtPreviousLayers[crossLayerContext.convictionAtPreviousLayers.length - 1]
    bridgeText += `Their conviction after last session was ${latest.conviction}/10.\n`
  }

  bridgeText += `
Acknowledge their progress naturally in your opening. Reference what they said or realized in your own words.
Don't say "last time you said..." — instead, weave their insight into your opening naturally.
`

  return bridgeText
}

/**
 * Build bridge context for abandoned session
 * When user returns after abandoning, we want to acknowledge but not dwell on it
 */
export function buildAbandonedSessionBridge(
  priorMoments: Array<{ transcript: string; moment_type: string }>
): string {
  if (priorMoments.length === 0) {
    return ''
  }

  const insights = priorMoments.filter(m => m.moment_type === 'insight')
  const hasInsight = insights.length > 0

  if (hasInsight) {
    return `
The user started a session before but didn't finish. They expressed this insight: "${insights[0].transcript}"
Build on this naturally without mentioning the previous session was incomplete.
`
  }

  // If they had some other moment type captured
  const anyMoment = priorMoments[0]
  return `
The user started a session before but didn't finish. They said: "${anyMoment.transcript}"
Build on what they shared naturally without mentioning the previous session was incomplete.
`
}

/**
 * Static transition messages for session completion UI
 */
export const TRANSITION_MESSAGES = {
  // After completing any layer
  layerComplete: {
    title: 'Session Complete',
    subtitle: 'Nice work. Let that settle.',
    continueButton: 'Continue to Next Session',
    dashboardButton: 'Return to Dashboard',
  },

  // After completing all 3 layers of an illusion
  illusionComplete: {
    title: 'Illusion Explored',
    getSubtitle: (illusionsRemaining: number) =>
      illusionsRemaining > 0
        ? `${illusionsRemaining} more to go.`
        : "You've explored all the illusions.",
    continueButton: 'Continue to Next Illusion',
    dashboardButton: 'Return to Dashboard',
  },

  // When all illusions are done, ready for ceremony
  ceremonyReady: {
    title: "You're Ready",
    subtitle: 'All illusions explored. Time for the final step.',
    continueButton: 'Begin Ceremony',
    dashboardButton: 'Return to Dashboard',
  },
} as const

/**
 * Get the appropriate transition message based on progress
 */
export function getTransitionMessage(
  currentIllusionIndex: number, // 0-4
  currentLayerIndex: number, // 0-2
  totalIllusions: number = 5,
  totalLayers: number = 3
): {
  title: string
  subtitle: string
  continueButton: string
  dashboardButton: string
  type: 'layer' | 'illusion' | 'ceremony'
} {
  const isLastLayer = currentLayerIndex === totalLayers - 1
  const isLastIllusion = currentIllusionIndex === totalIllusions - 1

  // All illusions complete
  if (isLastLayer && isLastIllusion) {
    return {
      ...TRANSITION_MESSAGES.ceremonyReady,
      type: 'ceremony',
    }
  }

  // Illusion complete (layer 3 done)
  if (isLastLayer) {
    const illusionsRemaining = totalIllusions - currentIllusionIndex - 1
    return {
      ...TRANSITION_MESSAGES.illusionComplete,
      subtitle: TRANSITION_MESSAGES.illusionComplete.getSubtitle(illusionsRemaining),
      type: 'illusion',
    }
  }

  // Just a layer complete
  return {
    ...TRANSITION_MESSAGES.layerComplete,
    type: 'layer',
  }
}
