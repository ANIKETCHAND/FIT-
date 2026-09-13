import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app: any = express();

// 1. Disable x-powered-by header to avoid information disclosure
app.disable("x-powered-by");

// 2. Prevent DoS via payload memory exhaustion: restrict payload limit to 1MB
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// 3. Reject insecure HTTP methods (TRACE, TRACK)
app.use((req: any, res: any, next: any) => {
  if (req.method === "TRACE" || req.method === "TRACK") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }
  next();
});

// 4. tRPC API Route
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

// 5. Health check endpoint (explicitly typed)
app.get("/api/health", (_req: any, res: any) => {
  res.json({ ok: true, service: "fittrack-api", timestamp: new Date().toISOString() });
});

// 5b. Rexi AI proxy: keeps the Gemini API key server-side (never shipped to the browser)
app.post("/api/rexi", async (req: any, res: any) => {
  const key = process.env.GEMINI_API_KEY;
  const model = (req.body && req.body.model) || "gemini-1.5-flash";
  if (!key) {
    res.status(200).json({ candidates: [] }); // client falls back gracefully
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
          generationConfig: req.body?.generationConfig,
        }),
      }
    );
    res.status(200).json(await r.json()); // forward Gemini's JSON verbatim
  } catch {
    res.status(200).json({ candidates: [] }); // soft-fail -> client fallback
  }
});

// 6. Global error handler: prevent stack trace exposure in responses
app.use((err: any, _req: any, res: any, _next: any) => {
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: "Internal Server Error",
    code: "SERVER_ERROR",
  });
});

export default app;
