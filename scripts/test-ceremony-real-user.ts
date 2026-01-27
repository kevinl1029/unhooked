/**
 * Test script to verify ceremony journey generation with a real user
 * Run with: npx tsx scripts/test-ceremony-real-user.ts
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testWithRealUser() {
  console.log('Testing database schema...\n')

  // Check what constraints exist on ceremony_artifacts
  console.log('--- Checking table constraints ---')
  const { data: constraints, error: constraintsError } = await supabase
    .rpc('get_table_constraints', { table_name: 'ceremony_artifacts' })

  if (constraintsError) {
    console.log('Could not query constraints via RPC, trying raw SQL approach...')

    // Try a different approach - check what happens with a simple insert
    const testUserId = '11da3d6a-032e-4553-963c-6f26184028e5'

    console.log('\n--- Testing simple INSERT (not upsert) ---')
    const testSegments = [
      { id: 'test-seg-1', type: 'narration', text: 'Schema test segment', transcript: 'Schema test segment', audio_generated: false }
    ]

    const { data: insertResult, error: insertError } = await supabase
      .from('ceremony_artifacts')
      .insert({
        user_id: testUserId,
        artifact_type: 'reflective_journey',
        content_text: 'Test narrative - schema validation at ' + new Date().toISOString(),
        content_json: { segments: testSegments },
      })
      .select('id, content_json')
      .single()

    if (insertError) {
      console.error('❌ INSERT FAILED:', insertError.message)
      console.error('Error code:', insertError.code)

      if (insertError.code === '23505') {
        console.log('\n✓ Unique constraint exists! Record already present.')
        console.log('  Now let\'s try an UPDATE instead...')

        // Try update
        const { data: updateResult, error: updateError } = await supabase
          .from('ceremony_artifacts')
          .update({
            content_text: 'Updated narrative - schema validation at ' + new Date().toISOString(),
            content_json: { segments: testSegments },
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', testUserId)
          .eq('artifact_type', 'reflective_journey')
          .select('id, content_json')
          .single()

        if (updateError) {
          console.error('❌ UPDATE FAILED:', updateError.message)
        } else {
          console.log('✓ UPDATE SUCCESSFUL!')
          console.log('  Artifact ID:', updateResult.id)
          console.log('  content_json:', JSON.stringify(updateResult.content_json, null, 2))
        }
      }
    } else {
      console.log('✓ INSERT SUCCESSFUL!')
      console.log('  Artifact ID:', insertResult.id)
      console.log('  content_json:', JSON.stringify(insertResult.content_json, null, 2))

      // Clean up
      await supabase
        .from('ceremony_artifacts')
        .delete()
        .eq('id', insertResult.id)
      console.log('  Test record deleted.')
    }
  } else {
    console.log('Constraints:', constraints)
  }

  // Also verify what the baseline has
  console.log('\n--- Checking for UNIQUE constraint in migrations ---')
  console.log('The spec says: UNIQUE(user_id, artifact_type)')
  console.log('If upsert fails with "no unique constraint", the constraint is missing from DB.')

  console.log('\n--- Test Complete ---')
}

testWithRealUser().catch(console.error)
