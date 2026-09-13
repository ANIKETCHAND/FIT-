// server/serverless.ts
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";
var decodeOAuthState = (state) => {
  let decoded;
  try {
    decoded = atob(state);
  } catch {
    return { redirectUri: "" };
  }
  try {
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.redirectUri === "string") return parsed;
  } catch {
  }
  return { redirectUri: decoded };
};

// shared/fitness-contract.ts
import { z } from "zod";
var routePointSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timestampMs: z.number().int().positive(),
  accuracyMeters: z.number().nonnegative().optional(),
  speedMetersPerSecond: z.number().nonnegative().nullable().optional()
});
var nutritionEntryInput = z.object({
  mealType: z.string().min(1).max(32),
  label: z.string().min(1).max(180),
  calories: z.number().int().min(0).max(1e4),
  proteinGrams: z.number().min(0).max(1e3),
  carbGrams: z.number().min(0).max(1e3),
  fatGrams: z.number().min(0).max(1e3),
  consumedAt: z.coerce.date()
});
var metricEntryInput = z.object({
  weightKg: z.number().positive().max(500),
  capturedAt: z.coerce.date()
});
var workoutEntryInput = z.object({
  title: z.string().min(1).max(180),
  focus: z.string().min(1).max(120),
  movementCount: z.number().int().min(1).max(100),
  volumeKg: z.number().nonnegative().max(1e7),
  completedAt: z.coerce.date()
});
var gpsSessionInput = z.object({
  label: z.string().min(1).max(180),
  startedAt: z.coerce.date(),
  endedAt: z.coerce.date(),
  durationSeconds: z.number().int().min(1).max(86400),
  distanceMeters: z.number().positive().max(2e6),
  averageSpeedKph: z.number().nonnegative().max(200),
  points: z.array(routePointSchema).min(2).max(5e3)
}).refine((session) => session.endedAt >= session.startedAt, {
  message: "A route cannot end before it starts.",
  path: ["endedAt"]
});

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ""
};

// server/supabase.ts
import { createClient } from "@supabase/supabase-js";
var _supabaseClient = null;
function getSupabaseServerClient() {
  if (_supabaseClient) {
    return _supabaseClient;
  }
  const url = ENV.supabaseUrl;
  const key = ENV.supabaseServiceRoleKey || ENV.supabaseAnonKey;
  if (url && key) {
    try {
      _supabaseClient = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });
      console.log("[Supabase Server] Connected successfully to:", url);
    } catch (err) {
      console.error("[Supabase Server] Failed to initialize client:", err);
      _supabaseClient = null;
    }
  }
  return _supabaseClient;
}

// server/db.ts
var _memoryNutrition = [];
var _memoryWorkouts = [];
var _memoryMetrics = [];
var _memoryGps = [];
async function upsertUser(user) {
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
          last_signed_in: user.lastSignedIn ? new Date(user.lastSignedIn).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        },
        { onConflict: "open_id" }
      );
    } catch (err) {
      console.warn("[Supabase] upsertUser error:", err);
    }
  }
}
async function getUserByOpenId(openId) {
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
          lastSignedIn: new Date(data.last_signed_in)
        };
      }
    } catch (err) {
      console.warn("[Supabase] getUserByOpenId error:", err);
    }
  }
  return void 0;
}
async function listNutritionEntries(userEmail) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("nutrition_entries").select("*").eq("user_email", userEmail).order("consumed_at", { ascending: false }).limit(100);
      if (data && !error) {
        return data.map((d) => ({
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
          createdAt: new Date(d.created_at)
        }));
      }
    } catch (err) {
      console.warn("[Supabase] listNutritionEntries error:", err);
    }
  }
  return _memoryNutrition.filter((n) => n.userEmail === userEmail);
}
async function createNutritionEntry(userEmail, entry) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("nutrition_entries").insert({
        user_email: userEmail,
        meal_type: entry.mealType,
        label: entry.label,
        hindi_name: entry.hindiName || null,
        portion_multiplier: entry.portionMultiplier || 1,
        serving_size: "1 serving",
        calories: entry.calories,
        protein_grams: entry.proteinGrams,
        carb_grams: entry.carbGrams,
        fat_grams: entry.fatGrams,
        is_veg: entry.isVeg !== false,
        consumed_at: entry.consumedAt.toISOString()
      });
      return;
    } catch (err) {
      console.warn("[Supabase] createNutritionEntry error:", err);
    }
  }
  _memoryNutrition.unshift({ id: Date.now(), userEmail, ...entry, createdAt: /* @__PURE__ */ new Date() });
}
async function listWorkoutEntries(userEmail) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("workout_entries").select("*").eq("user_email", userEmail).order("completed_at", { ascending: false }).limit(60);
      if (data && !error) {
        return data.map((d) => ({
          id: Number(d.id),
          userEmail,
          title: d.title,
          focus: d.focus,
          movementCount: Number(d.movement_count),
          volumeKg: String(d.volume_kg),
          durationMinutes: Number(d.duration_minutes),
          completedAt: new Date(d.completed_at),
          createdAt: new Date(d.created_at)
        }));
      }
    } catch (err) {
      console.warn("[Supabase] listWorkoutEntries error:", err);
    }
  }
  return _memoryWorkouts.filter((w) => w.userEmail === userEmail);
}
async function createWorkoutEntry(userEmail, entry) {
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
        completed_at: entry.completedAt.toISOString()
      });
      return { success: true };
    } catch (err) {
      console.warn("[Supabase] createWorkoutEntry error:", err);
    }
  }
  _memoryWorkouts.unshift({ id: Date.now(), userEmail, ...entry, createdAt: /* @__PURE__ */ new Date() });
  return { success: true };
}
async function listMetricEntries(userEmail) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("metric_entries").select("*").eq("user_email", userEmail).order("captured_at", { ascending: false }).limit(90);
      if (data && !error) {
        return data.map((d) => ({
          id: Number(d.id),
          userEmail,
          weightKg: String(d.weight_kg),
          bodyFatPercent: d.body_fat_percent ? String(d.body_fat_percent) : null,
          notes: d.notes,
          capturedAt: new Date(d.captured_at),
          createdAt: new Date(d.created_at)
        }));
      }
    } catch (err) {
      console.warn("[Supabase] listMetricEntries error:", err);
    }
  }
  return _memoryMetrics.filter((m) => m.userEmail === userEmail);
}
async function createMetricEntry(userEmail, entry) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      await supabase.from("metric_entries").insert({
        user_email: userEmail,
        weight_kg: entry.weightKg,
        body_fat_percent: entry.bodyFatPercent || null,
        notes: entry.notes || null,
        captured_at: entry.capturedAt.toISOString()
      });
      return;
    } catch (err) {
      console.warn("[Supabase] createMetricEntry error:", err);
    }
  }
  _memoryMetrics.unshift({ id: Date.now(), userEmail, ...entry, createdAt: /* @__PURE__ */ new Date() });
}
async function listGpsSessions(userEmail) {
  const supabase = getSupabaseServerClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("gps_sessions").select("*").eq("user_email", userEmail).order("started_at", { ascending: false }).limit(40);
      if (data && !error) {
        return data.map((d) => ({
          id: Number(d.id),
          userEmail,
          label: d.label,
          startedAt: new Date(d.started_at),
          endedAt: new Date(d.ended_at),
          durationSeconds: Number(d.duration_seconds),
          distanceMeters: String(d.distance_meters),
          averageSpeedKph: String(d.average_speed_kph),
          routeJson: typeof d.route_json === "string" ? d.route_json : JSON.stringify(d.route_json),
          createdAt: new Date(d.created_at)
        }));
      }
    } catch (err) {
      console.warn("[Supabase] listGpsSessions error:", err);
    }
  }
  return _memoryGps.filter((g) => g.userEmail === userEmail);
}
async function createGpsSession(userEmail, session) {
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
        route_json: session.points
      });
      return;
    } catch (err) {
      console.warn("[Supabase] createGpsSession error:", err);
    }
  }
  _memoryGps.unshift({ id: Date.now(), userEmail, ...session, createdAt: /* @__PURE__ */ new Date() });
}
async function deleteGpsSession(userEmail, sessionId) {
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

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req?.protocol === "https") return true;
  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : typeof forwardedProto === "string" ? forwardedProto.split(",") : [];
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  return {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req)
  };
}

// server/_core/systemRouter.ts
import { z as z2 } from "zod";

// server/_core/notification.ts
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z2.object({
      timestamp: z2.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z2.object({
      title: z2.string().min(1, "title is required"),
      content: z2.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z3 } from "zod";
function parseStoredRoute(routeJson) {
  const parsed = z3.array(routePointSchema).safeParse(JSON.parse(routeJson));
  return parsed.success ? parsed.data : [];
}
function requireEmail(user) {
  if (!user.email) {
    throw new TRPCError3({ code: "UNAUTHORIZED", message: "No email on session" });
  }
  return user.email;
}
var appRouter = router({
  system: systemRouter,
  health: publicProcedure.query(() => ({ ok: true, service: "fittrack-api", checkedAt: /* @__PURE__ */ new Date() })),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      if (typeof ctx.res?.clearCookie === "function") {
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      }
      return { success: true };
    })
  }),
  nutrition: router({
    list: protectedProcedure.query(({ ctx }) => listNutritionEntries(requireEmail(ctx.user))),
    create: protectedProcedure.input(nutritionEntryInput).mutation(async ({ ctx, input }) => {
      await createNutritionEntry(requireEmail(ctx.user), input);
      return { success: true };
    })
  }),
  metrics: router({
    list: protectedProcedure.query(({ ctx }) => listMetricEntries(requireEmail(ctx.user))),
    create: protectedProcedure.input(metricEntryInput).mutation(async ({ ctx, input }) => {
      await createMetricEntry(requireEmail(ctx.user), input);
      return { success: true };
    })
  }),
  workouts: router({
    list: protectedProcedure.query(({ ctx }) => listWorkoutEntries(requireEmail(ctx.user))),
    create: protectedProcedure.input(workoutEntryInput).mutation(async ({ ctx, input }) => {
      await createWorkoutEntry(requireEmail(ctx.user), input);
      return { success: true };
    })
  }),
  gps: router({
    list: protectedProcedure.query(async ({ ctx }) => (await listGpsSessions(requireEmail(ctx.user))).map((session) => ({
      ...session,
      distanceMeters: Number(session.distanceMeters),
      averageSpeedKph: Number(session.averageSpeedKph),
      points: parseStoredRoute(session.routeJson)
    }))),
    create: protectedProcedure.input(gpsSessionInput).mutation(async ({ ctx, input }) => {
      await createGpsSession(requireEmail(ctx.user), input);
      return { success: true };
    }),
    remove: protectedProcedure.input(z3.object({ id: z3.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteGpsSession(requireEmail(ctx.user), input.id);
      return { success: true };
    })
  })
});

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString2 = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    return decodeOAuthState(state).redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    let secret = ENV.cookieSecret;
    if (!secret || secret.trim().length < 16) {
      if (ENV.isProduction) {
        throw new Error(
          "[Security] FATAL: JWT_SECRET environment variable is missing or too short. A secret of at least 16 characters is required."
        );
      }
      secret = "fittrack_dev_fallback_secret_key_32bytes_minimum!!";
    }
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString2(openId) || !isNonEmptyString2(appId) || !isNonEmptyString2(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookieHeader = req?.headers?.cookie;
    const cookies = this.parseCookies(cookieHeader);
    let sessionToken = cookies.get(COOKIE_NAME);
    if (!sessionToken) {
      const authHeader = req?.headers?.authorization;
      if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        sessionToken = authHeader.slice(7);
      }
    }
    const session = await this.verifySession(sessionToken);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    if (session.openId.startsWith(CRON_OPEN_ID_PREFIX)) {
      const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
      const taskUid = userInfo.taskUid ?? null;
      if (!taskUid) {
        throw ForbiddenError("Cron session missing task_uid");
      }
      return buildCronUser(userInfo);
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionToken ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var CRON_OPEN_ID_PREFIX = "cron_";
function buildCronUser(userInfo) {
  const now = /* @__PURE__ */ new Date();
  return {
    id: -1,
    openId: userInfo.openId,
    name: userInfo.name || "Manus Scheduled Task",
    email: null,
    loginMethod: null,
    role: "user",
    createdAt: now,
    updatedAt: now,
    lastSignedIn: now,
    taskUid: userInfo.taskUid ?? void 0,
    isCron: true
  };
}
var sdk = new SDKServer();

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/serverless.ts
var app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));
app.use((req, res, next) => {
  if (req.method === "TRACE" || req.method === "TRACK") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  next();
});
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext
  })
);
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "fittrack-api", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/rexi", async (req, res) => {
  const key = process.env.GEMINI_API_KEY;
  const model = req.body && req.body.model || "gemini-1.5-flash";
  if (!key) {
    res.status(200).json({ candidates: [] });
    return;
  }
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: req.body?.systemInstruction,
          contents: req.body?.contents,
          generationConfig: req.body?.generationConfig
        })
      }
    );
    res.status(200).json(await r.json());
  } catch {
    res.status(200).json({ candidates: [] });
  }
});
app.use((err, _req, res, _next) => {
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: "Internal Server Error",
    code: "SERVER_ERROR"
  });
});
var serverless_default = app;
export {
  serverless_default as default
};
