import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserStatus } from '~/composables/useUserStatus'

describe('useUserStatus', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', mockFetch)
  })

  it('preserves layer_progress from /api/user/status payload', async () => {
    mockFetch.mockResolvedValueOnce({
      phase: 'in_progress',
      progress: {
        program_status: 'in_progress',
        current_illusion: 1,
        illusions_completed: [],
        illusion_order: [1, 2, 3, 4, 5],
        layer_progress: {
          stress_relief: ['intellectual', 'emotional'],
        },
        total_sessions: 2,
        started_at: '2026-02-01T00:00:00.000Z',
      },
      ceremony: null,
      artifacts: null,
      pending_follow_ups: null,
      next_session: { illusionNumber: 1 },
    })

    const { fetchStatus, status } = useUserStatus()
    await fetchStatus()

    expect(status.value?.progress?.layer_progress.stress_relief).toEqual([
      'intellectual',
      'emotional',
    ])
  })
})
