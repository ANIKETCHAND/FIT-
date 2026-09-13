import { COOKIE_NAME } from "@shared/const";
import { metricEntryInput, gpsSessionInput, nutritionEntryInput, routePointSchema, workoutEntryInput } from "../shared/fitness-contract";
import { createGpsSession, createMetricEntry, createNutritionEntry, createWorkoutEntry, deleteGpsSession, listGpsSessions, listMetricEntries, listNutritionEntries, listWorkoutEntries } from "./db";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

function parseStoredRoute(routeJson: string) {
  const parsed = z.array(routePointSchema).safeParse(JSON.parse(routeJson));
  return parsed.success ? parsed.data : [];
}

// protectedProcedure guarantees ctx.user is non-null; only the email may be missing.
// Every data row is keyed by the athlete's real email, so we require it here.
function requireEmail(user: { email: string | null }): string {
  if (!user.email) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No email on session" });
  }
  return user.email;
}

export const appRouter = router({
  system: systemRouter,
  health: publicProcedure.query(() => ({ ok: true, service: "fittrack-api" as const, checkedAt: new Date() })),
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      if (typeof (ctx.res as any)?.clearCookie === "function") {
        (ctx.res as any).clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      }
      return { success: true } as const;
    }),
  }),
  nutrition: router({
    list: protectedProcedure.query(({ ctx }) => listNutritionEntries(requireEmail(ctx.user))),
    create: protectedProcedure.input(nutritionEntryInput).mutation(async ({ ctx, input }) => {
      await createNutritionEntry(requireEmail(ctx.user), input);
      return { success: true } as const;
    }),
  }),
  metrics: router({
    list: protectedProcedure.query(({ ctx }) => listMetricEntries(requireEmail(ctx.user))),
    create: protectedProcedure.input(metricEntryInput).mutation(async ({ ctx, input }) => {
      await createMetricEntry(requireEmail(ctx.user), input);
      return { success: true } as const;
    }),
  }),
  workouts: router({
    list: protectedProcedure.query(({ ctx }) => listWorkoutEntries(requireEmail(ctx.user))),
    create: protectedProcedure.input(workoutEntryInput).mutation(async ({ ctx, input }) => {
      await createWorkoutEntry(requireEmail(ctx.user), input);
      return { success: true } as const;
    }),
  }),
  gps: router({
    list: protectedProcedure.query(async ({ ctx }) => (await listGpsSessions(requireEmail(ctx.user))).map((session: any) => ({
      ...session,
      distanceMeters: Number(session.distanceMeters),
      averageSpeedKph: Number(session.averageSpeedKph),
      points: parseStoredRoute(session.routeJson),
    }))),
    create: protectedProcedure.input(gpsSessionInput).mutation(async ({ ctx, input }) => {
      await createGpsSession(requireEmail(ctx.user), input);
      return { success: true } as const;
    }),
    remove: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await deleteGpsSession(requireEmail(ctx.user), input.id);
      return { success: true } as const;
    }),
  }),
});

export type AppRouter = typeof appRouter;
