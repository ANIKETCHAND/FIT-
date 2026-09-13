/* FitTrack: Comprehensive Enterprise-Grade Database Schema */
import { decimal, index, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * 1. Core Users Table
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  experienceLevel: mysqlEnum("experienceLevel", ["beginner", "intermediate", "advanced"]).default("beginner").notNull(),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 2. Athlete Biometric & Target Profiles Table
 */
export const athleteProfiles = mysqlTable("athlete_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  weightKg: decimal("weightKg", { precision: 6, scale: 2 }).default("75.00").notNull(),
  heightCm: decimal("heightCm", { precision: 5, scale: 1 }).default("175.0").notNull(),
  age: int("age").default(24).notNull(),
  sex: mysqlEnum("sex", ["male", "female"]).default("male").notNull(),
  activityLevel: varchar("activityLevel", { length: 32 }).default("moderate").notNull(),
  focus: varchar("focus", { length: 180 }).default("Hypertrophy & Progressive Overload").notNull(),
  goalKcal: int("goalKcal").default(2400).notNull(),
  goalProtein: int("goalProtein").default(160).notNull(),
  goalCarbs: int("goalCarbs").default(260).notNull(),
  goalFat: int("goalFat").default(65).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => [index("athlete_profiles_user_idx").on(table.userId)]);

export type AthleteProfile = typeof athleteProfiles.$inferSelect;
export type InsertAthleteProfile = typeof athleteProfiles.$inferInsert;

/**
 * 3. Smart Nutrition & Indian Food Logs Table
 */
export const nutritionEntries = mysqlTable("nutrition_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  mealType: varchar("mealType", { length: 32 }).notNull(), // Breakfast, Lunch, Snack, Dinner
  label: varchar("label", { length: 180 }).notNull(),
  hindiName: varchar("hindiName", { length: 180 }),
  portionMultiplier: decimal("portionMultiplier", { precision: 4, scale: 2 }).default("1.00").notNull(),
  servingSize: varchar("servingSize", { length: 120 }).default("1 serving").notNull(),
  calories: int("calories").notNull(),
  proteinGrams: decimal("proteinGrams", { precision: 7, scale: 2 }).notNull(),
  carbGrams: decimal("carbGrams", { precision: 7, scale: 2 }).notNull(),
  fatGrams: decimal("fatGrams", { precision: 7, scale: 2 }).notNull(),
  isVeg: int("isVeg").default(1).notNull(), // 1 = true, 0 = false
  consumedAt: timestamp("consumedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("nutrition_entries_user_date_idx").on(table.userId, table.consumedAt)]);

export type NutritionEntry = typeof nutritionEntries.$inferSelect;
export type InsertNutritionEntry = typeof nutritionEntries.$inferInsert;

/**
 * 4. Custom Homemade Indian Recipes Table
 */
export const customIndianFoods = mysqlTable("custom_indian_foods", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 180 }).notNull(),
  hindiName: varchar("hindiName", { length: 180 }),
  category: varchar("category", { length: 64 }).default("high_protein_veg").notNull(),
  servingSize: varchar("servingSize", { length: 120 }).notNull(),
  calories: int("calories").notNull(),
  proteinGrams: decimal("proteinGrams", { precision: 7, scale: 2 }).notNull(),
  carbGrams: decimal("carbGrams", { precision: 7, scale: 2 }).notNull(),
  fatGrams: decimal("fatGrams", { precision: 7, scale: 2 }).notNull(),
  isVeg: int("isVeg").default(1).notNull(),
  tagsJson: text("tagsJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("custom_foods_user_idx").on(table.userId)]);

export type CustomIndianFood = typeof customIndianFoods.$inferSelect;
export type InsertCustomIndianFood = typeof customIndianFoods.$inferInsert;

/**
 * 5. Workout Session Sessions Table
 */
export const workoutEntries = mysqlTable("workout_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 180 }).notNull(),
  focus: varchar("focus", { length: 120 }).notNull(), // Chest, Back, Legs, Full Body
  movementCount: int("movementCount").notNull(),
  volumeKg: decimal("volumeKg", { precision: 11, scale: 2 }).notNull(),
  durationMinutes: int("durationMinutes").default(45).notNull(),
  completedAt: timestamp("completedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("workout_entries_user_date_idx").on(table.userId, table.completedAt)]);

export type WorkoutEntry = typeof workoutEntries.$inferSelect;
export type InsertWorkoutEntry = typeof workoutEntries.$inferInsert;

/**
 * 6. Detailed Workout Sets & Reps Table
 */
export const workoutSets = mysqlTable("workout_sets", {
  id: int("id").autoincrement().primaryKey(),
  workoutId: int("workoutId").notNull().references(() => workoutEntries.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  movementId: varchar("movementId", { length: 64 }).notNull(),
  movementName: varchar("movementName", { length: 180 }).notNull(),
  setNumber: int("setNumber").notNull(),
  weightKg: decimal("weightKg", { precision: 7, scale: 2 }).notNull(),
  reps: int("reps").notNull(),
  rpe: decimal("rpe", { precision: 3, scale: 1 }).default("8.0"),
  calculated1Rm: decimal("calculated1Rm", { precision: 7, scale: 2 }),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, (table) => [index("workout_sets_user_idx").on(table.userId, table.workoutId)]);

export type WorkoutSet = typeof workoutSets.$inferSelect;
export type InsertWorkoutSet = typeof workoutSets.$inferInsert;

/**
 * 7. Exercise Library Favorites Table
 */
export const userFavorites = mysqlTable("user_favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  exerciseId: varchar("exerciseId", { length: 64 }).notNull(),
  exerciseName: varchar("exerciseName", { length: 180 }).notNull(),
  category: varchar("category", { length: 64 }),
  favoritedAt: timestamp("favoritedAt").defaultNow().notNull(),
}, (table) => [index("user_favorites_user_idx").on(table.userId, table.exerciseId)]);

export type UserFavorite = typeof userFavorites.$inferSelect;
export type InsertUserFavorite = typeof userFavorites.$inferInsert;

/**
 * 8. Daily Weigh-in & Biometrics Tracking Table
 */
export const metricEntries = mysqlTable("metric_entries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  weightKg: decimal("weightKg", { precision: 6, scale: 2 }).notNull(),
  bodyFatPercent: decimal("bodyFatPercent", { precision: 4, scale: 1 }),
  notes: text("notes"),
  capturedAt: timestamp("capturedAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("metric_entries_user_date_idx").on(table.userId, table.capturedAt)]);

export type MetricEntry = typeof metricEntries.$inferSelect;
export type InsertMetricEntry = typeof metricEntries.$inferInsert;

/**
 * 9. Daily Streaks & Milestones Table
 */
export const streakRecords = mysqlTable("streak_records", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  currentStreak: int("currentStreak").default(0).notNull(),
  longestStreak: int("longestStreak").default(0).notNull(),
  lastCompletedDate: varchar("lastCompletedDate", { length: 32 }).default("").notNull(),
  freezeCount: int("freezeCount").default(2).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StreakRecord = typeof streakRecords.$inferSelect;
export type InsertStreakRecord = typeof streakRecords.$inferInsert;

/**
 * 10. GPS Sessions & GeoJSON Telemetry Table
 */
export const gpsSessions = mysqlTable("gps_sessions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 180 }).notNull(),
  startedAt: timestamp("startedAt").notNull(),
  endedAt: timestamp("endedAt").notNull(),
  durationSeconds: int("durationSeconds").notNull(),
  distanceMeters: decimal("distanceMeters", { precision: 12, scale: 2 }).notNull(),
  averageSpeedKph: decimal("averageSpeedKph", { precision: 7, scale: 2 }).notNull(),
  routeJson: text("routeJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => [index("gps_sessions_user_date_idx").on(table.userId, table.startedAt)]);

export type GpsSession = typeof gpsSessions.$inferSelect;
export type InsertGpsSession = typeof gpsSessions.$inferInsert;
