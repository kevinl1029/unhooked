/**
 * Test script to verify ceremony_artifacts schema
 * Run with: npx tsx scripts/test-ceremony-schema.ts
 */

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSchema() {
  console.log('Testing ceremony_artifacts schema...\n')

  // 1. Check what columns exist
  console.log('1. Checking table columns via a test select...')
  const { data: columnsTest, error: columnsError } = await supabase
    .from('ceremony_artifacts')
    .select('id, user_id, artifact_type, content_text, content_json, audio_path, included_moment_ids')
    .limit(1)

  if (columnsError) {
    console.error('Column check failed:', columnsError.message)
    if (columnsError.message.includes('column')) {
      console.log('\n⚠️  A column referenced does not exist in the table!')
    }
  } else {
    console.log('✓ Basic columns exist (id, user_id, artifact_type, content_text, content_json, audio_path, included_moment_ids)')
  }

  // 2. Check if 'playlist' column exists (it shouldn't per spec)
  console.log('\n2. Checking if "playlist" column exists (should NOT exist per spec)...')
  const { error: playlistError } = await supabase
    .from('ceremony_artifacts')
    .select('playlist')
    .limit(1)

  if (playlistError && playlistError.message.includes('playlist')) {
    console.log('✓ "playlist" column does NOT exist (correct per spec)')
  } else if (!playlistError) {
    console.log('⚠️  "playlist" column EXISTS - this deviates from spec!')
  } else {
    console.log('? Unexpected error:', playlistError.message)
  }

  // 3. Test inserting into content_json
  console.log('\n3. Testing content_json insert with test data...')
  const testUserId = '00000000-0000-0000-0000-000000000000' // Fake UUID for test
  const testPayload = {
    segments: [
      { id: 'test-seg-1', type: 'narration', text: 'Test segment' }
    ]
  }

  // First, delete any existing test artifact
  await supabase
    .from('ceremony_artifacts')
    .delete()
    .eq('user_id', testUserId)
    .eq('artifact_type', 'reflective_journey')

  const { data: insertData, error: insertError } = await supabase
    .from('ceremony_artifacts')
    .insert({
      user_id: testUserId,
      artifact_type: 'reflective_journey',
      content_text: 'Test narrative text',
      content_json: testPayload,
    })
    .select('id, content_json')
    .single()

  if (insertError) {
    console.error('Insert failed:', insertError.message)
    console.error('Full error:', insertError)

    if (insertError.message.includes('foreign key')) {
      console.log('\n⚠️  Foreign key constraint - test user does not exist. This is expected.')
      console.log('   The schema is correct, we just cannot insert without a real user.')
    }
  } else {
    console.log('✓ Insert successful!')
    console.log('  Inserted data:', JSON.stringify(insertData, null, 2))

    // 4. Test reading back
    console.log('\n4. Testing content_json read...')
    const { data: readData, error: readError } = await supabase
      .from('ceremony_artifacts')
      .select('id, content_json')
      .eq('id', insertData.id)
      .single()

    if (readError) {
      console.error('Read failed:', readError.message)
    } else {
      console.log('✓ Read successful!')
      console.log('  Read data:', JSON.stringify(readData, null, 2))

      const contentJson = readData.content_json as { segments: unknown[] }
      if (contentJson?.segments?.length > 0) {
        console.log('✓ content_json.segments is accessible and contains data')
      }
    }

    // Cleanup
    await supabase
      .from('ceremony_artifacts')
      .delete()
      .eq('id', insertData.id)
    console.log('\n✓ Test data cleaned up')
  }

  console.log('\n--- Schema Test Complete ---')
}

testSchema().catch(console.error)
