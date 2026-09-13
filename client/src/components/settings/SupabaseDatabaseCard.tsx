import React, { useState, useEffect } from "react";
import { Database, CheckCircle2, AlertCircle, RefreshCw, Copy, ExternalLink, ShieldCheck, ArrowUpRight, Cloud, Download, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from "@/lib/supabase";
import { pushLocalDataToSupabase, pullDataFromSupabase, getLastSyncTime } from "@/lib/supabase-sync";

export function SupabaseDatabaseCard() {
  const [config, setConfig] = useState(getSupabaseConfig);
  const [urlInput, setUrlInput] = useState(config.url);
  const [keyInput, setKeyInput] = useState(config.anonKey);
  const [isEditing, setIsEditing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    connected: boolean;
    message: string;
    latencyMs?: number;
  }>({
    tested: false,
    connected: false,
    message: "",
  });
  const [lastSync, setLastSync] = useState<string | null>(getLastSyncTime);

  useEffect(() => {
    if (config.isConfigured) {
      handleTestConnection();
    }
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await testSupabaseConnection(urlInput, keyInput);
      setConnectionStatus({
        tested: true,
        connected: res.success,
        message: res.message,
        latencyMs: res.latencyMs,
      });
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } finally {
      setTesting(false);
    }
  };

  const handleSaveConfig = () => {
    saveSupabaseConfig(urlInput, keyInput);
    const updated = getSupabaseConfig();
    setConfig(updated);
    setIsEditing(false);
    toast.success("Supabase database settings updated.");
    handleTestConnection();
  };

  const handleSyncToCloud = async () => {
    setSyncing(true);
    try {
      const res = await pushLocalDataToSupabase();
      if (res.success) {
        toast.success(res.message);
        setLastSync(getLastSyncTime());
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to sync to Supabase.");
    } finally {
      setSyncing(false);
    }
  };

  const handlePullFromCloud = async () => {
    setPulling(true);
    try {
      const res = await pullDataFromSupabase();
      if (res.success) {
        toast.success(res.message);
        window.dispatchEvent(new Event("fittrack_storage_updated"));
      } else {
        toast.error(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to pull from Supabase.");
    } finally {
      setPulling(false);
    }
  };

  const handleCopySql = () => {
    const sqlScript = `-- FitTrack: Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    open_id VARCHAR(64) UNIQUE,
    email VARCHAR(320) UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    login_method VARCHAR(64) DEFAULT 'custom',
    experience_level VARCHAR(32) DEFAULT 'beginner',
    role VARCHAR(32) DEFAULT 'user',
    last_signed_in TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.athlete_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE UNIQUE,
    weight_kg NUMERIC(6, 2) DEFAULT 75.00 NOT NULL,
    height_cm NUMERIC(5, 1) DEFAULT 175.0 NOT NULL,
    age INT DEFAULT 24 NOT NULL,
    sex VARCHAR(16) DEFAULT 'male',
    activity_level VARCHAR(32) DEFAULT 'moderate' NOT NULL,
    focus VARCHAR(180) DEFAULT 'Hypertrophy & Progressive Overload' NOT NULL,
    goal_kcal INT DEFAULT 2400 NOT NULL,
    goal_protein INT DEFAULT 160 NOT NULL,
    goal_carbs INT DEFAULT 260 NOT NULL,
    goal_fat INT DEFAULT 65 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.nutrition_entries (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    meal_type VARCHAR(32) NOT NULL,
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

CREATE TABLE IF NOT EXISTS public.workout_entries (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    focus VARCHAR(120) NOT NULL,
    movement_count INT DEFAULT 1 NOT NULL,
    volume_kg NUMERIC(11, 2) DEFAULT 0.00 NOT NULL,
    duration_minutes INT DEFAULT 45 NOT NULL,
    completed_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

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

CREATE TABLE IF NOT EXISTS public.metric_entries (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    weight_kg NUMERIC(6, 2) NOT NULL,
    body_fat_percent NUMERIC(4, 1),
    notes TEXT,
    captured_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.streak_records (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE UNIQUE,
    current_streak INT DEFAULT 0 NOT NULL,
    longest_streak INT DEFAULT 0 NOT NULL,
    last_completed_date VARCHAR(32) DEFAULT '' NOT NULL,
    freeze_count INT DEFAULT 2 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metric_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streak_records ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_athlete_email()
RETURNS TEXT AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', current_setting('request.jwt.claim.email', true), '');
$$ LANGUAGE sql STABLE;

CREATE POLICY "Users access own account only" ON public.users FOR ALL
  USING (email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "Athlete profiles own data only" ON public.athlete_profiles FOR ALL
  USING (user_email = public.current_athlete_email() OR auth.role() = 'service_role')
  WITH CHECK (user_email = public.current_athlete_email() OR auth.role() = 'service_role');

CREATE POLICY "Nutrition entries own data only" ON public.nutrition_entries FOR ALL
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
`;
    navigator.clipboard.writeText(sqlScript);
    toast.success("Full Supabase SQL schema copied to clipboard! Paste it into your Supabase SQL Editor.");
  };

  return (
    <section className="settings-section rounded-2xl bg-[#1c140c] border border-emerald-500/25 p-6 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Database size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white tracking-wide">Supabase Cloud Database</h3>
              {connectionStatus.connected ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={12} /> Connected {connectionStatus.latencyMs ? `(${connectionStatus.latencyMs}ms)` : ""}
                </span>
              ) : config.isConfigured ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <AlertCircle size={12} /> Configured
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-400 border border-slate-500/30">
                  <Cloud size={12} /> Ready for Setup
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-performance PostgreSQL database for workouts, telemetry, nutrition logs, and real-time syncing.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-white/10 transition-colors"
          >
            <Copy size={13} />
            Copy Supabase SQL
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#c9ad7e]/10 hover:bg-[#c9ad7e]/20 text-[#c9ad7e] border border-[#c9ad7e]/30 transition-colors"
          >
            {isEditing ? "Close" : "Configure Keys"}
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="mt-4 p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#c9ad7e]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Supabase Anon Key (Public Key)
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 text-xs rounded-lg bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-[#c9ad7e]"
            />
          </div>
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !urlInput || !keyInput}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
            >
              <RefreshCw size={13} className={testing ? "animate-spin" : ""} />
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              type="button"
              onClick={handleSaveConfig}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-[#c9ad7e] text-slate-950 hover:bg-[#d4ff66] font-semibold"
            >
              Save Credentials
            </button>
          </div>
        </div>
      )}

      {connectionStatus.tested && (
        <div className={`mt-3 px-3 py-2 rounded-lg text-xs flex items-center gap-2 ${
          connectionStatus.connected
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
            : "bg-red-500/10 border border-red-500/20 text-red-300"
        }`}>
          {connectionStatus.connected ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
          <span>{connectionStatus.message}</span>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleSyncToCloud}
          disabled={syncing}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium transition-all group"
        >
          <UploadCloud size={16} className={syncing ? "animate-bounce" : "group-hover:-translate-y-0.5 transition-transform"} />
          <span>{syncing ? "Syncing to Supabase..." : "Sync Local Data to Supabase Cloud"}</span>
        </button>

        <button
          type="button"
          onClick={handlePullFromCloud}
          disabled={pulling}
          className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 text-xs font-medium transition-all group"
        >
          <Download size={16} className={pulling ? "animate-bounce" : "group-hover:translate-y-0.5 transition-transform"} />
          <span>{pulling ? "Downloading..." : "Pull & Restore Cloud Data"}</span>
        </button>
      </div>

      {lastSync && (
        <p className="text-[11px] text-slate-400 text-right mt-2 font-mono">
          Last Cloud Sync: {lastSync}
        </p>
      )}
    </section>
  );
}
