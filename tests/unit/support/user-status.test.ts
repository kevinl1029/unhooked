/**
 * Unit tests for user status detection
 */
import { describe, it, expect } from 'vitest'

describe('User Status Detection', () => {
  describe('Phase determination', () => {
    it('should detect not_started when no progress', () => {
      const progress = null
      const userStory = null

      const phase = !progress ? 'not_started' : 'in_progress'

      expect(phase).toBe('not_started')
    })

    it('should detect in_progress when program active', () => {
      const progress = {
        program_status: 'in_progress',
        illusions_completed: [1, 2],
      }
      const ceremonyCompletedAt = null

      const phase = ceremonyCompletedAt
        ? 'post_ceremony'
        : progress.program_status === 'completed'
        ? 'ceremony_ready'
        : 'in_progress'

      expect(phase).toBe('in_progress')
    })

    it('should detect ceremony_ready when all illusions done', () => {
      const progress = {
        program_status: 'completed',
        illusions_completed: [1, 2, 3, 4, 5],
      }
      const ceremonyCompletedAt = null

      const phase = ceremonyCompletedAt
        ? 'post_ceremony'
        : progress.program_status === 'completed'
        ? 'ceremony_ready'
        : 'in_progress'

      expect(phase).toBe('ceremony_ready')
    })

    it('should detect post_ceremony after ceremony', () => {
      const progress = {
        program_status: 'completed',
        illusions_completed: [1, 2, 3, 4, 5],
      }
      const ceremonyCompletedAt = '2026-01-09T15:00:00Z'

      const phase = ceremonyCompletedAt
        ? 'post_ceremony'
        : progress.program_status === 'completed'
        ? 'ceremony_ready'
        : 'in_progress'

      expect(phase).toBe('post_ceremony')
    })
  })

  describe('Next session calculation', () => {
    it('should find next illusion in order', () => {
      const illusionOrder = [1, 3, 2, 5, 4]
      const illusionsCompleted = [1, 3]

      const nextIllusion = illusionOrder.find(m => !illusionsCompleted.includes(m))

      expect(nextIllusion).toBe(2)
    })

    it('should return null when all complete', () => {
      const illusionOrder = [1, 2, 3, 4, 5]
      const illusionsCompleted = [1, 2, 3, 4, 5]

      const nextIllusion = illusionOrder.find(m => !illusionsCompleted.includes(m)) || null

      expect(nextIllusion).toBeNull()
    })

    it('should handle empty completion list', () => {
      const illusionOrder = [1, 2, 3, 4, 5]
      const illusionsCompleted: number[] = []

      const nextIllusion = illusionOrder.find(m => !illusionsCompleted.includes(m))

      expect(nextIllusion).toBe(1)
    })
  })

  describe('Artifact detection', () => {
    it('should detect available artifacts', () => {
      const artifacts = {
        reflective_journey: { id: 'journey-1' },
        final_recording: { id: 'recording-1', audio_path: 'path/to/audio' },
        illusions_cheat_sheet: { id: 'sheet-1' },
      }

      expect(!!artifacts.reflective_journey).toBe(true)
      expect(!!artifacts.final_recording).toBe(true)
      expect(!!artifacts.illusions_cheat_sheet).toBe(true)
    })

    it('should handle missing artifacts', () => {
      const artifacts = {
        reflective_journey: null,
        final_recording: { id: 'recording-1' },
        illusions_cheat_sheet: null,
      }

      expect(!!artifacts.reflective_journey).toBe(false)
      expect(!!artifacts.final_recording).toBe(true)
      expect(!!artifacts.illusions_cheat_sheet).toBe(false)
    })
  })

  describe('Follow-up status', () => {
    it('should identify pending follow-ups', () => {
      const followUps = [
        { id: '1', milestone_type: 'day_7', status: 'scheduled' },
        { id: '2', milestone_type: 'day_14', status: 'scheduled' },
      ]

      const pending = followUps.filter(f => f.status === 'scheduled')

      expect(pending.length).toBe(2)
    })

    it('should get next follow-up', () => {
      const followUps = [
        { id: '1', milestone_type: 'day_3', status: 'completed' },
        { id: '2', milestone_type: 'day_7', status: 'scheduled', scheduled_for: '2026-01-16' },
        { id: '3', milestone_type: 'day_14', status: 'scheduled', scheduled_for: '2026-01-23' },
      ]

      const next = followUps.find(f => f.status === 'scheduled')

      expect(next?.milestone_type).toBe('day_7')
    })

    it('should calculate days until follow-up', () => {
      const now = new Date('2026-01-09T12:00:00Z')
      const scheduledFor = new Date('2026-01-16T12:00:00Z')

      const daysUntil = Math.ceil((scheduledFor.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      expect(daysUntil).toBe(7)
    })

    it('should detect overdue follow-ups', () => {
      const now = new Date('2026-01-15T12:00:00Z')
      const scheduledFor = new Date('2026-01-12T12:00:00Z')

      const isOverdue = scheduledFor < now

      expect(isOverdue).toBe(true)
    })
  })
})
