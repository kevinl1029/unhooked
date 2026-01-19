-- Seed script: Create a ceremony-ready test user
--
-- USAGE:
-- 1. First, create a user in Supabase Auth (e.g., via the dashboard or sign up flow)
-- 2. Get the user's UUID from auth.users
-- 3. Replace 'YOUR_USER_ID_HERE' below with that UUID
-- 4. Run this script in the Supabase SQL Editor
--
-- This script creates:
-- - user_intake (onboarding data)
-- - user_progress (all 5 illusions completed, ceremony_ready state)
-- - user_story (conviction scores, key insights)
-- - captured_moments (at least 5 moments for journey generation)

-- ============================================
-- CONFIGURATION: Set your test user ID here
-- ============================================
DO $$
DECLARE
  test_user_id UUID := 'YOUR_USER_ID_HERE';  -- <-- REPLACE THIS
  moment_ids UUID[] := ARRAY[]::UUID[];
  new_moment_id UUID;
BEGIN
  -- Validate user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = test_user_id) THEN
    RAISE EXCEPTION 'User % not found in auth.users. Create the user first via Supabase Auth.', test_user_id;
  END IF;

  RAISE NOTICE 'Creating ceremony-ready state for user %', test_user_id;

  -- ============================================
  -- 1. Create user_intake (if not exists)
  -- ============================================
  INSERT INTO public.user_intake (
    user_id,
    product_types,
    usage_frequency,
    years_using,
    previous_attempts,
    longest_quit_duration,
    primary_reason,
    triggers
  ) VALUES (
    test_user_id,
    ARRAY['vape', 'cigarettes'],
    'multiple_daily',
    5,
    3,
    '2_weeks',
    'health',
    ARRAY['stress', 'social', 'morning']
  )
  ON CONFLICT (user_id) DO UPDATE SET
    updated_at = NOW();

  RAISE NOTICE '✓ user_intake created/updated';

  -- ============================================
  -- 2. Create user_progress (ceremony-ready)
  -- ============================================
  INSERT INTO public.user_progress (
    user_id,
    program_status,
    current_illusion,
    illusion_order,
    illusions_completed,
    total_sessions,
    started_at,
    last_session_at,
    current_layer,
    timezone
  ) VALUES (
    test_user_id,
    'ceremony_ready',
    5,  -- Completed all 5
    ARRAY[1, 2, 3, 4, 5],
    ARRAY[1, 2, 3, 4, 5],  -- All 5 completed
    5,
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '1 day',
    'identity',
    'America/New_York'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    program_status = 'ceremony_ready',
    current_illusion = 5,
    illusions_completed = ARRAY[1, 2, 3, 4, 5],
    total_sessions = 5,
    updated_at = NOW();

  RAISE NOTICE '✓ user_progress set to ceremony_ready';

  -- ============================================
  -- 3. Create captured_moments (need at least 3)
  -- ============================================

  -- Origin story moment
  INSERT INTO public.captured_moments (
    user_id,
    moment_type,
    transcript,
    illusion_key,
    session_type,
    illusion_layer,
    confidence_score,
    emotional_valence
  ) VALUES (
    test_user_id,
    'origin_story',
    'I started vaping in college because everyone was doing it. I thought I could quit anytime, but here I am five years later still hooked.',
    'stress_relief',
    'core',
    'intellectual',
    0.9,
    'negative'
  )
  RETURNING id INTO new_moment_id;
  moment_ids := array_append(moment_ids, new_moment_id);

  -- Stress relief insight
  INSERT INTO public.captured_moments (
    user_id,
    moment_type,
    transcript,
    illusion_key,
    session_type,
    illusion_layer,
    confidence_score,
    emotional_valence
  ) VALUES (
    test_user_id,
    'insight',
    'Wait, so the relief I feel when I vape is just relieving the withdrawal that vaping caused in the first place? That''s like... a circular trap.',
    'stress_relief',
    'core',
    'emotional',
    0.95,
    'mixed'
  )
  RETURNING id INTO new_moment_id;
  moment_ids := array_append(moment_ids, new_moment_id);

  -- Pleasure insight
  INSERT INTO public.captured_moments (
    user_id,
    moment_type,
    transcript,
    illusion_key,
    session_type,
    illusion_layer,
    confidence_score,
    emotional_valence
  ) VALUES (
    test_user_id,
    'insight',
    'I don''t actually enjoy it. I just think I do because I feel bad without it. Non-smokers don''t need nicotine to feel good after a meal.',
    'pleasure',
    'core',
    'emotional',
    0.92,
    'positive'
  )
  RETURNING id INTO new_moment_id;
  moment_ids := array_append(moment_ids, new_moment_id);

  -- Willpower insight
  INSERT INTO public.captured_moments (
    user_id,
    moment_type,
    transcript,
    illusion_key,
    session_type,
    illusion_layer,
    confidence_score,
    emotional_valence
  ) VALUES (
    test_user_id,
    'insight',
    'If quitting was just about willpower, I would have done it already. It''s about seeing the truth, not fighting myself.',
    'willpower',
    'core',
    'emotional',
    0.88,
    'positive'
  )
  RETURNING id INTO new_moment_id;
  moment_ids := array_append(moment_ids, new_moment_id);

  -- Focus insight
  INSERT INTO public.captured_moments (
    user_id,
    moment_type,
    transcript,
    illusion_key,
    session_type,
    illusion_layer,
    confidence_score,
    emotional_valence
  ) VALUES (
    test_user_id,
    'insight',
    'I realize now that vaping doesn''t help me focus. It just removes the distraction of craving. I''m solving a problem that vaping created.',
    'focus',
    'core',
    'emotional',
    0.9,
    'positive'
  )
  RETURNING id INTO new_moment_id;
  moment_ids := array_append(moment_ids, new_moment_id);

  -- Identity insight
  INSERT INTO public.captured_moments (
    user_id,
    moment_type,
    transcript,
    illusion_key,
    session_type,
    illusion_layer,
    confidence_score,
    emotional_valence
  ) VALUES (
    test_user_id,
    'insight',
    'I''m not an addict. I fell into a trap, like millions of others. But I can step out of it. This doesn''t define who I am.',
    'identity',
    'core',
    'identity',
    0.95,
    'positive'
  )
  RETURNING id INTO new_moment_id;
  moment_ids := array_append(moment_ids, new_moment_id);

  -- Commitment moment
  INSERT INTO public.captured_moments (
    user_id,
    moment_type,
    transcript,
    illusion_key,
    session_type,
    illusion_layer,
    confidence_score,
    emotional_valence
  ) VALUES (
    test_user_id,
    'commitment',
    'I''m done. Not because I have to be, but because I finally see there''s nothing to give up. I''m just reclaiming what was always mine.',
    'identity',
    'core',
    'identity',
    0.98,
    'positive'
  )
  RETURNING id INTO new_moment_id;
  moment_ids := array_append(moment_ids, new_moment_id);

  RAISE NOTICE '✓ Created 7 captured_moments';

  -- ============================================
  -- 4. Create user_story with convictions
  -- ============================================
  INSERT INTO public.user_story (
    user_id,
    origin_summary,
    origin_moment_ids,
    primary_triggers,
    personal_stakes,
    stress_relief_conviction,
    stress_relief_key_insight_id,
    pleasure_conviction,
    pleasure_key_insight_id,
    willpower_conviction,
    willpower_key_insight_id,
    focus_conviction,
    focus_key_insight_id,
    identity_conviction,
    identity_key_insight_id,
    overall_readiness
  ) VALUES (
    test_user_id,
    'Started vaping in college due to social pressure. Five years later, recognizes the pattern of addiction and is ready to break free.',
    ARRAY[moment_ids[1]],
    ARRAY['stress', 'social situations', 'morning routine'],
    ARRAY['health concerns', 'financial cost', 'being a role model'],
    8,  -- Conviction scores 0-10
    moment_ids[2],
    8,
    moment_ids[3],
    7,
    moment_ids[4],
    8,
    moment_ids[5],
    9,
    moment_ids[6],
    8
  )
  ON CONFLICT (user_id) DO UPDATE SET
    stress_relief_conviction = 8,
    stress_relief_key_insight_id = moment_ids[2],
    pleasure_conviction = 8,
    pleasure_key_insight_id = moment_ids[3],
    willpower_conviction = 7,
    willpower_key_insight_id = moment_ids[4],
    focus_conviction = 8,
    focus_key_insight_id = moment_ids[5],
    identity_conviction = 9,
    identity_key_insight_id = moment_ids[6],
    overall_readiness = 8,
    updated_at = NOW();

  RAISE NOTICE '✓ user_story created with convictions and key insights';

  -- ============================================
  -- Summary
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Ceremony-ready test user created!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User ID: %', test_user_id;
  RAISE NOTICE 'Status: ceremony_ready';
  RAISE NOTICE 'Illusions completed: 5/5';
  RAISE NOTICE 'Captured moments: 7';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '1. Log in as this user';
  RAISE NOTICE '2. Navigate to /ceremony';
  RAISE NOTICE '3. Test the full ceremony flow';
  RAISE NOTICE '========================================';

END $$;
