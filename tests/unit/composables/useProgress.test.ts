import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProgress, type Progress } from '~/composables/useProgress'

const mockProgress: Progress = {
  id: 'test-id',
  user_id: 'user-123',
  program_status: 'in_progress',
  current_illusion: 1,
  illusion_order: [1, 2, 3, 4, 5],
  illusions_completed: [1],
  total_sessions: 3,
  last_reminded_at: null,
  started_at: '2024-01-01T00:00:00Z',
  completed_at: null,
  last_session_at: '2024-01-02T00:00:00Z',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
}

describe('useProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getNextIllusion', () => {
    it('returns null when progress is not loaded', () => {
      const { getNextIllusion } = useProgress()
      expect(getNextIllusion()).toBeNull()
    })

    it('returns the first uncompleted illusion from illusion_order', () => {
      const { progress, getNextIllusion } = useProgress()
      progress.value = mockProgress

      expect(getNextIllusion()).toBe(2)
    })

    it('returns null when all illusions are completed', () => {
      const { progress, getNextIllusion } = useProgress()
      progress.value = {
        ...mockProgress,
        illusions_completed: [1, 2, 3, 4, 5],
      }

      expect(getNextIllusion()).toBeNull()
    })
  })

  describe('isIllusionCompleted', () => {
    it('returns false when progress is not loaded', () => {
      const { isIllusionCompleted } = useProgress()
      expect(isIllusionCompleted(1)).toBe(false)
    })

    it('returns true for completed illusions', () => {
      const { progress, isIllusionCompleted } = useProgress()
      progress.value = mockProgress

      expect(isIllusionCompleted(1)).toBe(true)
    })

    it('returns false for uncompleted illusions', () => {
      const { progress, isIllusionCompleted } = useProgress()
      progress.value = mockProgress

      expect(isIllusionCompleted(2)).toBe(false)
    })
  })

  describe('initial state', () => {
    it('has correct initial values', () => {
      const { progress, isLoading, error } = useProgress()

      expect(progress.value).toBeNull()
      expect(isLoading.value).toBe(false)
      expect(error.value).toBeNull()
    })
  })
})
