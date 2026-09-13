-- ==============================================================================
-- FitTrack: Enterprise-Grade Supabase PostgreSQL Schema
-- Run this script in your Supabase Project SQL Editor to set up all tables,
-- indexes, and Row Level Security (RLS) policies.
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. Users Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    open_id VARCHAR(64) UNIQUE,
    email VARCHAR(320) UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    login_method VARCHAR(64) DEFAULT 'custom',
    experience_level VARCHAR(32) DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    role VARCHAR(32) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    last_signed_in TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_openid ON public.users(open_id);

-- ------------------------------------------------------------------------------
-- 2. Athlete Profiles Table (Biometrics & Target Goals)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.athlete_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    weight_kg NUMERIC(6, 2) DEFAULT 75.00 NOT NULL,
    height_cm NUMERIC(5, 1) DEFAULT 175.0 NOT NULL,
    age INT DEFAULT 24 NOT NULL,
    sex VARCHAR(16) DEFAULT 'male' CHECK (sex IN ('male', 'female', 'other')),
    activity_level VARCHAR(32) DEFAULT 'moderate' NOT NULL,
    focus VARCHAR(180) DEFAULT 'Hypertrophy & Progressive Overload' NOT NULL,
    goal_kcal INT DEFAULT 2400 NOT NULL,
    goal_protein INT DEFAULT 160 NOT NULL,
    goal_carbs INT DEFAULT 260 NOT NULL,
    goal_fat INT DEFAULT 65 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_athlete_profiles_email UNIQUE (user_email)
);

CREATE INDEX IF NOT EXISTS idx_athlete_profiles_email ON public.athlete_profiles(user_email);

-- ------------------------------------------------------------------------------
-- 3. Smart Nutrition Entries & Indian Food Logs Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nutrition_entries (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    meal_type VARCHAR(32) NOT NULL, -- Breakfast, Lunch, Snack, Dinner
    label VARCHAR(180) NOT NULL,
    hindi_name VARCHAR(180),
    portion_multiplier NUMERIC(4, 2) DEFAULT 1.00 NOT NULL,
    serving_size VARCHAR(120) DEFAULT '1 serving' NOT NULL,
    calories INT NOT NULL,
    protein_grams NUMERIC(7, 2) NOT NULL,
    carb_grams NUMERIC(7, 2) NOT NULL,
    fat_grams NUMERIC(7, 2) NOT NULL,
    is_veg BOOLEAN DEFAULT TRUE NOT NULL,
    consumed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON public.nutrition_entries(user_email, consumed_at DESC);

-- ------------------------------------------------------------------------------
-- 4. Custom Homemade Indian Recipes Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_indian_foods (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    name VARCHAR(180) NOT NULL,
    hindi_name VARCHAR(180),
    category VARCHAR(64) DEFAULT 'high_protein_veg' NOT NULL,
    serving_size VARCHAR(120) NOT NULL,
    calories INT NOT NULL,
    protein_grams NUMERIC(7, 2) NOT NULL,
    carb_grams NUMERIC(7, 2) NOT NULL,
    fat_grams NUMERIC(7, 2) NOT NULL,
    is_veg BOOLEAN DEFAULT TRUE NOT NULL,
    tags_json JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_custom_foods_user ON public.custom_indian_foods(user_email);

-- ------------------------------------------------------------------------------
-- 5. Workout Session Entries Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_entries (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    focus VARCHAR(120) NOT NULL, -- Chest, Back, Legs, Full Body, etc.
    movement_count INT DEFAULT 1 NOT NULL,
    volume_kg NUMERIC(11, 2) DEFAULT 0.00 NOT NULL,
    duration_minutes INT DEFAULT 45 NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON public.workout_entries(user_email, completed_at DESC);

-- ------------------------------------------------------------------------------
-- 6. Detailed Workout Sets & Reps Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.workout_sets (
    id BIGSERIAL PRIMARY KEY,
    workout_id BIGINT REFERENCES public.workout_entries(id) ON DELETE CASCADE,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    movement_id VARCHAR(64) NOT NULL,
    movement_name VARCHAR(180) NOT NULL,
    set_number INT NOT NULL,
    weight_kg NUMERIC(7, 2) NOT NULL,
    reps INT NOT NULL,
    rpe NUMERIC(3, 1) DEFAULT 8.0,
    calculated_1rm NUMERIC(7, 2),
    completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workout_sets_workout ON public.workout_sets(workout_id);
CREATE INDEX IF NOT EXISTS idx_workout_sets_user ON public.workout_sets(user_email);

-- ------------------------------------------------------------------------------
-- 7. Daily Weigh-in & Biometrics Tracking Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.metric_entries (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    weight_kg NUMERIC(6, 2) NOT NULL,
    body_fat_percent NUMERIC(4, 1),
    notes TEXT,
    captured_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metrics_user_date ON public.metric_entries(user_email, captured_at DESC);

-- ------------------------------------------------------------------------------
-- 8. Daily Streaks & Milestones Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.streak_records (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE UNIQUE,
    current_streak INT DEFAULT 0 NOT NULL,
    longest_streak INT DEFAULT 0 NOT NULL,
    last_completed_date VARCHAR(32) DEFAULT '' NOT NULL,
    freeze_count INT DEFAULT 2 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_streak_records_email ON public.streak_records(user_email);

-- ------------------------------------------------------------------------------
-- 9. GPS Sessions & GeoJSON Telemetry Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gps_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    label VARCHAR(180) NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    duration_seconds INT NOT NULL,
    distance_meters NUMERIC(12, 2) NOT NULL,
    average_speed_kph NUMERIC(7, 2) NOT NULL,
    route_json JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_gps_sessions_user_date ON public.gps_sessions(user_email, started_at DESC);

-- ------------------------------------------------------------------------------
-- 10. Exercise Library Favorites Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    exercise_id VARCHAR(64) NOT NULL,
    exercise_name VARCHAR(180) NOT NULL,
    category VARCHAR(64),
    favorited_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_user_favorite UNIQUE (user_email, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites(user_email);

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_indian_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

-- Helper function to extract authenticated athlete email
CREATE OR REPLACE FUNCTION public.current_athlete_email()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'email',
    current_setting('request.jwt.claim.email', true),
    ''
  );
$$ LANGUAGE sql STABLE;

-- Strictly scoped user-level policies: Athletes can only read/write their own records
CREATE POLICY "Users access own account only" ON public.users FOR ALL
  USING (email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "Athlete profiles own data only" ON public.athlete_profiles FOR ALL
  USING (user_email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (user_email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "Nutrition entries own data only" ON public.nutrition_entries FOR ALL
  USING (user_email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (user_email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "Custom foods own data only" ON public.custom_indian_foods FOR ALL
  USING (user_email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (user_email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "Workout entries own data only" ON public.workout_entries FOR ALL
  USING (user_email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (user_email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "Workout sets own data only" ON public.workout_sets FOR ALL
  USING (user_email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (user_email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "Metric entries own data only" ON public.metric_entries FOR ALL
  USING (user_email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (user_email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "Streak records own data only" ON public.streak_records FOR ALL
  USING (user_email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (user_email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "GPS sessions own data only" ON public.gps_sessions FOR ALL
  USING (user_email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (user_email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "Favorites own data only" ON public.user_favorites FOR ALL
  USING (user_email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (user_email = public.current_athlete_email() OR auth.role() = 'service_role');
