


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


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."friendship_status" AS ENUM (
    'pending',
    'accepted',
    'blocked'
);


ALTER TYPE "public"."friendship_status" OWNER TO "postgres";


CREATE TYPE "public"."profile_visibility" AS ENUM (
    'public',
    'friends_only',
    'private'
);


ALTER TYPE "public"."profile_visibility" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_sync_logs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM fitbit_sync_logs
  WHERE synced_at < NOW() - INTERVAL '30 days';
END;
$$;


ALTER FUNCTION "public"."cleanup_old_sync_logs"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_blocked_users"() RETURNS TABLE("id" "uuid", "blocked_id" "uuid", "created_at" timestamp with time zone, "user_data" "jsonb")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  select 
    ub.id,
    ub.blocked_id,
    ub.created_at,
    jsonb_build_object(
      'id', u.id,
      'email', u.email,
      'raw_user_meta_data', u.raw_user_meta_data
    ) as user_data
  from public.user_blocks ub
  join auth.users u on ub.blocked_id = u.id
  where ub.blocker_id = auth.uid()
  order by ub.created_at desc;
$$;


ALTER FUNCTION "public"."get_blocked_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_friend_suggestions"("current_user_id" "uuid", "suggestion_limit" integer) RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "username" "text", "email" "text", "created_at" timestamp with time zone, "avatar_url" "text", "mutual_friends_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH 
  -- Get user's direct friends
  user_friends AS (
    SELECT 
      CASE 
        WHEN sender_id = current_user_id THEN receiver_id
        ELSE sender_id
      END AS friend_id
    FROM friend_requests
    WHERE (sender_id = current_user_id OR receiver_id = current_user_id)
    AND status = 'accepted'
  ),
  
  -- Get friends of friends
  potential_suggestions AS (
    SELECT DISTINCT
      CASE 
        WHEN fr.sender_id IN (SELECT friend_id FROM user_friends) THEN fr.receiver_id
        ELSE fr.sender_id
      END AS suggested_user_id
    FROM friend_requests fr
    WHERE fr.status = 'accepted'
    AND (fr.sender_id IN (SELECT friend_id FROM user_friends) OR fr.receiver_id IN (SELECT friend_id FROM user_friends))
    AND CASE 
      WHEN fr.sender_id IN (SELECT friend_id FROM user_friends) THEN fr.receiver_id
      ELSE fr.sender_id
    END != current_user_id
    AND CASE 
      WHEN fr.sender_id IN (SELECT friend_id FROM user_friends) THEN fr.receiver_id
      ELSE fr.sender_id
    END NOT IN (SELECT friend_id FROM user_friends)
  ),
  
  -- Count mutual friends for each suggestion
  suggestions_with_counts AS (
    SELECT 
      ps.suggested_user_id,
      COUNT(DISTINCT uf.friend_id) AS mutual_count
    FROM potential_suggestions ps
    JOIN friend_requests fr ON 
      (fr.sender_id = ps.suggested_user_id OR fr.receiver_id = ps.suggested_user_id)
    JOIN user_friends uf ON 
      (fr.sender_id = uf.friend_id OR fr.receiver_id = uf.friend_id)
    WHERE fr.status = 'accepted'
    AND CASE 
      WHEN fr.sender_id = ps.suggested_user_id THEN fr.receiver_id
      ELSE fr.sender_id
    END = uf.friend_id
    GROUP BY ps.suggested_user_id
  )
  
  -- Get final results with user details
  SELECT 
    u.id,
    u.first_name,
    u.last_name,
    u.username,
    u.email,
    u.created_at,
    u.avatar_url,
    COALESCE(swc.mutual_count, 1) AS mutual_friends_count
  FROM potential_suggestions ps
  JOIN users u ON ps.suggested_user_id = u.id
  LEFT JOIN suggestions_with_counts swc ON ps.suggested_user_id = swc.suggested_user_id
  LEFT JOIN friend_requests existing_fr ON 
    ((existing_fr.sender_id = current_user_id AND existing_fr.receiver_id = u.id) OR 
     (existing_fr.receiver_id = current_user_id AND existing_fr.sender_id = u.id))
    AND existing_fr.status IN ('pending', 'accepted')  -- Only exclude pending/accepted, NOT rejected
  LEFT JOIN user_blocks ub ON 
    (ub.blocker_id = current_user_id AND ub.blocked_id = u.id) OR
    (ub.blocker_id = u.id AND ub.blocked_id = current_user_id)
  WHERE existing_fr.id IS NULL  -- No pending or accepted friend request
  AND ub.id IS NULL    -- Not blocked
  AND (u.social_privacy IS NULL OR u.social_privacy = true)  -- Respect privacy settings
  ORDER BY COALESCE(swc.mutual_count, 1) DESC, u.first_name
  LIMIT suggestion_limit;

END;
$$;


ALTER FUNCTION "public"."get_friend_suggestions"("current_user_id" "uuid", "suggestion_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.users (id, email, username, first_name, last_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name'
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_user_blocked"("blocker_id" "uuid", "blocked_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $_$
  select exists (
    select 1 
    from public.user_blocks 
    where user_blocks.blocker_id = $1 
    and user_blocks.blocked_id = $2
  );
$_$;


ALTER FUNCTION "public"."is_user_blocked"("blocker_id" "uuid", "blocked_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."chat_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "title" "text" NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid",
    "content" "text" NOT NULL,
    "is_user" boolean NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitbit_activity_data" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "date" "date" NOT NULL,
    "steps" integer,
    "calories_out" integer,
    "activity_calories" integer,
    "calories_bmr" integer,
    "sedentary_minutes" integer,
    "lightly_active_minutes" integer,
    "fairly_active_minutes" integer,
    "very_active_minutes" integer,
    "total_distance" numeric,
    "resting_heart_rate" integer,
    "raw_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."fitbit_activity_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitbit_heart_rate_data" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "date" "date" NOT NULL,
    "resting_heart_rate" integer,
    "heart_rate_zones" "jsonb",
    "raw_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."fitbit_heart_rate_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitbit_sleep_data" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "date" "date" NOT NULL,
    "duration" integer,
    "minutes_asleep" integer,
    "minutes_awake" integer,
    "efficiency" integer,
    "start_time" timestamp without time zone,
    "end_time" timestamp without time zone,
    "awakenings_count" integer,
    "deep_sleep_minutes" integer,
    "light_sleep_minutes" integer,
    "rem_sleep_minutes" integer,
    "wake_minutes" integer,
    "raw_data" "jsonb",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."fitbit_sleep_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitbit_sync_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid",
    "sync_type" "text",
    "status" "text",
    "error_message" "text",
    "synced_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."fitbit_sync_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fitbit_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "scope" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."fitbit_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."friend_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "sender_id" "uuid",
    "receiver_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "friend_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."friend_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."google_calendar_tokens" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "refresh_token" "text",
    "expires_at" timestamp with time zone NOT NULL,
    "scope" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."google_calendar_tokens" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "user_blocks_check" CHECK (("blocker_id" <> "blocked_id"))
);


ALTER TABLE "public"."user_blocks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_posts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_edited" boolean DEFAULT false
);


ALTER TABLE "public"."user_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_social_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "social_features_enabled" boolean DEFAULT false,
    "profile_visibility" "public"."profile_visibility" DEFAULT 'private'::"public"."profile_visibility",
    "allow_friend_requests" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_social_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "auth"."uid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "username" "text",
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "social_privacy" boolean DEFAULT true,
    "avatar_url" "text",
    "fitness_level" "text",
    "primary_goals" "text",
    "exercise_preferences" "text",
    "weekly_frequency" "text",
    "session_duration" "text",
    "equipment_access" "text",
    "physical_limitations" "text"
);


ALTER TABLE "public"."users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "type" "text" NOT NULL,
    "duration_minutes" integer NOT NULL,
    "satisfaction" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text",
    "external_id" "text",
    CONSTRAINT "workouts_duration_minutes_check" CHECK (("duration_minutes" > 0)),
    CONSTRAINT "workouts_satisfaction_check" CHECK ((("satisfaction" >= 1) AND ("satisfaction" <= 5)))
);


ALTER TABLE "public"."workouts" OWNER TO "postgres";


ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitbit_activity_data"
    ADD CONSTRAINT "fitbit_activity_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitbit_activity_data"
    ADD CONSTRAINT "fitbit_activity_data_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."fitbit_heart_rate_data"
    ADD CONSTRAINT "fitbit_heart_rate_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitbit_heart_rate_data"
    ADD CONSTRAINT "fitbit_heart_rate_data_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."fitbit_sleep_data"
    ADD CONSTRAINT "fitbit_sleep_data_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitbit_sleep_data"
    ADD CONSTRAINT "fitbit_sleep_data_user_id_date_key" UNIQUE ("user_id", "date");



ALTER TABLE ONLY "public"."fitbit_sync_logs"
    ADD CONSTRAINT "fitbit_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitbit_tokens"
    ADD CONSTRAINT "fitbit_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fitbit_tokens"
    ADD CONSTRAINT "fitbit_tokens_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_calendar_tokens"
    ADD CONSTRAINT "google_calendar_tokens_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."google_calendar_tokens"
    ADD CONSTRAINT "google_calendar_tokens_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_posts"
    ADD CONSTRAINT "user_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_social_settings"
    ADD CONSTRAINT "user_social_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_social_settings"
    ADD CONSTRAINT "user_social_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_chat_conversations_updated_at" ON "public"."chat_conversations" USING "btree" ("updated_at" DESC);



CREATE INDEX "idx_chat_conversations_user_id" ON "public"."chat_conversations" USING "btree" ("user_id");



CREATE INDEX "idx_chat_messages_conversation_id" ON "public"."chat_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_chat_messages_timestamp" ON "public"."chat_messages" USING "btree" ("timestamp");



CREATE INDEX "idx_fitbit_tokens_user_id" ON "public"."fitbit_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_google_calendar_tokens_user_id" ON "public"."google_calendar_tokens" USING "btree" ("user_id");



CREATE INDEX "idx_user_blocks_blocked" ON "public"."user_blocks" USING "btree" ("blocked_id");



CREATE INDEX "idx_user_blocks_blocker" ON "public"."user_blocks" USING "btree" ("blocker_id");



CREATE INDEX "idx_user_posts_created_at" ON "public"."user_posts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_user_posts_user_id" ON "public"."user_posts" USING "btree" ("user_id");



CREATE INDEX "idx_user_social_settings_user_id" ON "public"."user_social_settings" USING "btree" ("user_id");



CREATE INDEX "idx_workouts_user_started_at" ON "public"."workouts" USING "btree" ("user_id", "started_at" DESC);



CREATE UNIQUE INDEX "uq_workouts_user_source_external" ON "public"."workouts" USING "btree" ("user_id", "source", "external_id") WHERE (("source" IS NOT NULL) AND ("external_id" IS NOT NULL));



CREATE OR REPLACE TRIGGER "update_chat_conversations_updated_at" BEFORE UPDATE ON "public"."chat_conversations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fitbit_activity_data_updated_at" BEFORE UPDATE ON "public"."fitbit_activity_data" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fitbit_heart_rate_data_updated_at" BEFORE UPDATE ON "public"."fitbit_heart_rate_data" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fitbit_sleep_data_updated_at" BEFORE UPDATE ON "public"."fitbit_sleep_data" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fitbit_tokens_updated_at" BEFORE UPDATE ON "public"."fitbit_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_google_calendar_tokens_updated_at" BEFORE UPDATE ON "public"."google_calendar_tokens" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_social_settings_updated_at" BEFORE UPDATE ON "public"."user_social_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."chat_conversations"
    ADD CONSTRAINT "chat_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."chat_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitbit_activity_data"
    ADD CONSTRAINT "fitbit_activity_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitbit_heart_rate_data"
    ADD CONSTRAINT "fitbit_heart_rate_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitbit_sleep_data"
    ADD CONSTRAINT "fitbit_sleep_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitbit_sync_logs"
    ADD CONSTRAINT "fitbit_sync_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fitbit_tokens"
    ADD CONSTRAINT "fk_user" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."friend_requests"
    ADD CONSTRAINT "friend_requests_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_blocks"
    ADD CONSTRAINT "user_blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_posts"
    ADD CONSTRAINT "user_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_social_settings"
    ADD CONSTRAINT "user_social_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workouts"
    ADD CONSTRAINT "workouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow individual user insert" ON "public"."users" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Allow individual user select" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Allow individual user update" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Authenticated users can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Enable read access for all users" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can block other users" ON "public"."user_blocks" FOR INSERT WITH CHECK ((("auth"."uid"() = "blocker_id") AND ("auth"."uid"() <> "blocked_id")));



CREATE POLICY "Users can check if they are blocked" ON "public"."user_blocks" FOR SELECT USING (("auth"."uid"() = "blocked_id"));



CREATE POLICY "Users can create messages in their conversations" ON "public"."chat_messages" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations"
  WHERE (("chat_conversations"."id" = "chat_messages"."conversation_id") AND ("chat_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own conversations" ON "public"."chat_conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create their own posts" ON "public"."user_posts" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete messages from their conversations" ON "public"."chat_messages" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations"
  WHERE (("chat_conversations"."id" = "chat_messages"."conversation_id") AND ("chat_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own Fitbit tokens" ON "public"."fitbit_tokens" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own activity data" ON "public"."fitbit_activity_data" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own conversations" ON "public"."chat_conversations" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own heart rate data" ON "public"."fitbit_heart_rate_data" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own posts" ON "public"."user_posts" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own sleep data" ON "public"."fitbit_sleep_data" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert friend requests" ON "public"."friend_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can insert their own Fitbit tokens" ON "public"."fitbit_tokens" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own activity data" ON "public"."fitbit_activity_data" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own heart rate data" ON "public"."fitbit_heart_rate_data" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own sleep data" ON "public"."fitbit_sleep_data" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own sync logs" ON "public"."fitbit_sync_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage messages in their conversations" ON "public"."chat_messages" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations"
  WHERE (("chat_conversations"."id" = "chat_messages"."conversation_id") AND ("chat_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can manage their own blocks" ON "public"."user_blocks" USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can manage their own conversations" ON "public"."chat_conversations" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can only access their own Google Calendar tokens" ON "public"."google_calendar_tokens" USING (("user_id" = ("auth"."uid"())::"text"));



CREATE POLICY "Users can select their own row" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can unblock their own blocks" ON "public"."user_blocks" FOR DELETE USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can update their own Fitbit tokens" ON "public"."fitbit_tokens" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own activity data" ON "public"."fitbit_activity_data" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own conversations" ON "public"."chat_conversations" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own heart rate data" ON "public"."fitbit_heart_rate_data" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own posts" ON "public"."user_posts" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own row" ON "public"."users" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own sleep data" ON "public"."fitbit_sleep_data" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their received requests" ON "public"."friend_requests" FOR UPDATE USING (("auth"."uid"() = "receiver_id"));



CREATE POLICY "Users can update their sent requests" ON "public"."friend_requests" FOR UPDATE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can view blocks where they are blocked" ON "public"."user_blocks" FOR SELECT USING (("auth"."uid"() = "blocked_id"));



CREATE POLICY "Users can view friends' posts" ON "public"."user_posts" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."friend_requests"
  WHERE (("friend_requests"."status" = 'accepted'::"text") AND ((("friend_requests"."sender_id" = "auth"."uid"()) AND ("friend_requests"."receiver_id" = "user_posts"."user_id")) OR (("friend_requests"."receiver_id" = "auth"."uid"()) AND ("friend_requests"."sender_id" = "user_posts"."user_id")))))));



CREATE POLICY "Users can view messages from their conversations" ON "public"."chat_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."chat_conversations"
  WHERE (("chat_conversations"."id" = "chat_messages"."conversation_id") AND ("chat_conversations"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own Fitbit tokens" ON "public"."fitbit_tokens" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own activity data" ON "public"."fitbit_activity_data" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own blocks" ON "public"."user_blocks" FOR SELECT USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can view their own conversations" ON "public"."chat_conversations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own friend requests" ON "public"."friend_requests" FOR SELECT USING ((("auth"."uid"() = "sender_id") OR ("auth"."uid"() = "receiver_id")));



CREATE POLICY "Users can view their own heart rate data" ON "public"."fitbit_heart_rate_data" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own posts" ON "public"."user_posts" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sleep data" ON "public"."fitbit_sleep_data" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own sync logs" ON "public"."fitbit_sync_logs" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."chat_conversations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fitbit_activity_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fitbit_heart_rate_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fitbit_sleep_data" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fitbit_sync_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."fitbit_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."friend_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."google_calendar_tokens" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_social_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workouts_delete_own" ON "public"."workouts" FOR DELETE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "workouts_insert_own" ON "public"."workouts" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "workouts_select_own" ON "public"."workouts" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "workouts_update_own" ON "public"."workouts" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."cleanup_old_sync_logs"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_sync_logs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_sync_logs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_blocked_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_blocked_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_blocked_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_friend_suggestions"("current_user_id" "uuid", "suggestion_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_friend_suggestions"("current_user_id" "uuid", "suggestion_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_friend_suggestions"("current_user_id" "uuid", "suggestion_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_user_blocked"("blocker_id" "uuid", "blocked_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_user_blocked"("blocker_id" "uuid", "blocked_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_user_blocked"("blocker_id" "uuid", "blocked_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."chat_conversations" TO "anon";
GRANT ALL ON TABLE "public"."chat_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."fitbit_activity_data" TO "anon";
GRANT ALL ON TABLE "public"."fitbit_activity_data" TO "authenticated";
GRANT ALL ON TABLE "public"."fitbit_activity_data" TO "service_role";



GRANT ALL ON TABLE "public"."fitbit_heart_rate_data" TO "anon";
GRANT ALL ON TABLE "public"."fitbit_heart_rate_data" TO "authenticated";
GRANT ALL ON TABLE "public"."fitbit_heart_rate_data" TO "service_role";



GRANT ALL ON TABLE "public"."fitbit_sleep_data" TO "anon";
GRANT ALL ON TABLE "public"."fitbit_sleep_data" TO "authenticated";
GRANT ALL ON TABLE "public"."fitbit_sleep_data" TO "service_role";



GRANT ALL ON TABLE "public"."fitbit_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."fitbit_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."fitbit_sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."fitbit_tokens" TO "anon";
GRANT ALL ON TABLE "public"."fitbit_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."fitbit_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."friend_requests" TO "anon";
GRANT ALL ON TABLE "public"."friend_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."friend_requests" TO "service_role";



GRANT ALL ON TABLE "public"."google_calendar_tokens" TO "anon";
GRANT ALL ON TABLE "public"."google_calendar_tokens" TO "authenticated";
GRANT ALL ON TABLE "public"."google_calendar_tokens" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."user_blocks" TO "anon";
GRANT ALL ON TABLE "public"."user_blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_blocks" TO "service_role";



GRANT ALL ON TABLE "public"."user_posts" TO "anon";
GRANT ALL ON TABLE "public"."user_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."user_posts" TO "service_role";



GRANT ALL ON TABLE "public"."user_social_settings" TO "anon";
GRANT ALL ON TABLE "public"."user_social_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_social_settings" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";



GRANT ALL ON TABLE "public"."workouts" TO "anon";
GRANT ALL ON TABLE "public"."workouts" TO "authenticated";
GRANT ALL ON TABLE "public"."workouts" TO "service_role";









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































RESET ALL;
