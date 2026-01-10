import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  shouldAttemptDetection,
  SessionDetectionTracker,
  TRANSCRIPT_CAPTURE_THRESHOLD,
  AUDIO_CAPTURE_THRESHOLD,
} from '~/server/utils/llm/tasks/moment-detection'

describe('moment-detection', () => {
  describe('shouldAttemptDetection', () => {
    it('returns false for messages with less than 20 words', () => {
      expect(shouldAttemptDetection('Hello')).toBe(false)
      expect(shouldAttemptDetection('This is a short message')).toBe(false)
      expect(shouldAttemptDetection('One two three four five six seven eight nine ten')).toBe(false)
    })

    it('returns true for messages with 20 or more words', () => {
      const twentyWords = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'
      expect(shouldAttemptDetection(twentyWords)).toBe(true)
    })

    it('returns true for longer messages', () => {
      const longMessage = 'I remember when I first started smoking, it was back in college when all my friends were doing it. I thought it looked cool and helped me fit in with the group. Looking back now, I realize how foolish that was.'
      expect(shouldAttemptDetection(longMessage)).toBe(true)
    })

    it('handles empty strings', () => {
      expect(shouldAttemptDetection('')).toBe(false)
    })

    it('handles whitespace-only strings', () => {
      expect(shouldAttemptDetection('   \n\t   ')).toBe(false)
    })
  })

  describe('capture thresholds', () => {
    it('has correct transcript capture threshold', () => {
      expect(TRANSCRIPT_CAPTURE_THRESHOLD).toBe(0.7)
    })

    it('has correct audio capture threshold', () => {
      expect(AUDIO_CAPTURE_THRESHOLD).toBe(0.85)
    })

    it('audio threshold is higher than transcript threshold', () => {
      expect(AUDIO_CAPTURE_THRESHOLD).toBeGreaterThan(TRANSCRIPT_CAPTURE_THRESHOLD)
    })
  })

  describe('SessionDetectionTracker', () => {
    let tracker: SessionDetectionTracker

    beforeEach(() => {
      tracker = new SessionDetectionTracker()
    })

    it('starts with zero count for new conversation', () => {
      expect(tracker.getCount('conv-123')).toBe(0)
    })

    it('allows detection when under limit', () => {
      expect(tracker.canDetect('conv-123')).toBe(true)
    })

    it('increments count correctly', () => {
      tracker.incrementCount('conv-123')
      expect(tracker.getCount('conv-123')).toBe(1)

      tracker.incrementCount('conv-123')
      expect(tracker.getCount('conv-123')).toBe(2)
    })

    it('tracks separate conversations independently', () => {
      tracker.incrementCount('conv-1')
      tracker.incrementCount('conv-1')
      tracker.incrementCount('conv-2')

      expect(tracker.getCount('conv-1')).toBe(2)
      expect(tracker.getCount('conv-2')).toBe(1)
    })

    it('prevents detection after 20 calls', () => {
      const convId = 'conv-123'

      // Make 20 detections
      for (let i = 0; i < 20; i++) {
        expect(tracker.canDetect(convId)).toBe(true)
        tracker.incrementCount(convId)
      }

      // 21st should be blocked
      expect(tracker.canDetect(convId)).toBe(false)
      expect(tracker.getCount(convId)).toBe(20)
    })

    it('resets count for conversation', () => {
      const convId = 'conv-123'

      tracker.incrementCount(convId)
      tracker.incrementCount(convId)
      expect(tracker.getCount(convId)).toBe(2)

      tracker.resetCount(convId)
      expect(tracker.getCount(convId)).toBe(0)
      expect(tracker.canDetect(convId)).toBe(true)
    })

    it('reset does not affect other conversations', () => {
      tracker.incrementCount('conv-1')
      tracker.incrementCount('conv-1')
      tracker.incrementCount('conv-2')

      tracker.resetCount('conv-1')

      expect(tracker.getCount('conv-1')).toBe(0)
      expect(tracker.getCount('conv-2')).toBe(1)
    })
  })
})
