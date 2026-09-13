import type { GpsSessionInput } from "../shared/fitness-contract";
// Type-only import: the Drizzle MySQL runtime is intentionally not used (the live
// DB is Postgres via Supabase-JS). The User/InsertUser types are still the shared
// source of truth and are re-exported through shared/types.ts.
import type { InsertUser } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { getSupabaseServerClient } from "./supabase";

// In-memory fallback cache when Supabase is not configured (local/demo path).
// NOTE: resets on every serverless invocation (e.g. Vercel) — best-effort only.
// All entries are scoped by the athlete's real email.
const _memoryNutrition: any[] = [];
const _memoryWorkouts: any[] = [];
const _memoryMetrics: any[] = [];
const _memoryGps: any[] = [];

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("users").upsert(
        {
          open_id: user.openId,
          name: user.name || "Athlete",
          email: user.email || `${user.openId}@fittrack.local`,
          login_method: user.loginMethod || "custom",
          experience_level: user.experienceLevel || "beginner",
          role: user.role || (user.openId === ENV.ownerOpenId ? "admin" : "user"),
          last_signed_in: user.lastSignedIn ? new Date(user.lastSignedIn).toISOString() : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "open_id" }
      );
    } catch (err) {
      console.warn("[Supabase] upsertUser error:", err);
    }
  }
}

export async function getUserByOpenId(openId: string) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("open_id", openId).maybeSingle();
      if (data && !error) {
        return {
          id: Number(data.id),
          openId: data.open_id,
          name: data.name,
          email: data.email,
          loginMethod: data.login_method,
          experienceLevel: data.experience_level,
          role: data.role,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
          lastSignedIn: new Date(data.last_signed_in),
        } as any;
      }
    } catch (err) {
      console.warn("[Supabase] getUserByOpenId error:", err);
    }
  }
  return undefined;
}

// Nutrition & Indian Foods
export async function listNutritionEntries(userEmail: string) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("nutrition_entries")
        .select("*")
        .eq("user_email", userEmail)
        .order("consumed_at", { ascending: false })
        .limit(100);
      if (data && !error) {
        return data.map((d: any) => ({
          id: Number(d.id),
          userEmail,
          mealType: d.meal_type,
          label: d.label,
          hindiName: d.hindi_name,
          portionMultiplier: d.portion_multiplier ? String(d.portion_multiplier) : "1.00",
          servingSize: d.serving_size || "1 serving",
          calories: Number(d.calories),
          proteinGrams: String(d.protein_grams),
          carbGrams: String(d.carb_grams),
          fatGrams: String(d.fat_grams),
          isVeg: d.is_veg ? 1 : 0,
          consumedAt: new Date(d.consumed_at),
          createdAt: new Date(d.created_at),
        }));
      }
    } catch (err) {
      console.warn("[Supabase] listNutritionEntries error:", err);
    }
  }

  return _memoryNutrition.filter((n) => n.userEmail === userEmail);
}

export async function createNutritionEntry(
  userEmail: string,
  entry: {
    mealType: string;
    label: string;
    hindiName?: string;
    portionMultiplier?: number;
    calories: number;
    proteinGrams: number;
    carbGrams: number;
    fatGrams: number;
    isVeg?: boolean;
    consumedAt: Date;
  }
) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("nutrition_entries").insert({
        user_email: userEmail,
        meal_type: entry.mealType,
        label: entry.label,
        hindi_name: entry.hindiName || null,
        portion_multiplier: entry.portionMultiplier || 1.0,
        serving_size: "1 serving",
        calories: entry.calories,
        protein_grams: entry.proteinGrams,
        carb_grams: entry.carbGrams,
        fat_grams: entry.fatGrams,
        is_veg: entry.isVeg !== false,
        consumed_at: entry.consumedAt.toISOString(),
      });
      return;
    } catch (err) {
      console.warn("[Supabase] createNutritionEntry error:", err);
    }
  }

  _memoryNutrition.unshift({ id: Date.now(), userEmail, ...entry, createdAt: new Date() });
}

export async function listCustomIndianFoods(_userEmail: string) {
  // Custom foods are managed client-side (localStorage); no server list on the
  // Supabase-JS path. Returns empty for API compatibility.
  return [] as any[];
}

// Workouts & Sets
export async function listWorkoutEntries(userEmail: string) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("workout_entries")
        .select("*")
        .eq("user_email", userEmail)
        .order("completed_at", { ascending: false })
        .limit(60);
      if (data && !error) {
        return data.map((d: any) => ({
          id: Number(d.id),
          userEmail,
          title: d.title,
          focus: d.focus,
          movementCount: Number(d.movement_count),
          volumeKg: String(d.volume_kg),
          durationMinutes: Number(d.duration_minutes),
          completedAt: new Date(d.completed_at),
          createdAt: new Date(d.created_at),
        }));
      }
    } catch (err) {
      console.warn("[Supabase] listWorkoutEntries error:", err);
    }
  }

  return _memoryWorkouts.filter((w) => w.userEmail === userEmail);
}

export async function createWorkoutEntry(
  userEmail: string,
  entry: {
    title: string;
    focus: string;
    movementCount: number;
    volumeKg: number;
    durationMinutes?: number;
    completedAt: Date;
  }
) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("workout_entries").insert({
        user_email: userEmail,
        title: entry.title,
        focus: entry.focus,
        movement_count: entry.movementCount,
        volume_kg: entry.volumeKg,
        duration_minutes: entry.durationMinutes || 45,
        completed_at: entry.completedAt.toISOString(),
      });
      return { success: true };
    } catch (err) {
      console.warn("[Supabase] createWorkoutEntry error:", err);
    }
  }

  _memoryWorkouts.unshift({ id: Date.now(), userEmail, ...entry, createdAt: new Date() });
  return { success: true };
}

// Biometrics
export async function listMetricEntries(userEmail: string) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("metric_entries")
        .select("*")
        .eq("user_email", userEmail)
        .order("captured_at", { ascending: false })
        .limit(90);
      if (data && !error) {
        return data.map((d: any) => ({
          id: Number(d.id),
          userEmail,
          weightKg: String(d.weight_kg),
          bodyFatPercent: d.body_fat_percent ? String(d.body_fat_percent) : null,
          notes: d.notes,
          capturedAt: new Date(d.captured_at),
          createdAt: new Date(d.created_at),
        }));
      }
    } catch (err) {
      console.warn("[Supabase] listMetricEntries error:", err);
    }
  }

  return _memoryMetrics.filter((m) => m.userEmail === userEmail);
}

export async function createMetricEntry(userEmail: string, entry: { weightKg: number; bodyFatPercent?: number; notes?: string; capturedAt: Date }) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("metric_entries").insert({
        user_email: userEmail,
        weight_kg: entry.weightKg,
        body_fat_percent: entry.bodyFatPercent || null,
        notes: entry.notes || null,
        captured_at: entry.capturedAt.toISOString(),
      });
      return;
    } catch (err) {
      console.warn("[Supabase] createMetricEntry error:", err);
    }
  }

  _memoryMetrics.unshift({ id: Date.now(), userEmail, ...entry, createdAt: new Date() });
}

// GPS Sessions
export async function listGpsSessions(userEmail: string) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("gps_sessions")
        .select("*")
        .eq("user_email", userEmail)
        .order("started_at", { ascending: false })
        .limit(40);
      if (data && !error) {
        return data.map((d: any) => ({
          id: Number(d.id),
          userEmail,
          label: d.label,
          startedAt: new Date(d.started_at),
          endedAt: new Date(d.ended_at),
          durationSeconds: Number(d.duration_seconds),
          distanceMeters: String(d.distance_meters),
          averageSpeedKph: String(d.average_speed_kph),
          routeJson: typeof d.route_json === "string" ? d.route_json : JSON.stringify(d.route_json),
          createdAt: new Date(d.created_at),
        }));
      }
    } catch (err) {
      console.warn("[Supabase] listGpsSessions error:", err);
    }
  }

  return _memoryGps.filter((g) => g.userEmail === userEmail);
}

export async function createGpsSession(userEmail: string, session: GpsSessionInput) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("gps_sessions").insert({
        user_email: userEmail,
        label: session.label,
        started_at: session.startedAt.toISOString(),
        ended_at: session.endedAt.toISOString(),
        duration_seconds: session.durationSeconds,
        distance_meters: session.distanceMeters,
        average_speed_kph: session.averageSpeedKph,
        route_json: session.points,
      });
      return;
    } catch (err) {
      console.warn("[Supabase] createGpsSession error:", err);
    }
  }

  _memoryGps.unshift({ id: Date.now(), userEmail, ...session, createdAt: new Date() });
}

export async function deleteGpsSession(userEmail: string, sessionId: number) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("gps_sessions").delete().eq("id", sessionId).eq("user_email", userEmail);
      return;
    } catch (err) {
      console.warn("[Supabase] deleteGpsSession error:", err);
    }
  }

  const idx = _memoryGps.findIndex((g) => g.id === sessionId && g.userEmail === userEmail);
  if (idx !== -1) _memoryGps.splice(idx, 1);
}
