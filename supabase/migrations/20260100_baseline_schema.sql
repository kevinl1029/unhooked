


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."captured_moments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "message_id" "uuid",
    "moment_type" "text" NOT NULL,
    "transcript" "text" NOT NULL,
    "audio_clip_path" "text",
    "audio_duration_ms" integer,
    "illusion_key" "text",
    "session_type" "text",
    "illusion_layer" "text",
    "confidence_score" double precision DEFAULT 0.8,
    "emotional_valence" "text",
    "is_user_highlighted" boolean DEFAULT false,
    "times_played_back" integer DEFAULT 0,
    "last_used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "captured_moments_confidence_score_check" CHECK ((("confidence_score" >= (0)::double precision) AND ("confidence_score" <= (1)::double precision))),
    CONSTRAINT "captured_moments_emotional_valence_check" CHECK (("emotional_valence" = ANY (ARRAY['positive'::"text", 'negative'::"text", 'neutral'::"text", 'mixed'::"text"]))),
    CONSTRAINT "captured_moments_moment_type_check" CHECK (("moment_type" = ANY (ARRAY['origin_story'::"text", 'rationalization'::"text", 'insight'::"text", 'emotional_breakthrough'::"text", 'real_world_observation'::"text", 'identity_statement'::"text", 'commitment'::"text", 'fear_resistance'::"text"]))),
    CONSTRAINT "captured_moments_myth_layer_check" CHECK (("illusion_layer" = ANY (ARRAY['intellectual'::"text", 'emotional'::"text", 'identity'::"text"]))),
    CONSTRAINT "captured_moments_session_type_check" CHECK (("session_type" = ANY (ARRAY['core'::"text", 'check_in'::"text", 'ceremony'::"text", 'reinforcement'::"text"])))
);


ALTER TABLE "public"."captured_moments" OWNER TO "postgres";


COMMENT ON TABLE "public"."captured_moments" IS 'Stores significant therapeutic moments detected during sessions';



COMMENT ON COLUMN "public"."captured_moments"."moment_type" IS 'Classification of the therapeutic moment type';



COMMENT ON COLUMN "public"."captured_moments"."transcript" IS 'Verbatim text from user, no cleanup applied';



COMMENT ON COLUMN "public"."captured_moments"."illusion_key" IS 'The illusion this moment relates to';



COMMENT ON COLUMN "public"."captured_moments"."illusion_layer" IS 'The depth layer when moment was captured';



COMMENT ON COLUMN "public"."captured_moments"."confidence_score" IS 'LLM confidence in moment detection (0.7+ to capture, 0.85+ for audio)';



CREATE TABLE IF NOT EXISTS "public"."ceremony_artifacts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "artifact_type" "text" NOT NULL,
    "content_text" "text",
    "content_json" "jsonb",
    "audio_path" "text",
    "audio_duration_ms" integer,
    "included_moment_ids" "uuid"[],
    "ceremony_completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "ceremony_artifacts_artifact_type_check" CHECK (("artifact_type" = ANY (ARRAY['reflective_journey'::"text", 'final_recording'::"text", 'illusions_cheat_sheet'::"text"])))
);


ALTER TABLE "public"."ceremony_artifacts" OWNER TO "postgres";


COMMENT ON TABLE "public"."ceremony_artifacts" IS 'Stores generated ceremony content and persistent user artifacts';



CREATE TABLE IF NOT EXISTS "public"."check_in_schedule" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "timezone" "text" DEFAULT 'America/New_York'::"text" NOT NULL,
    "check_in_type" "text" NOT NULL,
    "trigger_illusion_key" "text",
    "trigger_session_id" "uuid",
    "prompt_template" "text" NOT NULL,
    "personalization_context" "jsonb",
    "status" "text" DEFAULT 'scheduled'::"text",
    "magic_link_token" "text",
    "email_sent_at" timestamp with time zone,
    "opened_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "expired_at" timestamp with time zone,
    "response_conversation_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "check_in_schedule_check_in_type_check" CHECK (("check_in_type" = ANY (ARRAY['post_session'::"text", 'morning'::"text", 'evening'::"text"]))),
    CONSTRAINT "check_in_schedule_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'sent'::"text", 'opened'::"text", 'completed'::"text", 'skipped'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."check_in_schedule" OWNER TO "postgres";


COMMENT ON TABLE "public"."check_in_schedule" IS 'Manages timing and state of micro check-ins';



COMMENT ON COLUMN "public"."check_in_schedule"."magic_link_token" IS '24-hour validity token for email links';



CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "model" "text" DEFAULT 'gemini'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "illusion_number" integer,
    "session_completed" boolean DEFAULT false,
    "session_abandoned_at" timestamp with time zone,
    "session_type" "text" DEFAULT 'core'::"text",
    "illusion_key" "text",
    "illusion_layer" "text",
    "check_in_id" "uuid",
    "completed_at" timestamp with time zone,
    CONSTRAINT "conversations_myth_layer_check" CHECK (("illusion_layer" = ANY (ARRAY['intellectual'::"text", 'emotional'::"text", 'identity'::"text"]))),
    CONSTRAINT "conversations_session_type_check" CHECK (("session_type" = ANY (ARRAY['core'::"text", 'check_in'::"text", 'ceremony'::"text", 'reinforcement'::"text"])))
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."conversations"."illusion_number" IS 'The illusion number this conversation addresses';



COMMENT ON COLUMN "public"."conversations"."session_completed" IS 'Whether AI marked this session as complete with [SESSION_COMPLETE] token';



COMMENT ON COLUMN "public"."conversations"."session_abandoned_at" IS 'When user exited without completing (if applicable)';



COMMENT ON COLUMN "public"."conversations"."session_type" IS 'Type of session (core, check_in, ceremony, reinforcement)';



COMMENT ON COLUMN "public"."conversations"."illusion_key" IS 'The illusion key (e.g., stress_relief, pleasure)';



COMMENT ON COLUMN "public"."conversations"."illusion_layer" IS 'The depth layer (intellectual, emotional, identity)';



COMMENT ON COLUMN "public"."conversations"."completed_at" IS 'Set when [SESSION_COMPLETE] token detected';



CREATE TABLE IF NOT EXISTS "public"."conviction_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "conversation_id" "uuid",
    "illusion_key" "text" NOT NULL,
    "illusion_layer" "text",
    "conviction_score" integer NOT NULL,
    "delta" integer NOT NULL,
    "recommended_next_step" "text",
    "reasoning" "text",
    "new_triggers" "text"[],
    "new_stakes" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "conviction_assessments_conviction_score_check" CHECK ((("conviction_score" >= 0) AND ("conviction_score" <= 10))),
    CONSTRAINT "conviction_assessments_myth_layer_check" CHECK (("illusion_layer" = ANY (ARRAY['intellectual'::"text", 'emotional'::"text", 'identity'::"text"]))),
    CONSTRAINT "conviction_assessments_recommended_next_step_check" CHECK (("recommended_next_step" = ANY (ARRAY['deepen'::"text", 'move_on'::"text", 'revisit_later'::"text"])))
);


ALTER TABLE "public"."conviction_assessments" OWNER TO "postgres";


COMMENT ON TABLE "public"."conviction_assessments" IS 'Tracks conviction assessment results per completed session';



CREATE TABLE IF NOT EXISTS "public"."follow_up_schedule" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "milestone_type" "text" NOT NULL,
    "scheduled_for" timestamp with time zone NOT NULL,
    "timezone" "text" NOT NULL,
    "magic_link_token" "text",
    "status" "text" DEFAULT 'scheduled'::"text",
    "response_conversation_id" "uuid",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "follow_up_schedule_milestone_type_check" CHECK (("milestone_type" = ANY (ARRAY['day_3'::"text", 'day_7'::"text", 'day_14'::"text", 'day_30'::"text", 'day_90'::"text", 'day_180'::"text", 'day_365'::"text"]))),
    CONSTRAINT "follow_up_schedule_status_check" CHECK (("status" = ANY (ARRAY['scheduled'::"text", 'sent'::"text", 'completed'::"text", 'skipped'::"text"])))
);


ALTER TABLE "public"."follow_up_schedule" OWNER TO "postgres";


COMMENT ON TABLE "public"."follow_up_schedule" IS 'Manages post-ceremony check-ins at milestone days';



CREATE TABLE IF NOT EXISTS "public"."founding_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_session_id" "text" NOT NULL,
    "stripe_customer_id" "text",
    "stripe_payment_intent_id" "text",
    "email" "text" NOT NULL,
    "name" "text",
    "amount_paid" integer NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text",
    "paid_at" timestamp with time zone NOT NULL,
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "utm_term" "text",
    "utm_content" "text",
    "landing_page_variant" "text",
    "referrer" "text",
    "converted_to_user_id" "uuid",
    "converted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "welcome_email_sent" boolean DEFAULT false,
    "welcome_email_sent_at" timestamp with time zone
);


ALTER TABLE "public"."founding_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."illusions" (
    "illusion_key" "text" NOT NULL,
    "illusion_number" integer NOT NULL,
    "display_name" "text" NOT NULL,
    "short_name" "text" NOT NULL,
    CONSTRAINT "myths_myth_number_check" CHECK ((("illusion_number" >= 1) AND ("illusion_number" <= 5)))
);


ALTER TABLE "public"."illusions" OWNER TO "postgres";


COMMENT ON TABLE "public"."illusions" IS 'Reference table for illusion keys (formerly myths). Each illusion represents a false belief about nicotine.';



COMMENT ON COLUMN "public"."illusions"."illusion_key" IS 'Unique key for each illusion (e.g., stress_relief, pleasure)';



COMMENT ON COLUMN "public"."illusions"."illusion_number" IS 'Display order number (1-5)';



CREATE TABLE IF NOT EXISTS "public"."mailing_list" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "source" "text" DEFAULT 'landing_page'::"text",
    "subscribed_at" timestamp with time zone DEFAULT "now"(),
    "unsubscribed_at" timestamp with time zone,
    "ip_address" "text",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "email_status" "text" DEFAULT 'active'::"text",
    "bounce_type" "text",
    "status_updated_at" timestamp with time zone,
    CONSTRAINT "mailing_list_email_status_check" CHECK (("email_status" = ANY (ARRAY['active'::"text", 'bounced'::"text", 'complained'::"text"])))
);


ALTER TABLE "public"."mailing_list" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "message_length" integer,
    "time_since_last_message" integer,
    "input_modality" "text" DEFAULT 'text'::"text",
    "metadata" "jsonb",
    CONSTRAINT "messages_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'assistant'::"text", 'system'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


COMMENT ON COLUMN "public"."messages"."message_length" IS 'Character count of message content';



COMMENT ON COLUMN "public"."messages"."time_since_last_message" IS 'Seconds since previous message in this conversation';



COMMENT ON COLUMN "public"."messages"."input_modality" IS 'How the message was input: text (default) or voice';



COMMENT ON COLUMN "public"."messages"."metadata" IS 'JSON metadata for voice messages (duration, confidence, word timings, etc.)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_intake" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_types" "text"[] NOT NULL,
    "usage_frequency" "text" NOT NULL,
    "years_using" integer,
    "previous_attempts" integer DEFAULT 0,
    "longest_quit_duration" "text",
    "primary_reason" "text" NOT NULL,
    "triggers" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_intake" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_intake" IS 'Stores user onboarding intake responses for personalization';



CREATE TABLE IF NOT EXISTS "public"."user_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_status" "text" DEFAULT 'not_started'::"text",
    "current_illusion" integer DEFAULT 1,
    "illusion_order" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5],
    "illusions_completed" integer[] DEFAULT ARRAY[]::integer[],
    "total_sessions" integer DEFAULT 0,
    "last_reminded_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "last_session_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "current_layer" "text" DEFAULT 'intellectual'::"text",
    "timezone" "text" DEFAULT 'America/New_York'::"text",
    "ceremony_completed_at" timestamp with time zone,
    "ceremony_skipped_final_dose" boolean DEFAULT false,
    CONSTRAINT "user_progress_current_layer_check" CHECK (("current_layer" = ANY (ARRAY['intellectual'::"text", 'emotional'::"text", 'identity'::"text"])))
);


ALTER TABLE "public"."user_progress" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_progress" IS 'Tracks user progress through the 5-illusion cessation program';



COMMENT ON COLUMN "public"."user_progress"."current_illusion" IS 'Current illusion number the user is working on (1-5)';



COMMENT ON COLUMN "public"."user_progress"."illusion_order" IS 'Personalized order of illusions for this user';



COMMENT ON COLUMN "public"."user_progress"."illusions_completed" IS 'Array of completed illusion numbers';



COMMENT ON COLUMN "public"."user_progress"."current_layer" IS 'Current layer within illusion (intellectual, emotional, identity)';



CREATE TABLE IF NOT EXISTS "public"."user_story" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "origin_summary" "text",
    "origin_moment_ids" "uuid"[],
    "primary_triggers" "text"[],
    "personal_stakes" "text"[],
    "stress_relief_conviction" integer DEFAULT 0,
    "stress_relief_key_insight_id" "uuid",
    "stress_relief_resistance_notes" "text",
    "pleasure_conviction" integer DEFAULT 0,
    "pleasure_key_insight_id" "uuid",
    "pleasure_resistance_notes" "text",
    "willpower_conviction" integer DEFAULT 0,
    "willpower_key_insight_id" "uuid",
    "willpower_resistance_notes" "text",
    "focus_conviction" integer DEFAULT 0,
    "focus_key_insight_id" "uuid",
    "focus_resistance_notes" "text",
    "identity_conviction" integer DEFAULT 0,
    "identity_key_insight_id" "uuid",
    "identity_resistance_notes" "text",
    "overall_readiness" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_story_focus_conviction_check" CHECK ((("focus_conviction" >= 0) AND ("focus_conviction" <= 10))),
    CONSTRAINT "user_story_identity_conviction_check" CHECK ((("identity_conviction" >= 0) AND ("identity_conviction" <= 10))),
    CONSTRAINT "user_story_overall_readiness_check" CHECK ((("overall_readiness" >= 0) AND ("overall_readiness" <= 10))),
    CONSTRAINT "user_story_pleasure_conviction_check" CHECK ((("pleasure_conviction" >= 0) AND ("pleasure_conviction" <= 10))),
    CONSTRAINT "user_story_stress_relief_conviction_check" CHECK ((("stress_relief_conviction" >= 0) AND ("stress_relief_conviction" <= 10))),
    CONSTRAINT "user_story_willpower_conviction_check" CHECK ((("willpower_conviction" >= 0) AND ("willpower_conviction" <= 10)))
);


ALTER TABLE "public"."user_story" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_story" IS 'Structured storage for user narrative and belief state per myth';



COMMENT ON COLUMN "public"."user_story"."primary_triggers" IS 'Initialized from intake, enriched after each conversation';



ALTER TABLE ONLY "public"."captured_moments"
    ADD CONSTRAINT "captured_moments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ceremony_artifacts"
    ADD CONSTRAINT "ceremony_artifacts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."check_in_schedule"
    ADD CONSTRAINT "check_in_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conviction_assessments"
    ADD CONSTRAINT "conviction_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follow_up_schedule"
    ADD CONSTRAINT "follow_up_schedule_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."founding_members"
    ADD CONSTRAINT "founding_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."founding_members"
    ADD CONSTRAINT "founding_members_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."mailing_list"
    ADD CONSTRAINT "mailing_list_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."mailing_list"
    ADD CONSTRAINT "mailing_list_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."illusions"
    ADD CONSTRAINT "myths_myth_number_key" UNIQUE ("illusion_number");



ALTER TABLE ONLY "public"."illusions"
    ADD CONSTRAINT "myths_pkey" PRIMARY KEY ("illusion_key");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_intake"
    ADD CONSTRAINT "user_intake_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_intake"
    ADD CONSTRAINT "user_intake_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_story"
    ADD CONSTRAINT "user_story_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_story"
    ADD CONSTRAINT "user_story_user_id_key" UNIQUE ("user_id");



CREATE INDEX "idx_captured_moments_illusion" ON "public"."captured_moments" USING "btree" ("illusion_key");



CREATE INDEX "idx_captured_moments_illusion_layer" ON "public"."captured_moments" USING "btree" ("illusion_key", "illusion_layer");



CREATE INDEX "idx_checkin_status" ON "public"."check_in_schedule" USING "btree" ("status", "scheduled_for");



CREATE INDEX "idx_checkin_token" ON "public"."check_in_schedule" USING "btree" ("magic_link_token");



CREATE INDEX "idx_checkin_user_scheduled" ON "public"."check_in_schedule" USING "btree" ("user_id", "scheduled_for");



CREATE INDEX "idx_checkin_user_status" ON "public"."check_in_schedule" USING "btree" ("user_id", "status");



CREATE INDEX "idx_conversations_illusion" ON "public"."conversations" USING "btree" ("illusion_key");



CREATE INDEX "idx_conversations_myth_key" ON "public"."conversations" USING "btree" ("illusion_key");



CREATE INDEX "idx_conversations_session_type" ON "public"."conversations" USING "btree" ("session_type");



CREATE INDEX "idx_conversations_user_id" ON "public"."conversations" USING "btree" ("user_id");



CREATE INDEX "idx_conversations_user_illusion" ON "public"."conversations" USING "btree" ("user_id", "illusion_key");



CREATE INDEX "idx_conviction_conversation" ON "public"."conviction_assessments" USING "btree" ("conversation_id");



CREATE INDEX "idx_conviction_user" ON "public"."conviction_assessments" USING "btree" ("user_id");



CREATE INDEX "idx_conviction_user_myth" ON "public"."conviction_assessments" USING "btree" ("user_id", "illusion_key");



CREATE INDEX "idx_followup_status" ON "public"."follow_up_schedule" USING "btree" ("status", "scheduled_for");



CREATE INDEX "idx_followup_token" ON "public"."follow_up_schedule" USING "btree" ("magic_link_token");



CREATE INDEX "idx_followup_user" ON "public"."follow_up_schedule" USING "btree" ("user_id");



CREATE INDEX "idx_founding_members_email" ON "public"."founding_members" USING "btree" ("email");



CREATE INDEX "idx_founding_members_paid_at" ON "public"."founding_members" USING "btree" ("paid_at");



CREATE INDEX "idx_founding_members_utm_source" ON "public"."founding_members" USING "btree" ("utm_source");



CREATE INDEX "idx_mailing_list_email" ON "public"."mailing_list" USING "btree" ("email");



CREATE INDEX "idx_messages_conversation_id" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_input_modality" ON "public"."messages" USING "btree" ("input_modality");



CREATE INDEX "idx_moments_conversation" ON "public"."captured_moments" USING "btree" ("conversation_id");



CREATE INDEX "idx_moments_created" ON "public"."captured_moments" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_moments_user_id" ON "public"."captured_moments" USING "btree" ("user_id");



CREATE INDEX "idx_moments_user_myth" ON "public"."captured_moments" USING "btree" ("user_id", "illusion_key");



CREATE INDEX "idx_moments_user_type" ON "public"."captured_moments" USING "btree" ("user_id", "moment_type");



CREATE INDEX "idx_user_intake_user_id" ON "public"."user_intake" USING "btree" ("user_id");



CREATE INDEX "idx_user_progress_user_id" ON "public"."user_progress" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "on_message_created" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



ALTER TABLE ONLY "public"."captured_moments"
    ADD CONSTRAINT "captured_moments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."captured_moments"
    ADD CONSTRAINT "captured_moments_illusion_key_fkey" FOREIGN KEY ("illusion_key") REFERENCES "public"."illusions"("illusion_key");



ALTER TABLE ONLY "public"."captured_moments"
    ADD CONSTRAINT "captured_moments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."captured_moments"
    ADD CONSTRAINT "captured_moments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ceremony_artifacts"
    ADD CONSTRAINT "ceremony_artifacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."check_in_schedule"
    ADD CONSTRAINT "check_in_schedule_response_conversation_id_fkey" FOREIGN KEY ("response_conversation_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."check_in_schedule"
    ADD CONSTRAINT "check_in_schedule_trigger_illusion_key_fkey" FOREIGN KEY ("trigger_illusion_key") REFERENCES "public"."illusions"("illusion_key");



ALTER TABLE ONLY "public"."check_in_schedule"
    ADD CONSTRAINT "check_in_schedule_trigger_session_id_fkey" FOREIGN KEY ("trigger_session_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."check_in_schedule"
    ADD CONSTRAINT "check_in_schedule_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_check_in_id_fkey" FOREIGN KEY ("check_in_id") REFERENCES "public"."check_in_schedule"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_myth_key_fkey" FOREIGN KEY ("illusion_key") REFERENCES "public"."illusions"("illusion_key");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conviction_assessments"
    ADD CONSTRAINT "conviction_assessments_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conviction_assessments"
    ADD CONSTRAINT "conviction_assessments_illusion_key_fkey" FOREIGN KEY ("illusion_key") REFERENCES "public"."illusions"("illusion_key");



ALTER TABLE ONLY "public"."conviction_assessments"
    ADD CONSTRAINT "conviction_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_story"
    ADD CONSTRAINT "fk_focus_insight" FOREIGN KEY ("focus_key_insight_id") REFERENCES "public"."captured_moments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_story"
    ADD CONSTRAINT "fk_identity_insight" FOREIGN KEY ("identity_key_insight_id") REFERENCES "public"."captured_moments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_story"
    ADD CONSTRAINT "fk_pleasure_insight" FOREIGN KEY ("pleasure_key_insight_id") REFERENCES "public"."captured_moments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_story"
    ADD CONSTRAINT "fk_stress_relief_insight" FOREIGN KEY ("stress_relief_key_insight_id") REFERENCES "public"."captured_moments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_story"
    ADD CONSTRAINT "fk_willpower_insight" FOREIGN KEY ("willpower_key_insight_id") REFERENCES "public"."captured_moments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."follow_up_schedule"
    ADD CONSTRAINT "follow_up_schedule_response_conversation_id_fkey" FOREIGN KEY ("response_conversation_id") REFERENCES "public"."conversations"("id");



ALTER TABLE ONLY "public"."follow_up_schedule"
    ADD CONSTRAINT "follow_up_schedule_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."founding_members"
    ADD CONSTRAINT "founding_members_converted_to_user_id_fkey" FOREIGN KEY ("converted_to_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_intake"
    ADD CONSTRAINT "user_intake_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_progress"
    ADD CONSTRAINT "user_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_story"
    ADD CONSTRAINT "user_story_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Service role full access" ON "public"."founding_members" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Service role full access" ON "public"."mailing_list" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "System can create assessments" ON "public"."conviction_assessments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create messages in own conversations" ON "public"."messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND ("conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create own artifacts" ON "public"."ceremony_artifacts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own conversations" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own intake" ON "public"."user_intake" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own moments" ON "public"."captured_moments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own progress" ON "public"."user_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own story" ON "public"."user_story" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete messages from own conversations" ON "public"."messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND ("conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own conversations" ON "public"."conversations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own moments" ON "public"."captured_moments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read messages from own conversations" ON "public"."messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversations"
  WHERE (("conversations"."id" = "messages"."conversation_id") AND ("conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can read own artifacts" ON "public"."ceremony_artifacts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own assessments" ON "public"."conviction_assessments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own check-ins" ON "public"."check_in_schedule" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own conversations" ON "public"."conversations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own follow-ups" ON "public"."follow_up_schedule" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own intake" ON "public"."user_intake" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own moments" ON "public"."captured_moments" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can read own progress" ON "public"."user_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own story" ON "public"."user_story" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own check-ins" ON "public"."check_in_schedule" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own conversations" ON "public"."conversations" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own intake" ON "public"."user_intake" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own moments" ON "public"."captured_moments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own progress" ON "public"."user_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own story" ON "public"."user_story" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."captured_moments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ceremony_artifacts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."check_in_schedule" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conviction_assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follow_up_schedule" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."founding_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mailing_list" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_intake" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_progress" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_story" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON TABLE "public"."captured_moments" TO "anon";
GRANT ALL ON TABLE "public"."captured_moments" TO "authenticated";
GRANT ALL ON TABLE "public"."captured_moments" TO "service_role";



GRANT ALL ON TABLE "public"."ceremony_artifacts" TO "anon";
GRANT ALL ON TABLE "public"."ceremony_artifacts" TO "authenticated";
GRANT ALL ON TABLE "public"."ceremony_artifacts" TO "service_role";



GRANT ALL ON TABLE "public"."check_in_schedule" TO "anon";
GRANT ALL ON TABLE "public"."check_in_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."check_in_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."conviction_assessments" TO "anon";
GRANT ALL ON TABLE "public"."conviction_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."conviction_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."follow_up_schedule" TO "anon";
GRANT ALL ON TABLE "public"."follow_up_schedule" TO "authenticated";
GRANT ALL ON TABLE "public"."follow_up_schedule" TO "service_role";



GRANT ALL ON TABLE "public"."founding_members" TO "anon";
GRANT ALL ON TABLE "public"."founding_members" TO "authenticated";
GRANT ALL ON TABLE "public"."founding_members" TO "service_role";



GRANT ALL ON TABLE "public"."illusions" TO "anon";
GRANT ALL ON TABLE "public"."illusions" TO "authenticated";
GRANT ALL ON TABLE "public"."illusions" TO "service_role";



GRANT ALL ON TABLE "public"."mailing_list" TO "anon";
GRANT ALL ON TABLE "public"."mailing_list" TO "authenticated";
GRANT ALL ON TABLE "public"."mailing_list" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_intake" TO "anon";
GRANT ALL ON TABLE "public"."user_intake" TO "authenticated";
GRANT ALL ON TABLE "public"."user_intake" TO "service_role";



GRANT ALL ON TABLE "public"."user_progress" TO "anon";
GRANT ALL ON TABLE "public"."user_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."user_progress" TO "service_role";



GRANT ALL ON TABLE "public"."user_story" TO "anon";
GRANT ALL ON TABLE "public"."user_story" TO "authenticated";
GRANT ALL ON TABLE "public"."user_story" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







