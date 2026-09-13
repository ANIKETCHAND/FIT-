/** Kinetic Anatomy Lab data layer: structured muscle and training data powers the body and diagnostic UI. */
export type MuscleId =
  | "chest"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "core"
  | "back"
  | "glutes"
  | "quads"
  | "hamstrings"
  | "calves";

export type MuscleInfo = {
  id: MuscleId;
  label: string;
  anatomicalName: string;
  status: "Ready" | "Recovered" | "Building";
  lastTrained: string;
  weeklyVolume: string;
  score: number;
  intensity: string;
  exercises: { name: string; sets: number; reps: string; load: string; volume: string }[];
  accent: string;
};

export type RecoveryStatus = "recovered" | "recovering" | "rest";

export type RecoveryDetail = {
  status: RecoveryStatus;
  label: string;
  color: string;
  emissive: string;
  action: string;
};

export function getRecoveryStatus(score: number): RecoveryDetail {
  if (score >= 80) {
    return {
      status: "recovered",
      label: "Fully Recovered",
      color: "#22c55e",
      emissive: "#15803d",
      action: "Fully recovered and primed for heavy compound progression and maximum load.",
    };
  }
  if (score >= 65) {
    return {
      status: "recovering",
      label: "Recovering",
      color: "#f59e0b",
      emissive: "#b45309",
      action: "Moderate recovery. Optimal for accessory work, higher volume, or mobility flow.",
    };
  }
  return {
    status: "rest",
    label: "Needs Rest",
    color: "#ef4444",
    emissive: "#991b1b",
    action: "High residual fatigue detected. Prioritize sleep and recovery before heavy loading.",
  };
}

import { getScopedKey } from "./user-store";

export interface MuscleRecoveryRecord {
  lastTrainedTimestamp: number;
  setsCompleted: number;
  volumeKg: number;
  fatigueBaseline: number;
}

export type MuscleRecoveryMap = Partial<Record<MuscleId, MuscleRecoveryRecord>>;

const RECOVERY_STORAGE_KEY = "fittrack_muscle_recovery";

/**
 * Maps exercise focus or movement names to standard MuscleId
 */
export function focusToMuscleId(focus: string): MuscleId {
  const f = focus.toLowerCase();
  if (f.includes("chest") || f.includes("pec") || f.includes("bench") || f.includes("push")) return "chest";
  if (f.includes("shoulder") || f.includes("delt") || f.includes("press")) return "shoulders";
  if (f.includes("bicep") || f.includes("curl") || f.includes("arm")) return "biceps";
  if (f.includes("tricep") || f.includes("pushdown") || f.includes("dips")) return "triceps";
  if (f.includes("core") || f.includes("ab") || f.includes("crunch") || f.includes("plank")) return "core";
  if (f.includes("back") || f.includes("lat") || f.includes("row") || f.includes("pull")) return "back";
  if (f.includes("glute") || f.includes("hip")) return "glutes";
  if (f.includes("quad") || f.includes("squat") || f.includes("leg press") || f.includes("leg ext")) return "quads";
  if (f.includes("hamstring") || f.includes("deadlift") || f.includes("curl")) return "hamstrings";
  if (f.includes("calf") || f.includes("calves") || f.includes("raise")) return "calves";
  return "chest";
}

/**
 * Base Anatomical Movements & Baseline Metadata for all 10 Muscle Groups
 */
export const baseMuscleDefinitions: Record<MuscleId, Omit<MuscleInfo, "score" | "status" | "intensity" | "lastTrained" | "weeklyVolume" | "accent">> = {
  chest: {
    id: "chest",
    label: "Chest",
    anatomicalName: "Pectoralis Major",
    exercises: [
      { name: "Bench Press", sets: 4, reps: "6–8", load: "82.5 kg", volume: "2,310 kg" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "10", load: "30 kg", volume: "1,800 kg" },
      { name: "Cable Fly", sets: 3, reps: "12", load: "27.5 kg", volume: "990 kg" },
    ],
  },
  shoulders: {
    id: "shoulders",
    label: "Shoulders",
    anatomicalName: "Deltoids",
    exercises: [
      { name: "Seated Press", sets: 4, reps: "8", load: "42.5 kg", volume: "1,360 kg" },
      { name: "Lateral Raise", sets: 4, reps: "12", load: "10 kg", volume: "960 kg" },
      { name: "Rear Delt Fly", sets: 3, reps: "15", load: "25 kg", volume: "1,125 kg" },
    ],
  },
  biceps: {
    id: "biceps",
    label: "Biceps",
    anatomicalName: "Biceps Brachii",
    exercises: [
      { name: "EZ Bar Curl", sets: 3, reps: "10", load: "32.5 kg", volume: "975 kg" },
      { name: "Incline Curl", sets: 3, reps: "12", load: "12 kg", volume: "864 kg" },
      { name: "Hammer Curl", sets: 3, reps: "10", load: "16 kg", volume: "480 kg" },
    ],
  },
  triceps: {
    id: "triceps",
    label: "Triceps",
    anatomicalName: "Triceps Brachii",
    exercises: [
      { name: "Close Grip Press", sets: 3, reps: "8", load: "60 kg", volume: "1,440 kg" },
      { name: "Rope Pushdown", sets: 3, reps: "12", load: "30 kg", volume: "1,080 kg" },
      { name: "Overhead Extension", sets: 2, reps: "12", load: "14 kg", volume: "336 kg" },
    ],
  },
  core: {
    id: "core",
    label: "Core",
    anatomicalName: "Rectus Abdominis",
    exercises: [
      { name: "Hanging Leg Raise", sets: 4, reps: "12", load: "Bodyweight", volume: "48 reps" },
      { name: "Cable Crunch", sets: 4, reps: "15", load: "45 kg", volume: "2,700 kg" },
      { name: "Pallof Press", sets: 3, reps: "12", load: "22.5 kg", volume: "810 kg" },
    ],
  },
  back: {
    id: "back",
    label: "Back",
    anatomicalName: "Latissimus Dorsi",
    exercises: [
      { name: "Weighted Pull-up", sets: 4, reps: "6", load: "+15 kg", volume: "360 kg" },
      { name: "Chest Supported Row", sets: 4, reps: "10", load: "62.5 kg", volume: "2,500 kg" },
      { name: "Lat Pulldown", sets: 3, reps: "12", load: "55 kg", volume: "1,980 kg" },
    ],
  },
  glutes: {
    id: "glutes",
    label: "Glutes",
    anatomicalName: "Gluteus Maximus",
    exercises: [
      { name: "Barbell Hip Thrust", sets: 4, reps: "8", load: "105 kg", volume: "3,360 kg" },
      { name: "Bulgarian Split Squat", sets: 3, reps: "10", load: "22 kg", volume: "1,320 kg" },
      { name: "Cable Kickback", sets: 3, reps: "15", load: "18 kg", volume: "810 kg" },
    ],
  },
  quads: {
    id: "quads",
    label: "Quads",
    anatomicalName: "Quadriceps",
    exercises: [
      { name: "Front Squat", sets: 4, reps: "6", load: "90 kg", volume: "2,160 kg" },
      { name: "Leg Press", sets: 4, reps: "10", load: "160 kg", volume: "6,400 kg" },
      { name: "Leg Extension", sets: 3, reps: "12", load: "45 kg", volume: "1,620 kg" },
    ],
  },
  hamstrings: {
    id: "hamstrings",
    label: "Hamstrings",
    anatomicalName: "Hamstrings",
    exercises: [
      { name: "Romanian Deadlift", sets: 4, reps: "8", load: "90 kg", volume: "2,880 kg" },
      { name: "Lying Leg Curl", sets: 4, reps: "12", load: "47.5 kg", volume: "2,280 kg" },
      { name: "Nordic Curl", sets: 3, reps: "6", load: "Bodyweight", volume: "18 reps" },
    ],
  },
  calves: {
    id: "calves",
    label: "Calves",
    anatomicalName: "Gastrocnemius",
    exercises: [
      { name: "Standing Calf Raise", sets: 4, reps: "12", load: "75 kg", volume: "3,600 kg" },
      { name: "Seated Calf Raise", sets: 3, reps: "15", load: "45 kg", volume: "2,025 kg" },
      { name: "Tibialis Raise", sets: 3, reps: "15", load: "20 kg", volume: "900 kg" },
    ],
  },
};

/**
 * Get all stored muscle recovery records from scoped localStorage
 */
export function getStoredRecoveryMap(): MuscleRecoveryMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(getScopedKey(RECOVERY_STORAGE_KEY));
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

/**
 * Calculate dynamic recovery metrics for a specific muscle group
 * Follows asymptotic recovery function: S(t) = S0 + (100 - S0) * (1 - e^(-t / tau))
 */
export function calculateMuscleTelemetry(
  muscleId: MuscleId,
  record?: MuscleRecoveryRecord | null
): {
  score: number;
  status: "Ready" | "Recovered" | "Building";
  intensity: string;
  lastTrained: string;
  weeklyVolume: string;
  accent: string;
} {
  // NEW USER / UNTRAINED STATE: 100% Fully Recovered by default
  if (!record || !record.lastTrainedTimestamp) {
    return {
      score: 100,
      status: "Recovered",
      intensity: "Fully Recovered",
      lastTrained: "Ready for training",
      weeklyVolume: "0 kg",
      accent: "#22c55e",
    };
  }

  const hoursElapsed = Math.max(0, (Date.now() - record.lastTrainedTimestamp) / (1000 * 60 * 60));
  const s0 = record.fatigueBaseline ?? 35;
  const tau = 48.0; // 48-hour recovery time constant

  // Asymptotic regeneration curve
  const currentScore = Math.min(100, Math.round(s0 + (100 - s0) * (1 - Math.exp(-hoursElapsed / tau))));
  const recoveryInfo = getRecoveryStatus(currentScore);

  // Dynamic relative time string
  let lastTrainedStr = "Just now";
  if (hoursElapsed < 0.1) {
    lastTrainedStr = "Just now";
  } else if (hoursElapsed < 1) {
    lastTrainedStr = `${Math.round(hoursElapsed * 60)} mins ago`;
  } else if (hoursElapsed < 2) {
    lastTrainedStr = "1 hour ago";
  } else if (hoursElapsed < 24) {
    lastTrainedStr = `${Math.floor(hoursElapsed)} hours ago`;
  } else if (hoursElapsed < 48) {
    lastTrainedStr = "Yesterday";
  } else {
    lastTrainedStr = `${Math.floor(hoursElapsed / 24)} days ago`;
  }

  const volumeStr = record.volumeKg > 0 ? `${Math.round(record.volumeKg).toLocaleString()} kg` : "0 kg";

  return {
    score: currentScore,
    status: currentScore >= 80 ? "Recovered" : currentScore >= 65 ? "Ready" : "Building",
    intensity: recoveryInfo.label,
    lastTrained: lastTrainedStr,
    weeklyVolume: volumeStr,
    accent: recoveryInfo.color,
  };
}

/**
 * Returns the dynamic muscle library evaluating real-time recovery states
 */
export function getDynamicMuscleLibrary(): Record<MuscleId, MuscleInfo> {
  const map = getStoredRecoveryMap();
  const result = {} as Record<MuscleId, MuscleInfo>;

  (Object.keys(baseMuscleDefinitions) as MuscleId[]).forEach((id) => {
    const base = baseMuscleDefinitions[id];
    const telemetry = calculateMuscleTelemetry(id, map[id]);
    result[id] = {
      ...base,
      ...telemetry,
    };
  });

  return result;
}

/**
 * Record a completed workout or set progress for a muscle group
 * Immediately drops muscle into Recovery Mode with exact baseline fatigue
 */
export function recordMuscleWorkout(
  muscleId: MuscleId,
  setsCompleted: number,
  volumeKg: number,
  customBaseline?: number
): void {
  if (typeof window === "undefined") return;
  try {
    const map = getStoredRecoveryMap();
    // Default baseline fatigue: 4 sets drops score to ~35%, 2 sets to ~65%
    const fatigueBaseline = customBaseline ?? Math.max(25, Math.min(65, 100 - setsCompleted * 15));

    map[muscleId] = {
      lastTrainedTimestamp: Date.now(),
      setsCompleted: Math.max(1, setsCompleted),
      volumeKg: Math.round(volumeKg),
      fatigueBaseline,
    };

    localStorage.setItem(getScopedKey(RECOVERY_STORAGE_KEY), JSON.stringify(map));
    window.dispatchEvent(new CustomEvent("fittrack:recovery-update", { detail: { muscleId, map } }));
  } catch (err) {
    console.error("Failed to record muscle recovery:", err);
  }
}

/**
 * Record live set progression during active training
 */
export function recordLiveSetProgress(
  muscleId: MuscleId,
  completedSets: number,
  totalSets: number,
  currentVolumeKg: number
): void {
  if (completedSets <= 0) return;
  const map = getStoredRecoveryMap();
  // Proportionally scale fatigue based on sets checked off
  const dropPerSet = 65 / Math.max(1, totalSets);
  const currentFatigue = Math.max(30, Math.round(100 - completedSets * dropPerSet));

  recordMuscleWorkout(muscleId, completedSets, currentVolumeKg, currentFatigue);
}

/**
 * Reset all muscle groups to 100% Fully Recovered (Default Fresh State)
 */
export function resetAllMuscleRecovery(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(getScopedKey(RECOVERY_STORAGE_KEY));
    window.dispatchEvent(new CustomEvent("fittrack:recovery-update", { detail: { reset: true } }));
  } catch {}
}

/**
 * Dynamic Proxy exporting muscleLibrary that always reflects current recovery state
 */
export const muscleLibrary: Record<MuscleId, MuscleInfo> = new Proxy(
  {} as Record<MuscleId, MuscleInfo>,
  {
    get(_target, prop: string) {
      const dynamicLib = getDynamicMuscleLibrary();
      return dynamicLib[prop as MuscleId] || dynamicLib.chest;
    },
    ownKeys() {
      return Object.keys(baseMuscleDefinitions);
    },
    getOwnPropertyDescriptor(_target, prop) {
      return {
        enumerable: true,
        configurable: true,
        value: getDynamicMuscleLibrary()[prop as MuscleId],
      };
    },
  }
);

export const macroData = [
  { label: "Protein", value: 142, goal: 180, unit: "g", color: "#c9ad7e" },
  { label: "Carbs", value: 214, goal: 280, unit: "g", color: "#c9ad7e" },
  { label: "Fat", value: 58, goal: 72, unit: "g", color: "#c9ad7e" },
];

export const weeklySessions = [
  { day: "M", value: 88, label: "Upper" }, { day: "T", value: 56, label: "Run" }, { day: "W", value: 94, label: "Lower" }, { day: "T", value: 21, label: "Rest" }, { day: "F", value: 74, label: "Push" }, { day: "S", value: 41, label: "Zone 2" }, { day: "S", value: 0, label: "Today" },
];
