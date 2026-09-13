/* FitTrack: Supabase Cloud Database Bidirectional Sync Engine */
import { getSupabaseClient } from "./supabase";
import { getScopedKey } from "./user-store";

export interface SyncStats {
  isConfigured: boolean;
  status: "idle" | "syncing" | "synced" | "error";
  lastSyncTime: string | null;
  syncedRecords: number;
  errorMessage?: string;
}

const LAST_SYNC_KEY = "fittrack_supabase_last_sync";

export function getLastSyncTime(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY);
}

/**
 * 1. Push all Local Athlete Data into Supabase Cloud Database
 */
export async function pushLocalDataToSupabase(userEmail?: string): Promise<{ success: boolean; recordsSynced: number; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, recordsSynced: 0, message: "Supabase client is not configured. Please add your Supabase credentials in Settings." };
  }

  const email = (userEmail || localStorage.getItem("fittrack_user_email") || "athlete@fittrack.app").toLowerCase().trim();
  const userName = localStorage.getItem("fittrack_user_name") || "Athlete";
  let totalCount = 0;

  try {
    // 1. Ensure user row exists in Supabase
    await supabase.from("users").upsert({
      email,
      name: userName,
      login_method: "fittrack_auth",
      last_signed_in: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "email" });
    totalCount++;

    // 2. Athlete Profile / Calibration
    const calibrationStr = localStorage.getItem(getScopedKey("fittrack-calibration-settings", email));
    if (calibrationStr) {
      try {
        const cal = JSON.parse(calibrationStr);
        await supabase.from("athlete_profiles").upsert({
          user_email: email,
          weight_kg: Number(cal.weight || cal.weightKg || 75),
          height_cm: Number(cal.height || cal.heightCm || 175),
          age: Number(cal.age || 24),
          sex: (cal.gender || cal.sex || "male").toLowerCase(),
          activity_level: cal.activityLevel || "moderate",
          focus: cal.fitnessGoal || cal.focus || "Hypertrophy",
          goal_kcal: Number(cal.targetCalories || cal.goalKcal || 2400),
          goal_protein: Number(cal.targetProtein || cal.goalProtein || 160),
          goal_carbs: Number(cal.targetCarbs || cal.goalCarbs || 260),
          goal_fat: Number(cal.targetFat || cal.goalFat || 65),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_email" });
        totalCount++;
      } catch (err) {
        console.warn("[Supabase Sync] Profile calibration error:", err);
      }
    }

    // 3. Nutrition Entries
    const nutritionStr = localStorage.getItem(getScopedKey("fittrack_logged_nutrition_today", email));
    if (nutritionStr) {
      try {
        const entries = JSON.parse(nutritionStr);
        if (Array.isArray(entries) && entries.length > 0) {
          const formatted = entries.map((item: any) => ({
            user_email: email,
            meal_type: item.mealType || item.category || "Meal",
            label: item.label || item.name || "Logged Item",
            hindi_name: item.hindiName || null,
            portion_multiplier: item.portionMultiplier || 1.0,
            serving_size: item.servingSize || "1 serving",
            calories: Number(item.calories || 0),
            protein_grams: Number(item.protein || item.proteinGrams || 0),
            carb_grams: Number(item.carbs || item.carbGrams || 0),
            fat_grams: Number(item.fat || item.fatGrams || 0),
            is_veg: item.isVeg !== false,
            consumed_at: item.consumedAt || item.date || new Date().toISOString(),
          }));
          await supabase.from("nutrition_entries").insert(formatted);
          totalCount += formatted.length;
        }
      } catch (err) {
        console.warn("[Supabase Sync] Nutrition sync error:", err);
      }
    }

    // 4. Custom Indian Foods
    const customFoodsStr = localStorage.getItem(getScopedKey("fittrack_custom_indian_foods", email));
    if (customFoodsStr) {
      try {
        const foods = JSON.parse(customFoodsStr);
        if (Array.isArray(foods) && foods.length > 0) {
          const formattedFoods = foods.map((f: any) => ({
            user_email: email,
            name: f.name || "Custom Recipe",
            hindi_name: f.hindiName || null,
            category: f.category || "high_protein_veg",
            serving_size: f.servingSize || "1 serving",
            calories: Number(f.calories || 0),
            protein_grams: Number(f.proteinGrams || f.protein || 0),
            carb_grams: Number(f.carbGrams || f.carbs || 0),
            fat_grams: Number(f.fatGrams || f.fat || 0),
            is_veg: f.isVeg !== false,
            tags_json: f.tags || [],
          }));
          await supabase.from("custom_indian_foods").upsert(formattedFoods, { onConflict: "id" });
          totalCount += formattedFoods.length;
        }
      } catch (err) {
        console.warn("[Supabase Sync] Custom foods error:", err);
      }
    }

    // 5. Workouts & Sets
    const workoutsStr = localStorage.getItem(getScopedKey("fittrack_workout_history", email));
    if (workoutsStr) {
      try {
        const workouts = JSON.parse(workoutsStr);
        if (Array.isArray(workouts) && workouts.length > 0) {
          for (const w of workouts) {
            const { data: insertedWorkout } = await supabase.from("workout_entries").insert({
              user_email: email,
              title: w.title || "Workout Session",
              focus: w.focus || "General",
              movement_count: w.movementCount || (w.exercises ? w.exercises.length : 1),
              volume_kg: Number(w.volumeKg || 0),
              duration_minutes: Number(w.durationMinutes || 45),
              completed_at: w.completedAt || w.date || new Date().toISOString(),
            }).select("id").single();

            totalCount++;

            if (insertedWorkout && Array.isArray(w.sets) && w.sets.length > 0) {
              const setsToInsert = w.sets.map((s: any, idx: number) => ({
                workout_id: insertedWorkout.id,
                user_email: email,
                movement_id: s.movementId || "movement",
                movement_name: s.movementName || s.name || "Exercise",
                set_number: s.setNumber || idx + 1,
                weight_kg: Number(s.weightKg || s.weight || 0),
                reps: Number(s.reps || 0),
                rpe: Number(s.rpe || 8.0),
                calculated_1rm: Number(s.calculated1Rm || 0),
              }));
              await supabase.from("workout_sets").insert(setsToInsert);
              totalCount += setsToInsert.length;
            }
          }
        }
      } catch (err) {
        console.warn("[Supabase Sync] Workouts sync error:", err);
      }
    }

    // 6. Streaks
    const streakStr = localStorage.getItem(getScopedKey("fittrack-streak-data", email));
    if (streakStr) {
      try {
        const streak = JSON.parse(streakStr);
        await supabase.from("streak_records").upsert({
          user_email: email,
          current_streak: Number(streak.currentStreak || 0),
          longest_streak: Number(streak.longestStreak || 0),
          last_completed_date: streak.lastCompletedDate || "",
          freeze_count: Number(streak.freezeCount ?? 2),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_email" });
        totalCount++;
      } catch (err) {
        console.warn("[Supabase Sync] Streak sync error:", err);
      }
    }

    // 7. Favorites
    const favsStr = localStorage.getItem(getScopedKey("fittrack_favorite_exercises", email));
    if (favsStr) {
      try {
        const favs = JSON.parse(favsStr);
        if (Array.isArray(favs) && favs.length > 0) {
          const favRecords = favs.map((favId: string) => ({
            user_email: email,
            exercise_id: favId,
            exercise_name: favId.replace(/-/g, " "),
          }));
          await supabase.from("user_favorites").upsert(favRecords, { onConflict: "user_email,exercise_id" });
          totalCount += favRecords.length;
        }
      } catch (err) {
        console.warn("[Supabase Sync] Favorites sync error:", err);
      }
    }

    const nowStr = new Date().toLocaleString();
    localStorage.setItem(LAST_SYNC_KEY, nowStr);

    return {
      success: true,
      recordsSynced: totalCount,
      message: `Successfully synced ${totalCount} records to Supabase Cloud Database!`,
    };
  } catch (error: any) {
    console.error("[Supabase Sync] Push error:", error);
    return {
      success: false,
      recordsSynced: totalCount,
      message: error.message || "Failed to push records to Supabase.",
    };
  }
}

/**
 * 2. Pull Athlete Data from Supabase and Hydrate Local Storage
 */
export async function pullDataFromSupabase(userEmail?: string): Promise<{ success: boolean; message: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: "Supabase is not configured." };
  }

  const email = (userEmail || localStorage.getItem("fittrack_user_email") || "").toLowerCase().trim();
  if (!email) {
    return { success: false, message: "No active athlete profile email found." };
  }

  try {
    // 1. Pull Profile
    const { data: profile } = await supabase.from("athlete_profiles").select("*").eq("user_email", email).maybeSingle();
    if (profile) {
      const localCal = {
        weight: profile.weight_kg,
        height: profile.height_cm,
        age: profile.age,
        gender: profile.sex,
        activityLevel: profile.activity_level,
        fitnessGoal: profile.focus,
        targetCalories: profile.goal_kcal,
        targetProtein: profile.goal_protein,
        targetCarbs: profile.goal_carbs,
        targetFat: profile.goal_fat,
      };
      localStorage.setItem(getScopedKey("fittrack-calibration-settings", email), JSON.stringify(localCal));
    }

    // 2. Pull Nutrition
    const { data: nutrition } = await supabase.from("nutrition_entries").select("*").eq("user_email", email).order("consumed_at", { ascending: false }).limit(50);
    if (nutrition && nutrition.length > 0) {
      const formatted = nutrition.map((n) => ({
        mealType: n.meal_type,
        label: n.label,
        hindiName: n.hindi_name,
        portionMultiplier: Number(n.portion_multiplier),
        servingSize: n.serving_size,
        calories: n.calories,
        protein: Number(n.protein_grams),
        carbs: Number(n.carb_grams),
        fat: Number(n.fat_grams),
        isVeg: n.is_veg,
        consumedAt: n.consumed_at,
      }));
      localStorage.setItem(getScopedKey("fittrack_logged_nutrition_today", email), JSON.stringify(formatted));
    }

    // 3. Pull Workouts
    const { data: workouts } = await supabase.from("workout_entries").select("*").eq("user_email", email).order("completed_at", { ascending: false }).limit(40);
    if (workouts && workouts.length > 0) {
      localStorage.setItem(getScopedKey("fittrack_workout_history", email), JSON.stringify(workouts));
    }

    // 4. Pull Streaks
    const { data: streak } = await supabase.from("streak_records").select("*").eq("user_email", email).maybeSingle();
    if (streak) {
      localStorage.setItem(getScopedKey("fittrack-streak-data", email), JSON.stringify({
        currentStreak: streak.current_streak,
        longestStreak: streak.longest_streak,
        lastCompletedDate: streak.last_completed_date,
        freezeCount: streak.freeze_count,
      }));
    }

    // 5. Pull Favorites
    const { data: favs } = await supabase.from("user_favorites").select("exercise_id").eq("user_email", email);
    if (favs && favs.length > 0) {
      localStorage.setItem(getScopedKey("fittrack_favorite_exercises", email), JSON.stringify(favs.map((f) => f.exercise_id)));
    }

    return { success: true, message: "Successfully downloaded and restored cloud athlete data from Supabase." };
  } catch (err: any) {
    return { success: false, message: err.message || "Failed to pull data from Supabase." };
  }
}
