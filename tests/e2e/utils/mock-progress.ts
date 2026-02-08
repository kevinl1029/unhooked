import type { Page } from '@playwright/test'
import { MOCK_USER } from './mock-auth'

export interface MockProgressOptions {
  programStatus?: 'not_started' | 'in_progress' | 'completed'
  currentIllusion?: number
  illusionsCompleted?: number[]
  illusionOrder?: number[]
  totalSessions?: number
}

export interface MockIntakeOptions {
  productTypes?: string[]
  usageFrequency?: string
  primaryReason?: string
  triggers?: string[]
}

const DEFAULT_PROGRESS: MockProgressOptions = {
  programStatus: 'in_progress',
  currentIllusion: 1,
  illusionsCompleted: [],
  illusionOrder: [1, 2, 3, 4, 5],
  totalSessions: 0,
}

const DEFAULT_INTAKE: MockIntakeOptions = {
  productTypes: ['vape'],
  usageFrequency: 'multiple_daily',
  primaryReason: 'stress',
  triggers: ['morning', 'after_meals'],
}

const ILLUSION_KEY_TO_NUMBER: Record<string, number> = {
  stress_relief: 1,
  pleasure: 2,
  willpower: 3,
  focus: 4,
  identity: 5,
}

/**
 * Create a full mock progress object
 */
function createMockProgress(options: MockProgressOptions = {}) {
  const merged = { ...DEFAULT_PROGRESS, ...options }
  const now = new Date().toISOString()

  return {
    id: 'mock-progress-id',
    user_id: MOCK_USER.id,
    program_status: merged.programStatus,
    current_illusion: merged.currentIllusion,
    illusion_order: merged.illusionOrder,
    illusions_completed: merged.illusionsCompleted,
    total_sessions: merged.totalSessions,
    last_reminded_at: null,
    started_at: merged.programStatus !== 'not_started' ? now : null,
    completed_at: merged.programStatus === 'completed' ? now : null,
    last_session_at: merged.totalSessions! > 0 ? now : null,
    created_at: now,
    updated_at: now,
  }
}

/**
 * Create a full mock intake object
 */
function createMockIntake(options: MockIntakeOptions = {}) {
  const merged = { ...DEFAULT_INTAKE, ...options }
  const now = new Date().toISOString()

  return {
    id: 'mock-intake-id',
    user_id: MOCK_USER.id,
    product_types: merged.productTypes,
    usage_frequency: merged.usageFrequency,
    years_using: null,
    previous_attempts: 1,
    longest_quit: null,
    primary_reason: merged.primaryReason,
    triggers: merged.triggers,
    created_at: now,
    updated_at: now,
  }
}

/**
 * Mock the /api/progress endpoint
 */
export async function mockProgressAPI(
  page: Page,
  options: MockProgressOptions = {}
): Promise<void> {
  const mockProgress = createMockProgress(options)

  await page.route('**/api/progress', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProgress),
      })
    } else {
      await route.continue()
    }
  })

  // Mock complete-session endpoint
  await page.route('**/api/progress/complete-session', async (route) => {
    const body = route.request().postDataJSON() as {
      conversationId?: string
      illusionKey?: string
      illusionNumber?: number
    }

    if (body?.illusionNumber !== undefined) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'illusionNumber is no longer supported. Send illusionKey instead.',
        }),
      })
      return
    }

    if (!body?.illusionKey || ILLUSION_KEY_TO_NUMBER[body.illusionKey] === undefined) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'illusionKey is required',
        }),
      })
      return
    }

    const completedIllusionNumber = ILLUSION_KEY_TO_NUMBER[body.illusionKey]
    const updatedProgress = {
      ...mockProgress,
      illusions_completed: [...(options.illusionsCompleted || []), completedIllusionNumber],
      total_sessions: (options.totalSessions || 0) + 1,
    }

    const nextIllusion = updatedProgress.illusion_order.find(
      (m: number) => !updatedProgress.illusions_completed.includes(m)
    )

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        progress: updatedProgress,
        nextIllusion: nextIllusion || null,
        isComplete: updatedProgress.illusions_completed.length >= 5,
      }),
    })
  })
}

/**
 * Mock the /api/intake endpoint
 */
export async function mockIntakeAPI(
  page: Page,
  options: MockIntakeOptions = {}
): Promise<void> {
  const mockIntake = createMockIntake(options)

  await page.route('**/api/intake', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockIntake),
      })
    } else if (route.request().method() === 'POST') {
      // Simulate successful intake submission
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          intake: mockIntake,
          progress: createMockProgress({ programStatus: 'in_progress' }),
        }),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock intake as not existing (for onboarding tests)
 */
export async function mockNoIntake(page: Page): Promise<void> {
  await page.route('**/api/intake', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Mock progress as not existing (for new user tests)
 */
export async function mockNoProgress(page: Page): Promise<void> {
  await page.route('**/api/progress', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      })
    } else {
      await route.continue()
    }
  })
}

/**
 * Convenience: Mock both intake and progress for a user in progress
 */
export async function mockUserInProgress(
  page: Page,
  progressOptions: MockProgressOptions = {},
  intakeOptions: MockIntakeOptions = {}
): Promise<void> {
  await mockProgressAPI(page, progressOptions)
  await mockIntakeAPI(page, intakeOptions)
}

/**
 * Convenience: Mock a new user who hasn't completed onboarding
 */
export async function mockNewUser(page: Page): Promise<void> {
  await mockNoIntake(page)
  await mockNoProgress(page)
}
