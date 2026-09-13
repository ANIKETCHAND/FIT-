/* FitTrack: Client-Side High-Speed Database Sync & Backup Engine */
import { getScopedKey } from "./user-store";

export interface DatabaseBackupPayload {
  version: string;
  exportedAt: string;
  athleteEmail: string;
  athleteName: string;
  experienceMode: string;
  calibration: Record<string, any>;
  nutritionLogs: any[];
  customIndianFoods: any[];
  workoutLogs: any[];
  favorites: string[];
  streakData: Record<string, any>;
}

export interface DatabaseStats {
  status: "healthy" | "synced" | "offline";
  totalLoggedMeals: number;
  totalWorkouts: number;
  totalCustomFoods: number;
  totalFavorites: number;
  storageUsageKb: number;
  lastSyncedAt: string;
}

/**
 * 1. Export Complete FitTrack Athlete Database as JSON
 */
export function exportAthleteDatabase(): void {
  try {
    const userEmail = localStorage.getItem("fittrack_user_email") || "athlete@fittrack.app";
    const userName = localStorage.getItem("fittrack_user_name") || "Athlete";
    const experienceMode = localStorage.getItem("fittrack-experience-mode") || "beginner";

    const calibration = JSON.parse(localStorage.getItem(getScopedKey("fittrack-calibration-settings")) || "{}");
    const nutritionLogs = JSON.parse(localStorage.getItem(getScopedKey("fittrack_logged_nutrition_today")) || "[]");
    const customIndianFoods = JSON.parse(localStorage.getItem(getScopedKey("fittrack_custom_indian_foods")) || "[]");
    const workoutLogs = JSON.parse(localStorage.getItem(getScopedKey("fittrack_workout_history")) || "[]");
    const favorites = JSON.parse(localStorage.getItem(getScopedKey("fittrack_favorite_exercises")) || "[]");
    const streakData = JSON.parse(localStorage.getItem(getScopedKey("fittrack-streak-data")) || "{}");

    const payload: DatabaseBackupPayload = {
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      athleteEmail: userEmail,
      athleteName: userName,
      experienceMode,
      calibration,
      nutritionLogs,
      customIndianFoods,
      workoutLogs,
      favorites,
      streakData,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    const dateStr = new Date().toISOString().split("T")[0];
    downloadAnchor.setAttribute("download", `FitTrack_Backup_${dateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (error) {
    console.error("Failed to export athlete database:", error);
  }
}

/**
 * 2. Export Workout History to Clean CSV
 */
export function exportWorkoutCsv(): void {
  try {
    const workoutLogs = JSON.parse(localStorage.getItem(getScopedKey("fittrack_workout_history")) || "[]");
    
    let csv = "Date,Workout Title,Focus Muscle,Total Volume (kg),Movement Count\n";
    workoutLogs.forEach((item: any) => {
      const date = item.date || item.completedAt || new Date().toISOString();
      const title = (item.title || "Workout").replace(/,/g, " ");
      const focus = (item.focus || "Full Body").replace(/,/g, " ");
      const volume = item.volumeKg || 0;
      const count = item.movementCount || (item.exercises ? item.exercises.length : 1);
      csv += `"${date}","${title}","${focus}",${volume},${count}\n`;
    });

    const dataStr = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    const dateStr = new Date().toISOString().split("T")[0];
    downloadAnchor.setAttribute("download", `FitTrack_Workouts_${dateStr}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (error) {
    console.error("Failed to export CSV:", error);
  }
}

/**
 * 3. Import & Restore Database Backup
 */
export function importAthleteDatabase(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string) as DatabaseBackupPayload;
        if (!json.version) {
          throw new Error("Invalid FitTrack backup file format.");
        }

        if (json.calibration) {
          localStorage.setItem(getScopedKey("fittrack-calibration-settings"), JSON.stringify(json.calibration));
        }
        if (json.nutritionLogs) {
          localStorage.setItem(getScopedKey("fittrack_logged_nutrition_today"), JSON.stringify(json.nutritionLogs));
        }
        if (json.customIndianFoods) {
          localStorage.setItem(getScopedKey("fittrack_custom_indian_foods"), JSON.stringify(json.customIndianFoods));
        }
        if (json.workoutLogs) {
          localStorage.setItem(getScopedKey("fittrack_workout_history"), JSON.stringify(json.workoutLogs));
        }
        if (json.favorites) {
          localStorage.setItem(getScopedKey("fittrack_favorite_exercises"), JSON.stringify(json.favorites));
        }
        if (json.streakData) {
          localStorage.setItem(getScopedKey("fittrack-streak-data"), JSON.stringify(json.streakData));
        }
        if (json.experienceMode) {
          localStorage.setItem("fittrack-experience-mode", json.experienceMode);
        }

        resolve(true);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read backup file."));
    reader.readAsText(file);
  });
}

/**
 * 4. Get Live Database Health & Metrics
 */
export function getDatabaseStats(): DatabaseStats {
  try {
    const meals = JSON.parse(localStorage.getItem(getScopedKey("fittrack_logged_nutrition_today")) || "[]");
    const workouts = JSON.parse(localStorage.getItem(getScopedKey("fittrack_workout_history")) || "[]");
    const custom = JSON.parse(localStorage.getItem(getScopedKey("fittrack_custom_indian_foods")) || "[]");
    const favs = JSON.parse(localStorage.getItem(getScopedKey("fittrack_favorite_exercises")) || "[]");

    let totalChars = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("fittrack")) {
        totalChars += (localStorage.getItem(key) || "").length;
      }
    }

    return {
      status: "healthy",
      totalLoggedMeals: meals.length,
      totalWorkouts: workouts.length,
      totalCustomFoods: custom.length,
      totalFavorites: favs.length,
      storageUsageKb: Math.round((totalChars * 2) / 1024),
      lastSyncedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  } catch {
    return {
      status: "offline",
      totalLoggedMeals: 0,
      totalWorkouts: 0,
      totalCustomFoods: 0,
      totalFavorites: 0,
      storageUsageKb: 0,
      lastSyncedAt: "Never",
    };
  }
}

export const exportDatabaseJson = exportAthleteDatabase;
export const exportWorkoutHistoryCsv = exportWorkoutCsv;
export const getDatabaseTelemetry = getDatabaseStats;
