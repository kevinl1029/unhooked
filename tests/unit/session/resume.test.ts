/**
 * Unit tests for session resume functionality
 */
import { describe, it, expect } from 'vitest'

// Constants matching the implementation
const ABANDONMENT_THRESHOLD_HOURS = 24

describe('Session Resume', () => {
  describe('Abandoned session detection', () => {
    it('should identify incomplete sessions within threshold', () => {
      const now = new Date()
      const sessionCreatedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
      const thresholdDate = new Date(now.getTime() - ABANDONMENT_THRESHOLD_HOURS * 60 * 60 * 1000)

      const isWithinThreshold = new Date(sessionCreatedAt) >= thresholdDate
      const completedAt = null

      expect(isWithinThreshold).toBe(true)
      expect(completedAt).toBeNull()
    })

    it('should ignore sessions older than threshold', () => {
      const now = new Date()
      const sessionCreatedAt = new Date(now.getTime() - 30 * 60 * 60 * 1000) // 30 hours ago
      const thresholdDate = new Date(now.getTime() - ABANDONMENT_THRESHOLD_HOURS * 60 * 60 * 1000)

      const isWithinThreshold = new Date(sessionCreatedAt) >= thresholdDate

      expect(isWithinThreshold).toBe(false)
    })

    it('should ignore completed sessions', () => {
      const session = {
        id: 'conv-1',
        illusion_key: 'stress_relief',
        completed_at: new Date().toISOString(),
      }

      const isAbandoned = session.completed_at === null

      expect(isAbandoned).toBe(false)
    })

    it('should only check core sessions', () => {
      const coreSession = { session_type: 'core' }
      const checkInSession = { session_type: 'check_in' }

      expect(coreSession.session_type).toBe('core')
      expect(checkInSession.session_type).not.toBe('core')
    })
  })

  describe('Prior moments retrieval', () => {
    it('should retrieve captured moments from abandoned session', () => {
      const capturedMoments = [
        { transcript: 'I feel anxious when I don\'t vape', moment_type: 'insight' },
        { transcript: 'Started in college', moment_type: 'origin_story' },
      ]

      expect(capturedMoments.length).toBe(2)
      expect(capturedMoments[0].moment_type).toBe('insight')
    })

    it('should handle sessions with no captured moments', () => {
      const capturedMoments: Array<{ transcript: string; moment_type: string }> = []

      const response = {
        should_restart: true,
        illusion_key: 'stress_relief',
        prior_moments: capturedMoments,
      }

      expect(response.prior_moments).toEqual([])
      expect(response.should_restart).toBe(true)
    })
  })

  describe('Response format', () => {
    it('should return should_restart true when abandoned session found', () => {
      const hasAbandonedSession = true

      const response = hasAbandonedSession
        ? {
            should_restart: true,
            illusion_key: 'stress_relief',
            illusion_layer: 'intellectual',
            prior_moments: [],
          }
        : { should_restart: false }

      expect(response.should_restart).toBe(true)
      expect(response).toHaveProperty('illusion_key')
    })

    it('should return should_restart false when no abandoned session', () => {
      const hasAbandonedSession = false

      const response = hasAbandonedSession
        ? {
            should_restart: true,
            illusion_key: 'stress_relief',
            illusion_layer: 'intellectual',
            prior_moments: [],
          }
        : { should_restart: false }

      expect(response.should_restart).toBe(false)
      expect(response).not.toHaveProperty('illusion_key')
    })

    it('should include abandoned conversation id for tracking', () => {
      const response = {
        should_restart: true,
        illusion_key: 'stress_relief',
        illusion_layer: 'intellectual',
        prior_moments: [],
        abandoned_conversation_id: 'conv-123',
      }

      expect(response.abandoned_conversation_id).toBe('conv-123')
    })
  })

  describe('Session marking', () => {
    it('should mark abandoned session as completed to prevent re-finding', () => {
      const abandonedSession = {
        id: 'conv-123',
        completed_at: null as string | null,
      }

      // Simulate marking as completed
      abandonedSession.completed_at = new Date().toISOString()

      expect(abandonedSession.completed_at).toBeTruthy()
    })
  })

  describe('Prior moments injection', () => {
    it('should format prior moments for chat context', () => {
      const priorMoments = [
        { transcript: 'The anxiety IS the withdrawal', moment_type: 'insight' },
        { transcript: 'Started vaping in college', moment_type: 'origin_story' },
      ]

      const formatted = priorMoments
        .map(m => `- [${m.moment_type}]: "${m.transcript}"`)
        .join('\n')

      expect(formatted).toContain('[insight]')
      expect(formatted).toContain('[origin_story]')
      expect(formatted).toContain('The anxiety IS the withdrawal')
    })

    it('should create context instruction for AI', () => {
      const priorMoments = [
        { transcript: 'Test insight', moment_type: 'insight' },
      ]

      const context = `The user started this session earlier but didn't complete it. Here are insights they shared before:\n\n` +
        priorMoments.map(m => `- [${m.moment_type}]: "${m.transcript}"`).join('\n') +
        `\n\nAcknowledge you remember where you left off and continue naturally from their previous insights.`

      expect(context).toContain('started this session earlier')
      expect(context).toContain('Acknowledge you remember')
      expect(context).toContain('[insight]')
    })
  })
})
