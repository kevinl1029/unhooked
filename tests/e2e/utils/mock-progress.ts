import type { Page } from '@playwright/test'
import { MOCK_USER } from './mock-auth'

export interface MockProgressOptions {
  programStatus?: 'not_started' | 'in_progress' | 'completed'
  currentMyth?: number
  mythsCompleted?: number[]
  mythOrder?: number[]
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
  currentMyth: 1,
  mythsCompleted: [],
  mythOrder: [1, 2, 3, 4, 5],
  totalSessions: 0,
}

const DEFAULT_INTAKE: MockIntakeOptions = {
  productTypes: ['vape'],
  usageFrequency: 'multiple_daily',
  primaryReason: 'stress',
  triggers: ['morning', 'after_meals'],
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
    current_myth: merged.currentMyth,
    myth_order: merged.mythOrder,
    myths_completed: merged.mythsCompleted,
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
    const updatedProgress = {
      ...mockProgress,
      myths_completed: [...(options.mythsCompleted || []), options.currentMyth || 1],
      total_sessions: (options.totalSessions || 0) + 1,
    }

    const nextMyth = updatedProgress.myth_order.find(
      (m: number) => !updatedProgress.myths_completed.includes(m)
    )

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        progress: updatedProgress,
        nextMyth: nextMyth || null,
        isComplete: updatedProgress.myths_completed.length >= 5,
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
