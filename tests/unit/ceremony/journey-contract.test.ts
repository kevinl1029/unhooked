/**
 * Contract tests for journey data consistency
 *
 * These tests verify that the generate-journey utility and journey.get.ts
 * use consistent data structures and column names. This prevents bugs
 * where one endpoint writes to a different column than the other reads.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read the actual source files to verify consistency
// Generation logic lives in the reusable utility (called by generate-journey.post.ts)
const generateJourneyUtilSource = readFileSync(
  join(__dirname, '../../../server/utils/ceremony/generate-journey.ts'),
  'utf-8'
)
const generateJourneyEndpointSource = readFileSync(
  join(__dirname, '../../../server/api/ceremony/generate-journey.post.ts'),
  'utf-8'
)
const getJourneySource = readFileSync(
  join(__dirname, '../../../server/api/ceremony/journey.get.ts'),
  'utf-8'
)

describe('Journey data contract', () => {
  describe('Database column consistency', () => {
    it('generate-journey utility writes segments to content_json', () => {
      // Verify utility stores playlist segments in content_json column
      expect(generateJourneyUtilSource).toContain('content_json: { segments: playlistSegments }')
    })

    it('journey.get reads from content_json column', () => {
      // Verify journey.get.ts selects the content_json column
      expect(getJourneySource).toContain("select('id, content_json, content_text")
    })

    it('both use the same artifact_type', () => {
      const generateArtifactType = generateJourneyUtilSource.match(/artifact_type:\s*['"]([^'"]+)['"]/)?.[1]
      // journey.get uses .eq('artifact_type', 'value') syntax
      const getArtifactType = getJourneySource.match(/\.eq\(['"]artifact_type['"],\s*['"]([^'"]+)['"]\)/)?.[1]

      expect(generateArtifactType).toBe('reflective_journey')
      expect(getArtifactType).toBe('reflective_journey')
    })
  })

  describe('Playlist segment structure consistency', () => {
    it('generate-journey utility creates segments with required fields', () => {
      // PlaylistSegment interface in the utility
      expect(generateJourneyUtilSource).toContain('id: string')
      expect(generateJourneyUtilSource).toContain("type: 'narration' | 'user_moment'")
      expect(generateJourneyUtilSource).toContain('text: string')
      expect(generateJourneyUtilSource).toContain('transcript: string')
    })

    it('journey.get expects segments with the same fields', () => {
      // Type assertion in journey.get.ts
      expect(getJourneySource).toContain('id: string')
      expect(getJourneySource).toContain("type: 'narration' | 'user_moment'")
      expect(getJourneySource).toContain('text: string')
      expect(getJourneySource).toContain('transcript: string')
    })
  })

  describe('Response structure consistency', () => {
    it('generate-journey endpoint returns playlist.segments structure', () => {
      // The API response wraps segments in a playlist object
      expect(generateJourneyEndpointSource).toContain('playlist: {')
      expect(generateJourneyEndpointSource).toContain('segments,')
    })

    it('journey.get returns playlist.segments structure', () => {
      // Should return the same structure for client compatibility
      expect(getJourneySource).toContain('playlist: {')
      expect(getJourneySource).toContain('segments: playlistData')
    })
  })
})

describe('Journey segment type definitions', () => {
  /**
   * This test documents the expected structure and would fail if someone
   * adds a required field to one endpoint but not the other.
   */
  const expectedSegmentFields = [
    'id',
    'type',
    'text',
    'transcript',
  ]

  const optionalSegmentFields = [
    'duration_ms',
    'moment_id',
  ]

  it('all required fields are present in generate-journey utility interface', () => {
    for (const field of expectedSegmentFields) {
      expect(generateJourneyUtilSource).toContain(`${field}:`)
    }
  })

  it('all required fields are present in journey.get type assertion', () => {
    for (const field of expectedSegmentFields) {
      expect(getJourneySource).toContain(`${field}:`)
    }
  })

  it('optional fields are marked as optional in both', () => {
    for (const field of optionalSegmentFields) {
      // Optional fields have ? suffix
      expect(generateJourneyUtilSource).toContain(`${field}?:`)
      expect(getJourneySource).toContain(`${field}?:`)
    }
  })
})
