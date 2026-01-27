/**
 * Verify that baseline schema matches actual database tables
 * Run with: npx tsx scripts/verify-schema-match.ts
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Tables defined in baseline schema (from 20260100_baseline_schema.sql)
const BASELINE_TABLES = [
  'captured_moments',
  'ceremony_artifacts',
  'check_in_schedule',
  'conversations',
  'conviction_assessments',
  'follow_up_schedule',
  'founding_members',
  'illusions',
  'mailing_list',
  'messages',
  'profiles',
  'user_intake',
  'user_progress',
  'user_story',
]

// Expected columns per table (from baseline schema)
const EXPECTED_COLUMNS: Record<string, string[]> = {
  captured_moments: [
    'id', 'user_id', 'conversation_id', 'message_id', 'moment_type', 'transcript',
    'audio_clip_path', 'audio_duration_ms', 'illusion_key', 'session_type',
    'illusion_layer', 'confidence_score', 'emotional_valence', 'is_user_highlighted',
    'times_played_back', 'last_used_at', 'created_at', 'updated_at'
  ],
  ceremony_artifacts: [
    'id', 'user_id', 'artifact_type', 'content_text', 'content_json',
    'audio_path', 'audio_duration_ms', 'included_moment_ids',
    'ceremony_completed_at', 'created_at', 'updated_at'
  ],
  check_in_schedule: [
    'id', 'user_id', 'scheduled_for', 'timezone', 'check_in_type',
    'trigger_illusion_key', 'trigger_session_id', 'prompt_template',
    'personalization_context', 'status', 'magic_link_token', 'email_sent_at',
    'opened_at', 'completed_at', 'expired_at', 'response_conversation_id',
    'created_at', 'updated_at'
  ],
  conversations: [
    'id', 'user_id', 'title', 'model', 'created_at', 'updated_at',
    'illusion_number', 'session_completed', 'session_abandoned_at',
    'session_type', 'illusion_key', 'illusion_layer', 'check_in_id', 'completed_at'
  ],
  conviction_assessments: [
    'id', 'user_id', 'conversation_id', 'illusion_key', 'illusion_layer',
    'conviction_score', 'delta', 'recommended_next_step', 'reasoning',
    'new_triggers', 'new_stakes', 'created_at'
  ],
  follow_up_schedule: [
    'id', 'user_id', 'milestone_type', 'scheduled_for', 'timezone',
    'magic_link_token', 'status', 'response_conversation_id', 'completed_at', 'created_at'
  ],
  founding_members: [
    'id', 'stripe_session_id', 'stripe_customer_id', 'stripe_payment_intent_id',
    'email', 'name', 'amount_paid', 'currency', 'paid_at',
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
    'landing_page_variant', 'referrer', 'converted_to_user_id', 'converted_at',
    'created_at', 'welcome_email_sent', 'welcome_email_sent_at'
  ],
  illusions: [
    'illusion_key', 'illusion_number', 'display_name', 'short_name'
  ],
  mailing_list: [
    'id', 'email', 'source', 'subscribed_at', 'unsubscribed_at',
    'ip_address', 'user_agent', 'metadata', 'email_status', 'bounce_type', 'status_updated_at'
  ],
  messages: [
    'id', 'conversation_id', 'role', 'content', 'created_at',
    'message_length', 'time_since_last_message', 'input_modality', 'metadata'
  ],
  profiles: [
    'id', 'email', 'full_name', 'created_at', 'updated_at'
  ],
  user_intake: [
    'id', 'user_id', 'product_types', 'usage_frequency', 'years_using',
    'previous_attempts', 'longest_quit_duration', 'primary_reason', 'triggers',
    'created_at', 'updated_at'
  ],
  user_progress: [
    'id', 'user_id', 'program_status', 'current_illusion', 'illusion_order',
    'illusions_completed', 'total_sessions', 'last_reminded_at', 'started_at',
    'completed_at', 'last_session_at', 'created_at', 'updated_at',
    'current_layer', 'timezone', 'ceremony_completed_at', 'ceremony_skipped_final_dose'
  ],
  user_story: [
    'id', 'user_id', 'origin_summary', 'origin_moment_ids', 'primary_triggers',
    'personal_stakes', 'stress_relief_conviction', 'stress_relief_key_insight_id',
    'stress_relief_resistance_notes', 'pleasure_conviction', 'pleasure_key_insight_id',
    'pleasure_resistance_notes', 'willpower_conviction', 'willpower_key_insight_id',
    'willpower_resistance_notes', 'focus_conviction', 'focus_key_insight_id',
    'focus_resistance_notes', 'identity_conviction', 'identity_key_insight_id',
    'identity_resistance_notes', 'overall_readiness', 'created_at', 'updated_at'
  ],
}

async function getTableColumns(tableName: string): Promise<string[]> {
  // Query a single row to get column names
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(0)

  if (error) {
    // Table might not exist or no access
    return []
  }

  // For empty tables, we need another approach - try inserting with wrong data to get column info
  // Actually, let's just select with a fake filter to get the structure
  return []
}

async function verifySchema() {
  console.log('=== Verifying Baseline Schema vs Actual Database ===\n')

  let allMatch = true
  const issues: string[] = []

  for (const table of BASELINE_TABLES) {
    const expectedColumns = EXPECTED_COLUMNS[table] || []

    // Try to select all expected columns
    const selectStr = expectedColumns.join(', ')

    const { error } = await supabase
      .from(table)
      .select(selectStr)
      .limit(1)

    if (error) {
      if (error.message.includes('does not exist')) {
        // Find which column doesn't exist
        const missingColumns: string[] = []
        const extraInDb: string[] = []

        for (const col of expectedColumns) {
          const { error: colError } = await supabase
            .from(table)
            .select(col)
            .limit(1)

          if (colError && colError.message.includes(col)) {
            missingColumns.push(col)
          }
        }

        if (missingColumns.length > 0) {
          console.log(`❌ ${table}`)
          console.log(`   Missing columns in DB: ${missingColumns.join(', ')}`)
          issues.push(`${table}: missing columns ${missingColumns.join(', ')}`)
          allMatch = false
        } else {
          console.log(`⚠️  ${table} - error: ${error.message}`)
          issues.push(`${table}: ${error.message}`)
          allMatch = false
        }
      } else {
        console.log(`⚠️  ${table} - error: ${error.message}`)
        issues.push(`${table}: ${error.message}`)
        allMatch = false
      }
    } else {
      // Now check if DB has extra columns not in baseline
      const { data: sampleData, error: sampleError } = await supabase
        .from(table)
        .select('*')
        .limit(1)

      if (!sampleError && sampleData && sampleData.length > 0) {
        const actualColumns = Object.keys(sampleData[0])
        const extraInDb = actualColumns.filter(c => !expectedColumns.includes(c))
        const missingInDb = expectedColumns.filter(c => !actualColumns.includes(c))

        if (extraInDb.length > 0 || missingInDb.length > 0) {
          console.log(`⚠️  ${table}`)
          if (extraInDb.length > 0) {
            console.log(`   Extra columns in DB (not in baseline): ${extraInDb.join(', ')}`)
          }
          if (missingInDb.length > 0) {
            console.log(`   Missing columns in DB: ${missingInDb.join(', ')}`)
            allMatch = false
            issues.push(`${table}: missing ${missingInDb.join(', ')}`)
          }
        } else {
          console.log(`✓ ${table}`)
        }
      } else {
        // Empty table - columns matched based on select
        console.log(`✓ ${table} (empty table, columns verified)`)
      }
    }
  }

  console.log('\n' + '='.repeat(50))

  if (allMatch && issues.length === 0) {
    console.log('\n✅ All tables match baseline schema!')
  } else {
    console.log('\n❌ Schema mismatches found:')
    for (const issue of issues) {
      console.log(`   - ${issue}`)
    }
  }
}

verifySchema().catch(console.error)
