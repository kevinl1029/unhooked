import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useProgress, type Progress } from '~/composables/useProgress'

const mockProgress: Progress = {
  id: 'test-id',
  user_id: 'user-123',
  program_status: 'in_progress',
  current_myth: 1,
  myth_order: [1, 2, 3, 4, 5],
  myths_completed: [1],
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

  describe('getNextMyth', () => {
    it('returns null when progress is not loaded', () => {
      const { getNextMyth } = useProgress()
      expect(getNextMyth()).toBeNull()
    })

    it('returns the first uncompleted myth from myth_order', () => {
      const { progress, getNextMyth } = useProgress()
      progress.value = mockProgress

      expect(getNextMyth()).toBe(2)
    })

    it('returns null when all myths are completed', () => {
      const { progress, getNextMyth } = useProgress()
      progress.value = {
        ...mockProgress,
        myths_completed: [1, 2, 3, 4, 5],
      }

      expect(getNextMyth()).toBeNull()
    })
  })

  describe('isMythCompleted', () => {
    it('returns false when progress is not loaded', () => {
      const { isMythCompleted } = useProgress()
      expect(isMythCompleted(1)).toBe(false)
    })

    it('returns true for completed myths', () => {
      const { progress, isMythCompleted } = useProgress()
      progress.value = mockProgress

      expect(isMythCompleted(1)).toBe(true)
    })

    it('returns false for uncompleted myths', () => {
      const { progress, isMythCompleted } = useProgress()
      progress.value = mockProgress

      expect(isMythCompleted(2)).toBe(false)
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
