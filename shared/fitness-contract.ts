import { z } from "zod";

export const routePointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestampMs: z.number().int().positive(),
  accuracyMeters: z.number().nonnegative().optional(),
  speedMetersPerSecond: z.number().nonnegative().nullable().optional(),
});

export const nutritionEntryInput = z.object({
  mealType: z.string().min(1).max(32),
  label: z.string().min(1).max(180),
  calories: z.number().int().min(0).max(10_000),
  proteinGrams: z.number().min(0).max(1_000),
  carbGrams: z.number().min(0).max(1_000),
  fatGrams: z.number().min(0).max(1_000),
  consumedAt: z.coerce.date(),
});

export const metricEntryInput = z.object({
  weightKg: z.number().positive().max(500),
  capturedAt: z.coerce.date(),
});

export const workoutEntryInput = z.object({
  title: z.string().min(1).max(180),
  focus: z.string().min(1).max(120),
  movementCount: z.number().int().min(1).max(100),
  volumeKg: z.number().nonnegative().max(10_000_000),
  completedAt: z.coerce.date(),
});

export const gpsSessionInput = z.object({
  label: z.string().min(1).max(180),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
  durationSeconds: z.number().int().min(1).max(86_400),
  distanceMeters: z.number().positive().max(2_000_000),
  averageSpeedKph: z.number().nonnegative().max(200),
  points: z.array(routePointSchema).min(2).max(5_000),
}).refine((session) => session.endedAt >= session.startedAt, {
  message: "A route cannot end before it starts.",
  path: ["endedAt"],
});

export type RoutePoint = z.infer<typeof routePointSchema>;
export type GpsSessionInput = z.infer<typeof gpsSessionInput>;
