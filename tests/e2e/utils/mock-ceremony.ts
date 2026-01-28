import type { Page } from '@playwright/test'
import type { CapturedMoment, IllusionCheatSheetEntry } from '../../../server/utils/llm/task-types'

export interface MockCeremonyPrepareOptions {
  ready?: boolean
  ceremonyCompleted?: boolean
  illusionsCompleted?: string[]
  totalMoments?: number
  suggestedMoments?: CapturedMoment[]
  originSummary?: string
}

export interface PlaylistSegment {
  id: string
  type: 'narration' | 'user_moment'
  text: string
  transcript: string
  moment_id?: string
  audio_generated: boolean
}

const DEFAULT_CEREMONY_PREPARE: MockCeremonyPrepareOptions = {
  ready: true,
  ceremonyCompleted: false,
  illusionsCompleted: ['stress_relief', 'pleasure', 'willpower', 'focus', 'identity'],
  totalMoments: 5,
  suggestedMoments: [],
  originSummary: 'Started vaping to cope with stress at work.',
}

/**
 * Create a mock CapturedMoment object
 */
function createMockMoment(id: string, momentType: string, transcript: string): CapturedMoment {
  const now = new Date().toISOString()
  return {
    id,
    userId: 'mock-user-id',
    conversationId: 'mock-conversation-id',
    messageId: 'mock-message-id',
    momentType: momentType as any,
    transcript,
    audioClipPath: null,
    audioDurationMs: null,
    illusionKey: 'stress_relief',
    sessionType: 'core',
    illusionLayer: 'emotional',
    confidenceScore: 0.9,
    emotionalValence: 'positive',
    isUserHighlighted: false,
    timesPlayedBack: 0,
    lastUsedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Mock the /api/ceremony/prepare endpoint
 */
export async function mockCeremonyPrepare(
  page: Page,
  options: MockCeremonyPrepareOptions = {}
): Promise<void> {
  const merged = { ...DEFAULT_CEREMONY_PREPARE, ...options }

  // Create default suggested moments if none provided
  const suggestedMoments = merged.suggestedMoments || [
    createMockMoment('moment-1', 'origin_story', 'I started vaping to cope with stress.'),
    createMockMoment('moment-2', 'insight', 'I realized nicotine never actually helped my stress.'),
    createMockMoment('moment-3', 'commitment', 'I am ready to live without nicotine.'),
  ]

  await page.route('**/api/ceremony/prepare', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ready: merged.ready,
        ceremony_completed: merged.ceremonyCompleted,
        user_story: {
          id: 'mock-user-story-id',
          origin_summary: merged.originSummary,
          primary_triggers: ['morning', 'stress'],
          personal_stakes: ['health', 'finances'],
          // ceremony_completed_at comes from user_progress per ADR-004
          ceremony_completed_at: merged.ceremonyCompleted ? new Date().toISOString() : null,
        },
        moments_by_type: {
          origin_story: [suggestedMoments[0]],
          rationalization: [],
          insight: [suggestedMoments[1]],
          emotional_breakthrough: [],
          real_world_observation: [],
          identity_statement: [],
          commitment: [suggestedMoments[2]],
          fear_resistance: [],
        },
        illusions_completed: merged.illusionsCompleted,
        total_moments: merged.totalMoments,
        suggested_journey_moments: suggestedMoments,
      }),
    })
  })
}

/**
 * Mock the /api/ceremony/generate-journey endpoint
 */
export async function mockCeremonyGenerateJourney(
  page: Page,
  segments: PlaylistSegment[] = [
    {
      id: 'seg-1',
      type: 'narration',
      text: 'Your journey begins with understanding where you came from.',
      transcript: 'Your journey begins with understanding where you came from.',
      audio_generated: false,
    },
    {
      id: 'seg-2',
      type: 'user_moment',
      text: 'I started vaping to cope with stress.',
      transcript: 'I started vaping to cope with stress.',
      moment_id: 'moment-1',
      audio_generated: false,
    },
    {
      id: 'seg-3',
      type: 'narration',
      text: 'And now you see the truth.',
      transcript: 'And now you see the truth.',
      audio_generated: false,
    },
  ]
): Promise<void> {
  await page.route('**/api/ceremony/generate-journey', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          journey_text: 'Your reflective journey begins...',
          playlist: {
            segments,
          },
          artifact_id: 'mock-artifact-id',
          selected_moment_count: segments.filter(s => s.type === 'user_moment').length,
        }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock the /api/ceremony/cheat-sheet endpoint
 */
export async function mockCeremonyCheatSheet(
  page: Page,
  entries: IllusionCheatSheetEntry[] = [
    {
      illusionKey: 'stress_relief',
      name: 'Stress Relief',
      illusion: 'Nicotine relieves stress',
      truth: 'Nicotine creates the stress cycle',
      userInsight: 'I realized nicotine never actually helped my stress.',
      insightMomentId: 'moment-2',
    },
    {
      illusionKey: 'pleasure',
      name: 'Pleasure',
      illusion: 'Nicotine provides pleasure',
      truth: 'Nicotine only relieves withdrawal',
      userInsight: 'The pleasure is just temporary relief from withdrawal.',
    },
    {
      illusionKey: 'willpower',
      name: 'Willpower',
      illusion: 'Quitting requires willpower',
      truth: 'Understanding removes the desire',
      userInsight: 'I don\'t need willpower when I see through the illusion.',
    },
    {
      illusionKey: 'focus',
      name: 'Focus',
      illusion: 'Nicotine improves focus',
      truth: 'Nicotine disrupts natural focus',
      userInsight: 'My focus was better before I started using.',
    },
    {
      illusionKey: 'identity',
      name: 'Identity',
      illusion: 'Nicotine defines who I am',
      truth: 'I am whole without it',
      userInsight: 'I am complete without nicotine.',
    },
  ]
): Promise<void> {
  const now = new Date().toISOString()

  await page.route('**/api/ceremony/cheat-sheet', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        artifact_id: 'mock-cheat-sheet-artifact-id',
        cheat_sheet: {
          entries,
          generatedAt: now,
        },
        generated_at: now,
        is_final: false,
      }),
    })
  })
}

/**
 * Mock the /api/ceremony/complete endpoint
 */
export async function mockCeremonyComplete(page: Page): Promise<void> {
  const completedAt = new Date().toISOString()

  await page.route('**/api/ceremony/complete', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ceremony_completed_at: completedAt,
          already_quit: false,
          artifacts: {
            reflective_journey: {
              id: 'mock-journey-artifact-id',
              artifact_type: 'reflective_journey',
              ceremony_completed_at: completedAt,
            },
            illusions_cheat_sheet: {
              id: 'mock-cheat-sheet-artifact-id',
              artifact_type: 'illusions_cheat_sheet',
              ceremony_completed_at: completedAt,
            },
            final_recording: {
              id: 'mock-recording-artifact-id',
              artifact_type: 'final_recording',
              ceremony_completed_at: completedAt,
            },
          },
          follow_ups_scheduled: [
            { milestone_type: 'day_3', scheduled_for: new Date(Date.now() + 3 * 86400000).toISOString() },
            { milestone_type: 'day_7', scheduled_for: new Date(Date.now() + 7 * 86400000).toISOString() },
          ],
        }),
      })
    } else {
      await route.continue()
    }
  })
}
