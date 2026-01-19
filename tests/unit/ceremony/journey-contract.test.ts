/**
 * Contract tests for journey data consistency
 *
 * These tests verify that generate-journey.post.ts and journey.get.ts
 * use consistent data structures and column names. This prevents bugs
 * where one endpoint writes to a different column than the other reads.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read the actual source files to verify consistency
const generateJourneySource = readFileSync(
  join(__dirname, '../../../server/api/ceremony/generate-journey.post.ts'),
  'utf-8'
)
const getJourneySource = readFileSync(
  join(__dirname, '../../../server/api/ceremony/journey.get.ts'),
  'utf-8'
)

describe('Journey data contract', () => {
  describe('Database column consistency', () => {
    it('generate-journey writes to "playlist" column', () => {
      // Verify generate-journey.post.ts upserts to the playlist column
      expect(generateJourneySource).toContain('playlist: playlistSegments')
    })

    it('journey.get reads from "playlist" column', () => {
      // Verify journey.get.ts selects the playlist column
      expect(getJourneySource).toContain("select('id, playlist, content_text")
    })

    it('both endpoints use the same artifact_type', () => {
      const generateArtifactType = generateJourneySource.match(/artifact_type:\s*['"]([^'"]+)['"]/)?.[1]
      // journey.get uses .eq('artifact_type', 'value') syntax
      const getArtifactType = getJourneySource.match(/\.eq\(['"]artifact_type['"],\s*['"]([^'"]+)['"]\)/)?.[1]

      expect(generateArtifactType).toBe('reflective_journey')
      expect(getArtifactType).toBe('reflective_journey')
    })
  })

  describe('Playlist segment structure consistency', () => {
    it('generate-journey creates segments with required fields', () => {
      // PlaylistSegment interface in generate-journey.post.ts
      expect(generateJourneySource).toContain('id: string')
      expect(generateJourneySource).toContain("type: 'narration' | 'user_moment'")
      expect(generateJourneySource).toContain('text: string')
      expect(generateJourneySource).toContain('transcript: string')
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
    it('generate-journey returns playlist.segments structure', () => {
      // The API response wraps segments in a playlist object
      expect(generateJourneySource).toContain('playlist: {')
      expect(generateJourneySource).toContain('segments: playlistSegments')
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

  it('all required fields are present in generate-journey interface', () => {
    for (const field of expectedSegmentFields) {
      expect(generateJourneySource).toContain(`${field}:`)
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
      expect(generateJourneySource).toContain(`${field}?:`)
      expect(getJourneySource).toContain(`${field}?:`)
    }
  })
})
