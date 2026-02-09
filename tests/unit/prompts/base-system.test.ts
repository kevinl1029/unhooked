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
  })

  describe('Core coaching methodology contract', () => {
    it('should include core philosophy about nicotine creating the problem', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('Nicotine creates the problem it appears to solve')
    })

    it('should include Socratic method guidance', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('Socratic')
      expect(BASE_SYSTEM_PROMPT).toContain('Ask questions more than make statements')
    })

    it('should warn against willpower-based approaches', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('No willpower talk')
      expect(BASE_SYSTEM_PROMPT).toContain('Never suggest they "be strong" or "resist cravings."')
    })

    it('should include one-question-at-a-time guidance', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('Ask one question at a time')
      expect(BASE_SYSTEM_PROMPT).toContain('Never stack multiple questions in one message')
    })

    it('should include recovery physiology guidance', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('Dopamine receptor density normalizes within weeks')
      expect(BASE_SYSTEM_PROMPT).toContain('Physical symptoms peak at 48-72 hours')
    })

    it('should include crisis support guidance', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('988 Suicide & Crisis Lifeline')
      expect(BASE_SYSTEM_PROMPT).toContain('visit 988lifeline.org')
    })
  })
})
