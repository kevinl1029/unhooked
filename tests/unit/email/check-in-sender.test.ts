import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  processScheduledCheckIns,
  shouldExpireUnsentCheckIn,
  UNSENT_CHECK_IN_EXPIRY_HOURS,
} from '~/server/utils/email/check-in-sender'

vi.mock('~/server/utils/email/resend-client', () => ({
  getResendClient: vi.fn(),
  getEmailSubject: vi.fn().mockReturnValue('Your check-in'),
}))

const { getResendClient } = await import('~/server/utils/email/resend-client')

function makeFreshCheckIn(overrides: Partial<{
  id: string
  user_id: string
  check_in_type: string
  retry_count: number
  scheduled_for: string
}> = {}) {
  return {
    id: 'checkin-1',
    user_id: 'user-1',
    check_in_type: 'morning',
    magic_link_token: 'token-abc',
    scheduled_for: '2026-02-16T10:00:00Z',
    prompt_template: null,
    observation_assignment: null,
    retry_count: 0,
    ...overrides,
  }
}

function makeSupabaseMock(checkIns: unknown[], updateSpy?: (payload: unknown, id: string) => void) {
  return {
    from: (table: string) => {
      if (table === 'check_in_schedule') {
        return {
          select: () => ({
            eq: () => ({
              lte: () => ({
                lt: () => Promise.resolve({ data: checkIns, error: null }),
              }),
            }),
          }),
          update: (payload: unknown) => ({
            eq: (_field: string, id: string) => {
              updateSpy?.(payload, id)
              return Promise.resolve({ error: null })
            },
          }),
        }
      }
      if (table === 'auth.users') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: null, error: { message: 'not found' } }),
            }),
          }),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    },
    auth: {
      admin: {
        getUserById: () => Promise.resolve({ data: { user: { email: 'user@example.com' } }, error: null }),
      },
    },
  } as any
}

describe('check-in sender retry/expiry policy', () => {
  beforeEach(() => {
    vi.mocked(getResendClient).mockReset()
  })
  it('expires unsent check-ins at 48h threshold', () => {
    const now = new Date('2026-02-09T12:00:00Z')
    const fortySevenHoursAgo = new Date(now.getTime() - 47 * 60 * 60 * 1000)
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    expect(UNSENT_CHECK_IN_EXPIRY_HOURS).toBe(48)
    expect(shouldExpireUnsentCheckIn(fortySevenHoursAgo, now)).toBe(false)
    expect(shouldExpireUnsentCheckIn(fortyEightHoursAgo, now)).toBe(true)
  })

  it('marks stale scheduled check-ins as expired instead of attempting send', async () => {
    const staleCheckIn = {
      id: 'checkin-stale-1',
      user_id: 'user-1',
      check_in_type: 'evidence_bridge',
      magic_link_token: 'token',
      scheduled_for: '2026-02-07T11:59:59Z',
      prompt_template: 'What did you observe?',
      observation_assignment: 'Notice your stress pattern',
      retry_count: 0,
    }

    const updatePayloads: Array<Record<string, unknown>> = []
    const updateIds: string[] = []

    const supabase = {
      from: (table: string) => {
        if (table === 'check_in_schedule') {
          return {
            select: () => ({
              eq: () => ({
                lte: () => ({
                  lt: () => Promise.resolve({ data: [staleCheckIn], error: null }),
                }),
              }),
            }),
            update: (payload: Record<string, unknown>) => {
              updatePayloads.push(payload)
              return {
                eq: (_field: string, id: string) => {
                  updateIds.push(id)
                  return Promise.resolve({ error: null })
                },
              }
            },
          }
        }

        throw new Error(`Unexpected table: ${table}`)
      },
    } as any

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-02-09T12:00:00Z'))

    const result = await processScheduledCheckIns(supabase)

    vi.useRealTimers()

    expect(result.processed).toBe(1)
    expect(result.sent).toBe(0)
    expect(result.errors).toEqual([])

    expect(updateIds).toEqual(['checkin-stale-1'])
    expect(updatePayloads).toHaveLength(1)
    expect(updatePayloads[0].status).toBe('expired')
    expect(typeof updatePayloads[0].expired_at).toBe('string')
  })

  it('increments retry_count and keeps status scheduled on first failure', async () => {
    vi.mocked(getResendClient).mockReturnValue({
      emails: { send: vi.fn().mockResolvedValue({ error: { message: 'Resend unavailable' } }) },
    } as any)

    const checkIn = makeFreshCheckIn({ retry_count: 0 })
    const updates: Array<{ payload: unknown; id: string }> = []
    const supabase = makeSupabaseMock([checkIn], (payload, id) => updates.push({ payload, id }))

    const result = await processScheduledCheckIns(supabase)

    expect(result.errors).toHaveLength(1)
    expect(updates).toHaveLength(1)
    expect((updates[0].payload as any).retry_count).toBe(1)
    expect((updates[0].payload as any).status).toBeUndefined()
  })

  it('sets status to failed when retry_count reaches 3', async () => {
    vi.mocked(getResendClient).mockReturnValue({
      emails: { send: vi.fn().mockResolvedValue({ error: { message: 'Resend unavailable' } }) },
    } as any)

    const checkIn = makeFreshCheckIn({ retry_count: 2 })
    const updates: Array<{ payload: unknown; id: string }> = []
    const supabase = makeSupabaseMock([checkIn], (payload, id) => updates.push({ payload, id }))

    const result = await processScheduledCheckIns(supabase)

    expect(result.errors).toHaveLength(1)
    expect(updates).toHaveLength(1)
    expect((updates[0].payload as any).retry_count).toBe(3)
    expect((updates[0].payload as any).status).toBe('failed')
  })
})
