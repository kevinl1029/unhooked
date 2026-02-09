import { describe, it, expect, vi } from 'vitest'
import {
  processScheduledCheckIns,
  shouldExpireUnsentCheckIn,
  UNSENT_CHECK_IN_EXPIRY_HOURS,
} from '~/server/utils/email/check-in-sender'

describe('check-in sender retry/expiry policy', () => {
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
    }

    const updatePayloads: Array<Record<string, unknown>> = []
    const updateIds: string[] = []

    const supabase = {
      from: (table: string) => {
        if (table === 'check_in_schedule') {
          return {
            select: () => ({
              eq: () => ({
                lte: () => Promise.resolve({ data: [staleCheckIn], error: null }),
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
})
