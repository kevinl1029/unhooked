import { describe, it, expect } from 'vitest'
import { parseJsonResponse } from '~/server/utils/llm/task-executor'

describe('task-executor', () => {
  describe('parseJsonResponse', () => {
    it('parses plain JSON object', () => {
      const response = '{"key": "value", "number": 123}'
      expect(parseJsonResponse(response)).toEqual({ key: 'value', number: 123 })
    })

    it('parses plain JSON array', () => {
      const response = '[1, 2, 3]'
      expect(parseJsonResponse(response)).toEqual([1, 2, 3])
    })

    it('extracts JSON from markdown code block', () => {
      const response = `Here's the result:

\`\`\`json
{"shouldCapture": true, "confidence": 0.85}
\`\`\`

That's the analysis.`

      expect(parseJsonResponse(response)).toEqual({
        shouldCapture: true,
        confidence: 0.85,
      })
    })

    it('extracts JSON from code block without language tag', () => {
      const response = `\`\`\`
{"result": "success"}
\`\`\``

      expect(parseJsonResponse(response)).toEqual({ result: 'success' })
    })

    it('finds JSON in text with prefix', () => {
      const response = `Based on my analysis, here is the JSON response: {"momentType": "insight", "confidence": 0.9}`

      expect(parseJsonResponse(response)).toEqual({
        momentType: 'insight',
        confidence: 0.9,
      })
    })

    it('finds JSON in text with suffix', () => {
      const response = `{"momentType": "insight"} This concludes my analysis.`

      expect(parseJsonResponse(response)).toEqual({
        momentType: 'insight',
      })
    })

    it('handles nested objects', () => {
      const response = `{"outer": {"inner": {"deep": true}}, "array": [1, 2]}`

      expect(parseJsonResponse(response)).toEqual({
        outer: { inner: { deep: true } },
        array: [1, 2],
      })
    })

    it('handles complex moment detection response', () => {
      const response = `{
  "shouldCapture": true,
  "momentType": "emotional_breakthrough",
  "confidence": 0.92,
  "emotionalValence": "mixed",
  "keyPhrase": "I realized the stress I was feeling was actually the withdrawal itself",
  "reasoning": "User expresses a key realization about the stress-relief illusion"
}`

      const result = parseJsonResponse(response)
      expect(result.shouldCapture).toBe(true)
      expect(result.momentType).toBe('emotional_breakthrough')
      expect(result.confidence).toBe(0.92)
      expect(result.emotionalValence).toBe('mixed')
      expect(result.keyPhrase).toContain('withdrawal')
    })

    it('throws on invalid JSON', () => {
      expect(() => parseJsonResponse('not json')).toThrow()
      expect(() => parseJsonResponse('{invalid}')).toThrow()
    })

    it('handles JSON with trailing/leading whitespace', () => {
      const response = `
  {"clean": true}
  `
      expect(parseJsonResponse(response)).toEqual({ clean: true })
    })
  })
})
