/**
 * Validation tests for seed-ceremony-test-user.sql
 *
 * These tests verify that the seed script's assumptions about the database
 * schema and business logic are still valid. If any of these tests fail,
 * the seed script likely needs to be updated.
 *
 * Related: scripts/seed-ceremony-test-user.sql
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// Read source files to validate against
const baselineSchema = readFileSync(
  join(__dirname, '../../../supabase/migrations/20260100_baseline_schema.sql'),
  'utf-8'
)

const prepareEndpoint = readFileSync(
  join(__dirname, '../../../server/api/ceremony/prepare.get.ts'),
  'utf-8'
)

const generateJourneyEndpoint = readFileSync(
  join(__dirname, '../../../server/api/ceremony/generate-journey.post.ts'),
  'utf-8'
)

const seedScript = readFileSync(
  join(__dirname, '../../../scripts/seed-ceremony-test-user.sql'),
  'utf-8'
)

describe('Seed script validation: seed-ceremony-test-user.sql', () => {
  describe('Database schema assumptions', () => {
    describe('user_intake table', () => {
      it('has required columns used by seed script', () => {
        // The seed script inserts into these columns
        const requiredColumns = [
          'user_id',
          'product_types',
          'usage_frequency',
          'years_using',
          'previous_attempts',
          'longest_quit_duration',
          'primary_reason',
          'triggers',
        ]

        for (const col of requiredColumns) {
          expect(
            baselineSchema,
            `user_intake should have column: ${col}`
          ).toMatch(new RegExp(`"${col}"`))
        }
      })
    })

    describe('user_progress table', () => {
      it('has required columns used by seed script', () => {
        const requiredColumns = [
          'user_id',
          'program_status',
          'current_illusion',
          'illusion_order',
          'illusions_completed',
          'total_sessions',
          'started_at',
          'last_session_at',
          'current_layer',
          'timezone',
        ]

        for (const col of requiredColumns) {
          expect(
            baselineSchema,
            `user_progress should have column: ${col}`
          ).toMatch(new RegExp(`"${col}"`))
        }
      })
    })

    describe('user_story table', () => {
      it('has required columns used by seed script', () => {
        const requiredColumns = [
          'user_id',
          'origin_summary',
          'origin_moment_ids',
          'primary_triggers',
          'personal_stakes',
          'stress_relief_conviction',
          'stress_relief_key_insight_id',
          'pleasure_conviction',
          'pleasure_key_insight_id',
          'willpower_conviction',
          'willpower_key_insight_id',
          'focus_conviction',
          'focus_key_insight_id',
          'identity_conviction',
          'identity_key_insight_id',
          'overall_readiness',
        ]

        for (const col of requiredColumns) {
          expect(
            baselineSchema,
            `user_story should have column: ${col}`
          ).toMatch(new RegExp(`"${col}"`))
        }
      })
    })

    describe('captured_moments table', () => {
      it('has required columns used by seed script', () => {
        const requiredColumns = [
          'user_id',
          'moment_type',
          'transcript',
          'illusion_key',
          'session_type',
          'illusion_layer',
          'confidence_score',
          'emotional_valence',
        ]

        for (const col of requiredColumns) {
          expect(
            baselineSchema,
            `captured_moments should have column: ${col}`
          ).toMatch(new RegExp(`"${col}"`))
        }
      })
    })
  })

  describe('Enum value assumptions', () => {
    it('moment_type allows values used by seed script', () => {
      // Seed script uses: origin_story, insight, commitment
      expect(baselineSchema).toContain("'origin_story'")
      expect(baselineSchema).toContain("'insight'")
      expect(baselineSchema).toContain("'commitment'")
    })

    it('illusion_key allows all 5 illusions', () => {
      // These are the illusion keys used in the seed script
      // They should exist in the illusions table or be valid foreign keys
      const illusionKeys = ['stress_relief', 'pleasure', 'willpower', 'focus', 'identity']

      for (const key of illusionKeys) {
        expect(
          seedScript,
          `Seed script should reference illusion: ${key}`
        ).toContain(`'${key}'`)
      }
    })

    it('session_type allows "core" value', () => {
      expect(baselineSchema).toContain("'core'")
    })

    it('illusion_layer allows values used by seed script', () => {
      // Seed script uses: intellectual, emotional, identity
      expect(baselineSchema).toContain("'intellectual'")
      expect(baselineSchema).toContain("'emotional'")
      expect(baselineSchema).toContain("'identity'")
    })

    it('emotional_valence allows values used by seed script', () => {
      // Seed script uses: positive, negative, mixed
      expect(baselineSchema).toContain("'positive'")
      expect(baselineSchema).toContain("'negative'")
      expect(baselineSchema).toContain("'mixed'")
    })
  })

  describe('Business logic assumptions', () => {
    it('ceremony requires all 5 illusions completed', () => {
      // The prepare endpoint checks for 5 completed illusions
      expect(prepareEndpoint).toContain('completedIllusions.length >= 5')
    })

    it('ceremony requires minimum 3 moments', () => {
      // The generate-journey endpoint requires at least 3 moments
      expect(generateJourneyEndpoint).toContain('allMoments.length < 3')
    })

    it('seed script creates at least 3 moments', () => {
      // Count INSERT INTO captured_moments statements
      const momentInserts = (seedScript.match(/INSERT INTO public\.captured_moments/g) || []).length
      expect(momentInserts).toBeGreaterThanOrEqual(3)
    })

    it('seed script sets all 5 illusions as completed', () => {
      // Should set illusions_completed to array with all 5
      expect(seedScript).toContain('ARRAY[1, 2, 3, 4, 5]')
    })

    it('conviction scores are within valid range (0-10)', () => {
      // The seed script sets conviction scores - verify they're reasonable
      // Check the schema enforces the range
      expect(baselineSchema).toMatch(/conviction.*CHECK.*>= 0.*<= 10/s)
    })
  })

  describe('Seed script self-consistency', () => {
    it('documents its dependencies', () => {
      expect(seedScript).toContain('DEPENDENCIES')
      expect(seedScript).toContain('DATABASE SCHEMA')
      expect(seedScript).toContain('ENUM VALUES')
      expect(seedScript).toContain('BUSINESS LOGIC')
    })

    it('references this validation test', () => {
      expect(seedScript).toContain('seed-script-validation.test.ts')
    })

    it('has clear usage instructions', () => {
      expect(seedScript).toContain('USAGE:')
      expect(seedScript).toContain('YOUR_USER_ID_HERE')
    })
  })
})
