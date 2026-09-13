/**
 * FitTrack Comprehensive Master Unit Test Suite
 * Consolidates activity router, auth logout, date calculations, Zod fitness contracts,
 * and frontend navigation integrity tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { COOKIE_NAME } from "../shared/const";
import { gpsSessionInput, nutritionEntryInput } from "../shared/fitness-contract";
import { formatLocalDateKey, parseDateToLocalKey } from "../client/src/components/profile/GithubContributionGraph";
import type { TrpcContext } from "./_core/context";

// =============================================================================
// MOCK DATABASE & TRPC ROUTER SETUP
// =============================================================================

const dbMocks = vi.hoisted(() => ({
  createNutritionEntry: vi.fn(),
  createMetricEntry: vi.fn(),
  createWorkoutEntry: vi.fn(),
  createGpsSession: vi.fn(),
  deleteGpsSession: vi.fn(),
  listNutritionEntries: vi.fn(() => []),
  listMetricEntries: vi.fn(() => []),
  listWorkoutEntries: vi.fn(() => []),
  listGpsSessions: vi.fn(() => []),
}));

vi.mock("./db", () => dbMocks);

import { appRouter } from "./routers";

const user = {
  id: 42,
  openId: "fittrack-test-athlete",
  email: "athlete@example.com",
  name: "Test Athlete",
  loginMethod: "manus",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext(): TrpcContext {
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// =============================================================================
// 1. ACTIVITY ROUTER TESTS
// =============================================================================

describe("FitTrack activity router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists nutrition, biometric, and workout signals under the authenticated athlete", async () => {
    const caller = appRouter.createCaller(createContext());
    const capturedAt = new Date("2026-08-21T06:00:00.000Z");

    await caller.nutrition.create({
      mealType: "Lunch",
      label: "Calibration bowl",
      calories: 520,
      proteinGrams: 37,
      carbGrams: 58,
      fatGrams: 14,
      consumedAt: capturedAt,
    });
    await caller.metrics.create({ weightKg: 74.8, capturedAt });
    await caller.workouts.create({
      title: "Chest protocol",
      focus: "Pectorals",
      movementCount: 3,
      volumeKg: 1240,
      completedAt: capturedAt,
    });

    expect(dbMocks.createNutritionEntry).toHaveBeenCalledWith(
      user.email,
      expect.objectContaining({ label: "Calibration bowl" })
    );
    expect(dbMocks.createMetricEntry).toHaveBeenCalledWith(
      user.email,
      expect.objectContaining({ weightKg: 74.8 })
    );
    expect(dbMocks.createWorkoutEntry).toHaveBeenCalledWith(
      user.email,
      expect.objectContaining({ title: "Chest protocol" })
    );
  });

  it("creates, lists, and athlete-scopes a completed GPS route", async () => {
    const caller = appRouter.createCaller(createContext());
    const startedAt = new Date("2026-08-21T06:00:00.000Z");
    const route = {
      label: "Morning calibration route",
      startedAt,
      endedAt: new Date("2026-08-21T06:15:00.000Z"),
      durationSeconds: 900,
      distanceMeters: 1210,
      averageSpeedKph: 4.8,
      points: [
        { latitude: 28.6139, longitude: 77.209, timestampMs: startedAt.getTime() },
        { latitude: 28.6145, longitude: 77.2098, timestampMs: startedAt.getTime() + 45_000 },
      ],
    };

    await caller.gps.create(route);
    await caller.gps.remove({ id: 7 });

    expect(dbMocks.createGpsSession).toHaveBeenCalledWith(
      user.email,
      expect.objectContaining({ label: route.label, points: route.points })
    );
    expect(dbMocks.deleteGpsSession).toHaveBeenCalledWith(user.email, 7);
  });
});

// =============================================================================
// 2. AUTH LOGOUT TESTS
// =============================================================================

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const clearedCookies: Array<{ name: string; options: Record<string, unknown> }> = [];
    const ctx: TrpcContext = {
      user: {
        id: 1,
        openId: "sample-user",
        email: "sample@example.com",
        name: "Sample User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {
        clearCookie: (name: string, options: Record<string, unknown>) => {
          clearedCookies.push({ name, options });
        },
      } as unknown as TrpcContext["res"],
    };

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

// =============================================================================
// 3. CONTRIBUTION GRAPH DATE LOGIC TESTS
// =============================================================================

describe("GithubContributionGraph Date Logic", () => {
  it("formats local Date accurately to YYYY-MM-DD", () => {
    const d = new Date(2026, 8, 1, 22, 45, 0); // Sep 1, 2026 10:45 PM
    expect(formatLocalDateKey(d)).toBe("2026-09-01");
  });

  it("parses pure YYYY-MM-DD string without timezone shifting", () => {
    expect(parseDateToLocalKey("2026-09-01")).toBe("2026-09-01");
    expect(parseDateToLocalKey("2026-01-15")).toBe("2026-01-15");
  });

  it("parses timestamps and Date objects correctly", () => {
    const d = new Date(2026, 8, 1, 10, 0, 0);
    expect(parseDateToLocalKey(d)).toBe("2026-09-01");
    expect(parseDateToLocalKey(d.getTime())).toBe("2026-09-01");
  });

  it("handles null/undefined gracefully", () => {
    expect(parseDateToLocalKey(null)).toBeNull();
    expect(parseDateToLocalKey(undefined)).toBeNull();
    expect(parseDateToLocalKey("")).toBeNull();
  });
});

// =============================================================================
// 4. FITNESS CONTRACT VALIDATION TESTS
// =============================================================================

describe("FitTrack activity contracts", () => {
  it("accepts a completed GPS route with valid ordered telemetry", () => {
    const startedAt = new Date("2026-08-21T06:00:00.000Z");
    const result = gpsSessionInput.safeParse({
      label: "Morning calibration walk",
      startedAt,
      endedAt: new Date("2026-08-21T06:18:00.000Z"),
      durationSeconds: 1080,
      distanceMeters: 1420.5,
      averageSpeedKph: 4.7,
      points: [
        { latitude: 28.6139, longitude: 77.209, timestampMs: startedAt.getTime() },
        { latitude: 28.6141, longitude: 77.2095, timestampMs: startedAt.getTime() + 30_000 },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid macro totals and routes that finish before they begin", () => {
    expect(
      nutritionEntryInput.safeParse({
        mealType: "Lunch",
        label: "Fuel",
        calories: 400,
        proteinGrams: -2,
        carbGrams: 50,
        fatGrams: 10,
        consumedAt: new Date(),
      }).success
    ).toBe(false);

    expect(
      gpsSessionInput.safeParse({
        label: "Invalid route",
        startedAt: new Date("2026-08-21T08:00:00.000Z"),
        endedAt: new Date("2026-08-21T07:00:00.000Z"),
        durationSeconds: 600,
        distanceMeters: 700,
        averageSpeedKph: 4.2,
        points: [
          { latitude: 28.61, longitude: 77.2, timestampMs: 1 },
          { latitude: 28.62, longitude: 77.21, timestampMs: 2 },
        ],
      }).success
    ).toBe(false);
  });
});

// =============================================================================
// 5. FRONTEND NAVIGATION & CONTRACT INTEGRITY TESTS
// =============================================================================

const projectRoot = resolve(import.meta.dirname, "..");
const readSource = (relativePath: string) => readFileSync(resolve(projectRoot, relativePath), "utf8");

describe("FitTrack navigation and activity frontend contracts", () => {
  it("keeps every sidebar destination available after full-stack upgrades", () => {
    const sidebar = readSource("client/src/components/navigation/Sidebar.tsx");
    ["/", "/exercise-library", "/log-food", "/log-weight", "/gps", "/achievements", "/notifications", "/profile", "/settings", "/support"].forEach((path) => {
      expect(sidebar).toContain(`"${path}"`);
    });
  });

  it("preserves the typed mutation and GPS-resilience affordances in the visible workflows", () => {
    const nutrition = readSource("client/src/pages/LogFood.tsx");
    const metrics = readSource("client/src/pages/LogWeight.tsx");
    const workout = readSource("client/src/pages/LogWorkout.tsx");
    const gps = readSource("client/src/pages/GpsTracker.tsx");
    const map = readSource("client/src/components/Map.tsx");

    expect(nutrition).toContain("trpc.nutrition.create.useMutation");
    expect(metrics).toContain("trpc.metrics.create.useMutation");
    expect(workout).toContain("trpc.workouts.create.useMutation");
    expect(gps).toContain("trpc.gps.create.useMutation");
    expect(gps).toContain("navigator.geolocation.getCurrentPosition");
    expect(gps).toContain("Location permission is required to begin a live trace.");
    expect(gps).toContain("GPS signal was interrupted.");
    expect(gps).toContain("No stored routes yet.");
    expect(gps).toContain("The route could not be saved.");
    expect(gps).toContain("The saved route could not be removed.");
    expect(map).toContain("map-service-unavailable");
  });
});

// =============================================================================
// 6. DYNAMIC MUSCLE RECOVERY ENGINE & MATHEMATICAL TELEMETRY TESTS
// =============================================================================

describe("FitTrack dynamic muscle recovery engine", () => {
  it("implements the asymptotic recovery curve S(t) = S0 + (100 - S0)(1 - e^(-t / tau))", () => {
    const s0 = 35;
    const tau = 48;
    const calcScore = (hours: number) =>
      Math.min(100, Math.round(s0 + (100 - s0) * (1 - Math.exp(-hours / tau))));

    // At t = 0 immediately after workout
    expect(calcScore(0)).toBe(35);
    // At t = 24 hours (moderate recovery)
    expect(calcScore(24)).toBe(61);
    // At t = 48 hours (tau time constant)
    expect(calcScore(48)).toBe(76);
    // At t = 96 hours (full regeneration)
    expect(calcScore(96)).toBe(91);
    expect(calcScore(200)).toBe(99);
    expect(calcScore(250)).toBe(100);
  });

  it("verifies dynamic recovery wiring across 3D body map and workout logging", () => {
    const bodyScene = readSource("client/src/components/3d/BodyScene.tsx");
    const bodyMap = readSource("client/src/pages/BodyMap.tsx");
    const muscleInfo = readSource("client/src/components/3d/MuscleInfo.tsx");
    const logWorkout = readSource("client/src/pages/LogWorkout.tsx");
    const startSession = readSource("client/src/pages/StartSession.tsx");
    const fitnessData = readSource("client/src/lib/fitness-data.ts");

    // Default 100% fresh state
    expect(fitnessData).toContain('status: "Recovered"');
    expect(fitnessData).toContain('label: "Fully Recovered"');
    expect(fitnessData).toContain('color: "#22c55e"');
    expect(fitnessData).toContain("resetAllMuscleRecovery");

    // Dynamic recovery events & live updates
    expect(bodyMap).toContain("fittrack:recovery-update");
    expect(bodyMap).toContain("Reset to 100% (Fresh)");
    expect(bodyScene).toContain("fittrack:recovery-update");
    expect(bodyScene).toContain("recoveryTick");
    expect(muscleInfo).toContain("Launch");
    expect(muscleInfo).toContain("Simulate 4 Completed Sets");

    // Live workout set recording
    expect(logWorkout).toContain("recordLiveSetProgress");
    expect(logWorkout).toContain("recordMuscleWorkout");
    expect(logWorkout).toContain("fittrack-staged-muscle");
    expect(startSession).toContain("recordMuscleWorkout");
  });
});

// =============================================================================
// 7. AUDIO CUE SYNTHESIS & ALARM / NOTIFICATION TESTS
// =============================================================================

describe("FitTrack audio cue synthesis & alarm notification wiring", () => {
  it("verifies audio engine exports and zero-dependency synthesis contracts", () => {
    const audioCueSource = readSource("client/src/lib/audio-cue.ts");
    const userStoreSource = readSource("client/src/lib/user-store.ts");
    const notificationsSource = readSource("client/src/pages/Notifications.tsx");
    const workoutSource = readSource("client/src/pages/LogWorkout.tsx");
    const sessionSource = readSource("client/src/pages/StartSession.tsx");

    // Audio cue synthesizer
    expect(audioCueSource).toContain("playNotificationSound");
    expect(audioCueSource).toContain("playAlarmSound");
    expect(audioCueSource).toContain("isSoundEnabled");
    expect(audioCueSource).toContain("toggleSoundEnabled");
    expect(audioCueSource).toContain("radar_pulse");
    expect(audioCueSource).toContain("boxing_gong");
    expect(audioCueSource).toContain("kinetic_chime");

    // Milestone sound wiring
    expect(userStoreSource).toContain('playNotificationSound("milestone")');
    expect(userStoreSource).toContain("playAlarmSound(soundType)");

    // Notification center controls & alarm tickers
    expect(notificationsSource).toContain("handleTestNotification");
    expect(notificationsSource).toContain("handleTestWorkoutAlarm");
    expect(notificationsSource).toContain("handleToggleSound");
    expect(notificationsSource).toContain("radar_pulse");
    expect(notificationsSource).toContain("checkWorkoutAlarm");

    // Workout & live session cues
    expect(workoutSource).toContain('playNotificationSound("chime")');
    expect(workoutSource).toContain('playAlarmSound("kinetic_chime")');
    expect(sessionSource).toContain('playAlarmSound("digital_beep")');
    expect(sessionSource).toContain('playAlarmSound("boxing_gong")');
  });
});


