import { describe, it, expect } from 'vitest'
import { BASE_SYSTEM_PROMPT } from '~/server/utils/prompts/base-system'

describe('BASE_SYSTEM_PROMPT', () => {
  describe('SESSION_COMPLETE token guidance', () => {
    it('should include SESSION_COMPLETE token instruction', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('[SESSION_COMPLETE]')
    })

    it('should instruct to output token at end of final message', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('at the very end of your final message')
    })
  })

  describe('Final message guidance - no questions', () => {
    it('should include critical instruction to NOT end with questions', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('CRITICAL')
      expect(BASE_SYSTEM_PROMPT).toContain('final message must NOT end with a question')
    })

    it('should explain why - user cannot respond', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('user will not be able to respond')
    })

    it('should provide guidance on what to do instead', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('Affirm their realization')
      expect(BASE_SYSTEM_PROMPT).toContain('summarize what they discovered')
      expect(BASE_SYSTEM_PROMPT).toContain('warm closing')
    })

    it('should include good and bad examples', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('Example good ending')
      expect(BASE_SYSTEM_PROMPT).toContain('Example bad ending')
      // Bad example should show a question
      expect(BASE_SYSTEM_PROMPT).toContain('So what do you think about that now?')
      expect(BASE_SYSTEM_PROMPT).toContain("(user can't respond!)")
    })
  })

  describe('Core Allen Carr methodology', () => {
    it('should include core philosophy about nicotine creating the problem', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('Nicotine creates the problem it appears to solve')
    })

    it('should include Socratic method guidance', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('Socratic')
      expect(BASE_SYSTEM_PROMPT).toContain('Ask questions more than make statements')
    })

    it('should warn against willpower-based approaches', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('No willpower talk')
      expect(BASE_SYSTEM_PROMPT).toContain('Never suggest they need to')
      expect(BASE_SYSTEM_PROMPT).toContain('be strong')
    })
  })
})
