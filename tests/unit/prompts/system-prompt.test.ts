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

  it('does not inject scripted opening for new Layer 2 sessions without bridge context', () => {
    const prompt = buildSystemPrompt({
      illusionKey: 'stress_relief',
      illusionLayer: 'emotional',
      isNewConversation: true,
      bridgeContext: '',
      abandonedSessionContext: '',
    })

    expect(prompt).toContain('## Layer 2: Emotional Processing')
    expect(prompt).toContain("What have you been noticing about [illusion topic]?")
    expect(prompt).not.toContain('## Starting This Session')
    expect(prompt).not.toContain('What made you want to start with this one?')
  })

  it('does not inject scripted opening for new Layer 3 sessions without bridge context', () => {
    const prompt = buildSystemPrompt({
      illusionKey: 'stress_relief',
      illusionLayer: 'identity',
      isNewConversation: true,
      bridgeContext: '',
      abandonedSessionContext: '',
    })

    expect(prompt).toContain('## Layer 3: Identity Integration')
    expect(prompt).toContain("What have you been noticing? And what have you been feeling?")
    expect(prompt).not.toContain('## Starting This Session')
    expect(prompt).not.toContain('What made you want to start with this one?')
  })

  it('preserves scripted opening for new Layer 1 sessions', () => {
    const prompt = buildSystemPrompt({
      illusionKey: 'stress_relief',
      illusionLayer: 'intellectual',
      isNewConversation: true,
      bridgeContext: '',
      abandonedSessionContext: '',
    })

    expect(prompt).toContain('## Starting This Session')
    expect(prompt).toContain('what made you want to start with this one?')
  })
})
