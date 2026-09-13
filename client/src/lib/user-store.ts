import {
  playNotificationSound,
  playAlarmSound,
  isSoundEnabled,
  setSoundEnabled,
  toggleSoundEnabled,
  type NotificationSoundType,
  type AlarmSoundType,
} from "./audio-cue";

export {
  playNotificationSound,
  playAlarmSound,
  isSoundEnabled,
  setSoundEnabled,
  toggleSoundEnabled,
  type NotificationSoundType,
  type AlarmSoundType,
};

export type WorkoutAlarmSound = "radar_pulse" | "digital_alarm" | "boxing_gong" | "kinetic_chime";

export type ExercisePreference = { favorite?: boolean; hidden?: boolean; viewedAt?: string };
export type NotificationRecord = { id: string; title: string; detail: string; kind: "milestone" | "reminder" | "system"; createdAt: string; read: boolean };
export type ReminderSettings = {
  enabled: boolean;
  time: string;
  days: string[];
  alarmSoundEnabled?: boolean;
  soundType?: WorkoutAlarmSound;
};
export type StreakData = { count: number; lastCompletedDate: string };
export type DailyStreak = StreakData;
export type AthleteProfile = { name: string; email: string; location: string; focus: string; photoDataUrl?: string };
export type ConnectedDevice = { id: string; name: string; detail: string; kind: "band" | "watch" | "log" };
export type ExerciseTarget = { sets: string; reps: string; completed: boolean; completedAt?: string };
export type ExerciseProgress = Record<string, ExerciseTarget>;
export type CalibrationSettings = { name: string; age: number; heightCm: number; weightKg: number; sex: "male" | "female"; activityLevel: "light" | "moderate" | "active" | "very_active"; goalKcal: number; goalProtein: number; goalCarbs: number; goalFat: number };

export const getActiveUserEmail = (): string => {
  try {
    const directEmail = localStorage.getItem("fittrack_user_email");
    if (directEmail && directEmail.trim()) return directEmail.toLowerCase().trim();
    const runtimeUser = localStorage.getItem("manus-runtime-user-info");
    if (runtimeUser) {
      const parsed = JSON.parse(runtimeUser);
      if (parsed?.email && typeof parsed.email === "string") return parsed.email.toLowerCase().trim();
    }
  } catch {}
  return "default_athlete";
};

export const getScopedKey = (baseKey: string, customEmail?: string): string => {
  const user = (customEmail && customEmail.trim()) || getActiveUserEmail();
  const cleanScope = user.replace(/[^a-z0-9]/gi, "_");
  return `${baseKey}__${cleanScope}`;
};

const preferenceKey = "fittrack-exercise-preferences";
const notificationKey = "fittrack-notifications";
const reminderKey = "fittrack-workout-reminders";
const streakKey = "fittrack-daily-streak";
const athleteProfileKey = "fittrack-athlete-profile";
const connectedDevicesKey = "fittrack-connected-devices";
const exerciseProgressKey = "fittrack-exercise-progress";
const calibrationSettingsKey = "fittrack-calibration-settings";

const defaultNotifications: NotificationRecord[] = [];

const getDefaultAthleteProfile = (): AthleteProfile => {
  const email = getActiveUserEmail();
  try {
    const cachedName = localStorage.getItem("fittrack_user_name");
    if (cachedName && cachedName.trim()) {
      return {
        name: cachedName.trim(),
        email: email && email !== "default_athlete" ? email : "athlete@fittrack.training",
        location: "Detecting location...",
        focus: "Hypertrophy & Strength",
      };
    }
  } catch {}

  if (email && email !== "default_athlete") {
    const usernamePart = email.split("@")[0] || "Athlete";
    const cleanName = usernamePart
      .split(/[\._\-]/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
    return { name: cleanName, email: email, location: "Detecting location...", focus: "Hypertrophy & Strength" };
  }
  return { name: "Athlete", email: "athlete@fittrack.training", location: "Detecting location...", focus: "Hypertrophy & Strength" };
};
const defaultConnectedDevices: ConnectedDevice[] = [];
const defaultCalibrationSettings = (): CalibrationSettings => {
  const profile = getDefaultAthleteProfile();
  return { name: profile.name, age: 26, heightCm: 175, weightKg: 70, sex: "male", activityLevel: "moderate", goalKcal: 2400, goalProtein: 150, goalCarbs: 270, goalFat: 65 };
};

const safeRead = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(getScopedKey(key));
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
};
const write = <T,>(key: string, value: T) => localStorage.setItem(getScopedKey(key), JSON.stringify(value));
export const getExercisePreferences = () => safeRead<Record<string, ExercisePreference>>(preferenceKey, {});
export const saveExercisePreferences = (value: Record<string, ExercisePreference>) => write(preferenceKey, value);
export const getNotifications = () => safeRead<NotificationRecord[]>(notificationKey, defaultNotifications);
export const saveNotifications = (value: NotificationRecord[]) => write(notificationKey, value);
export const pushMilestoneNotification = (title: string, detail: string) => {
  const notifications = getNotifications();
  const id = `milestone-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  if (!notifications.some((item) => item.id === id)) {
    saveNotifications([{ id, title, detail, kind: "milestone", createdAt: new Date().toISOString(), read: false }, ...notifications]);
    playNotificationSound("milestone");
  }
};
export const getReminderSettings = () =>
  safeRead<ReminderSettings>(reminderKey, {
    enabled: true,
    time: "18:30",
    days: ["Mon", "Wed", "Fri"],
    alarmSoundEnabled: true,
    soundType: "radar_pulse",
  });
export const saveReminderSettings = (value: ReminderSettings) => write(reminderKey, value);
export const getAthleteProfile = () => safeRead<AthleteProfile>(athleteProfileKey, getDefaultAthleteProfile());
export const saveAthleteProfile = (value: AthleteProfile) => {
  if (value.name && value.name.trim()) {
    try {
      localStorage.setItem("fittrack_user_name", value.name.trim());
    } catch {}
  }
  write(athleteProfileKey, value);
};
export const getConnectedDevices = () => safeRead<ConnectedDevice[]>(connectedDevicesKey, defaultConnectedDevices);
export const saveConnectedDevices = (value: ConnectedDevice[]) => write(connectedDevicesKey, value);
export const getExerciseProgress = (): ExerciseProgress => {
  const raw = safeRead<ExerciseProgress>(exerciseProgressKey, {});
  const now = Date.now();
  let changed = false;
  const cleaned: ExerciseProgress = {};

  Object.entries(raw).forEach(([id, target]) => {
    if (target.completed) {
      if (target.completedAt) {
        const completedTime = new Date(target.completedAt).getTime();
        const is24hPassed = now - completedTime >= 24 * 60 * 60 * 1000;
        const isPreviousDay = new Date(target.completedAt).toDateString() !== new Date().toDateString();
        if (is24hPassed || isPreviousDay) {
          cleaned[id] = { ...target, completed: false, completedAt: undefined };
          changed = true;
          return;
        }
      } else {
        cleaned[id] = { ...target, completed: false, completedAt: undefined };
        changed = true;
        return;
      }
    }
    cleaned[id] = target;
  });

  if (changed) {
    write(exerciseProgressKey, cleaned);
  }
  return cleaned;
};
export const saveExerciseProgress = (value: ExerciseProgress) => write(exerciseProgressKey, value);
export const getCalibrationSettings = () => safeRead<CalibrationSettings>(calibrationSettingsKey, defaultCalibrationSettings());
export const saveCalibrationSettings = (value: CalibrationSettings) => write(calibrationSettingsKey, value);
export const resetCalibrationSettings = () => { localStorage.removeItem(calibrationSettingsKey); return defaultCalibrationSettings(); };
const dateKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const dayDifference = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00`) - Date.parse(`${from}T00:00:00`)) / 86400000);
const defaultStreak = (): StreakData => ({ count: 0, lastCompletedDate: "" });
export const getStreak = () => safeRead<StreakData>(streakKey, defaultStreak());
export const getDailyStreak = getStreak;
export const saveStreak = (value: StreakData) => write(streakKey, value);
export const saveDailyStreak = saveStreak;
export const advanceStreak = () => { const current = getStreak(); const today = dateKey(); if (current.lastCompletedDate === today) return { streak: current, advanced: false, alreadyRecorded: true }; const difference = current.lastCompletedDate ? dayDifference(current.lastCompletedDate, today) : 99; const next: StreakData = { count: difference === 1 ? current.count + 1 : 1, lastCompletedDate: today }; saveStreak(next); return { streak: next, advanced: true, alreadyRecorded: false }; };
export const recordDailyWorkout = advanceStreak;

export type ExperienceTier = "complete_beginner" | "beginner" | "intermediate" | "advanced";

const experienceTierKey = "fittrack-experience-tier";
export const getExperienceTier = (): ExperienceTier => {
  const tier = safeRead<ExperienceTier>(experienceTierKey, "beginner");
  return tier;
};
export const saveExperienceTier = (tier: ExperienceTier) => {
  write(experienceTierKey, tier);
  // Also sync legacy boolean mode
  write(experienceModeKey, tier === "complete_beginner" || tier === "beginner" ? "beginner" : "advanced");
};

const experienceModeKey = "fittrack-experience-mode";
export const getExperienceMode = (): "beginner" | "advanced" => {
  const tier = getExperienceTier();
  if (tier === "complete_beginner" || tier === "beginner") return "beginner";
  return "advanced";
};
export const saveExperienceMode = (mode: "beginner" | "advanced") => {
  write(experienceModeKey, mode);
  write(experienceTierKey, mode === "beginner" ? "beginner" : "advanced");
};

export type HydrationReminderSettings = {
  enabled: boolean;
  intervalMinutes: number; // 30, 45, 60, 90, 120
  startTime: string; // "08:00"
  endTime: string; // "22:00"
  targetDailyLiters: number; // 3.0
  alarmSoundEnabled: boolean;
  soundType: "water_droplet" | "gentle_bell" | "digital_beep";
};

const defaultHydrationSettings: HydrationReminderSettings = {
  enabled: true,
  intervalMinutes: 60,
  startTime: "08:00",
  endTime: "22:00",
  targetDailyLiters: 3.5,
  alarmSoundEnabled: true,
  soundType: "water_droplet",
};

const hydrationSettingsKey = "fittrack-hydration-reminders";
export const getHydrationReminderSettings = (): HydrationReminderSettings => {
  return safeRead<HydrationReminderSettings>(hydrationSettingsKey, defaultHydrationSettings);
};
export const saveHydrationReminderSettings = (settings: HydrationReminderSettings) => {
  write(hydrationSettingsKey, settings);
};

export const getTodayHydrationMl = (): number => {
  const key = `${getScopedKey("fittrack_hydration_today")}_${dateKey()}`;
  return safeRead<number>(key, 0);
};

export const addHydrationMl = (ml: number): number => {
  const key = `${getScopedKey("fittrack_hydration_today")}_${dateKey()}`;
  const current = getTodayHydrationMl();
  const next = Math.max(0, current + ml);
  write(key, next);
  return next;
};

export function playHydrationChime(soundType: "water_droplet" | "gentle_bell" | "digital_beep" = "water_droplet") {
  playAlarmSound(soundType);
}

export const isProfileConfigured = (email?: string): boolean => {
  try {
    const targetEmail = email || getActiveUserEmail();
    if (!targetEmail || targetEmail === "default_athlete") {
      const globalConfigured = localStorage.getItem("fittrack_profile_configured");
      return globalConfigured === "true";
    }
    const cleanScope = targetEmail.replace(/[^a-z0-9]/gi, "_");
    const configured = localStorage.getItem(`fittrack_profile_configured__${cleanScope}`);
    if (configured === "true") return true;

    const onboarded = localStorage.getItem(`fittrack_onboarding_completed__${cleanScope}`);
    if (onboarded === "true") return true;

    // Check if calibration settings exist with custom weight & height
    const rawCalib = localStorage.getItem(`fittrack-calibration-settings__${cleanScope}`);
    if (rawCalib) {
      const parsed = JSON.parse(rawCalib);
      if (parsed?.weightKg && parsed?.heightCm && parsed?.age) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
};

export const hasCompletedProfile = (email?: string): boolean => {
  return isProfileConfigured(email);
};

export const markProfileConfigured = (email?: string): void => {
  try {
    const targetEmail = email || getActiveUserEmail();
    const cleanScope = targetEmail ? targetEmail.replace(/[^a-z0-9]/gi, "_") : "";
    if (cleanScope) {
      localStorage.setItem(`fittrack_profile_configured__${cleanScope}`, "true");
      localStorage.setItem(`fittrack_onboarding_completed__${cleanScope}`, "true");
      localStorage.setItem(`fittrack_rexi_welcomed__${cleanScope}`, "true");
    }
    localStorage.setItem(getScopedKey("fittrack_profile_configured"), "true");
    localStorage.setItem(getScopedKey("fittrack_onboarding_completed"), "true");
    localStorage.setItem("fittrack_profile_configured", "true");
    sessionStorage.setItem("fittrack_rexi_welcomed", "true");
    localStorage.removeItem("fittrack_trigger_rexi_welcome");
  } catch {}
};

export const resetProfileConfigured = (email?: string): void => {
  try {
    const targetEmail = email || getActiveUserEmail();
    const cleanScope = targetEmail ? targetEmail.replace(/[^a-z0-9]/gi, "_") : "";
    if (cleanScope) {
      localStorage.removeItem(`fittrack_profile_configured__${cleanScope}`);
      localStorage.removeItem(`fittrack_onboarding_completed__${cleanScope}`);
      localStorage.removeItem(`fittrack_rexi_welcomed__${cleanScope}`);
    }
    localStorage.removeItem(getScopedKey("fittrack_profile_configured"));
    localStorage.removeItem(getScopedKey("fittrack_onboarding_completed"));
    sessionStorage.removeItem("fittrack_rexi_welcomed");
  } catch {}
};
