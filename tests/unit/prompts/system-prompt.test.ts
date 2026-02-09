import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from '~/server/utils/prompts'

describe('buildSystemPrompt layer injection', () => {
  it('injects L1 instructions and observation token guidance', () => {
    const prompt = buildSystemPrompt({
      illusionKey: 'stress_relief',
      illusionLayer: 'intellectual',
    })

    expect(prompt).toContain('## Layer 1: Intellectual Discovery')
    expect(prompt).toContain('[OBSERVATION_ASSIGNMENT:')
    expect(prompt).toContain('[SESSION_COMPLETE]')
    expect(prompt).not.toContain('{observationTemplate}')
  })

  it('injects L3 instructions with next-illusion preview replacement', () => {
    const prompt = buildSystemPrompt({
      illusionKey: 'stress_relief',
      illusionLayer: 'identity',
    })

    expect(prompt).toContain('## Layer 3: Identity Integration')
    expect(prompt).toContain('Next up: The Pleasure Illusion')
    expect(prompt).not.toContain('{nextIllusionPreview}')
  })
})
