# FitTrack — Security & Hardening Checklist

> Verification checklist for the demo-hardening pass (2026-09-11). Each item lists the
> problem, the fix, and a **runnable verification command**. Run commands from the repo
> root (`C:\Users\kagec\SIH\fit`). "✅ Done" items are already committed; "⬜ Action
> required" items must be completed by a human before/at launch.

## How to verify everything at once (the three gates)

```bash
pnpm install      # once, if node_modules is missing
pnpm check        # TypeScript: expect 0 errors
pnpm test         # Vitest: expect 14 passed
pnpm build        # expect "built" with no errors
```

Expected: `check` = 0 errors, `test` = 14/14 passing, `build` succeeds.

---

## A. Committed security patches (verify these are present)

### ✅ A1 — Leaked Gemini API key removed from the client  `[CRITICAL]`
- **Problem:** A live Google Gemini key was hard-coded (base64 `atob(...)`) in the client
  and shipped to every browser + committed to the public repo.
- **Fix:** Removed the key and the `getRuntimeGeminiKey()` function from
  `client/src/lib/rexi-ai-engine.ts`. The browser no longer holds or uses a key.
- **Verify (expect NO output / 0 matches):**
  ```bash
  git grep -n "getRuntimeGeminiKey" -- client
  git grep -n "atob(" -- client/src/lib/rexi-ai-engine.ts
  ```

### ✅ A2 — Gemini now called through a same-origin server proxy  `[CRITICAL]`
- **Fix:** Added `POST /api/rexi` to **both** server entry points. The proxy injects
  `GEMINI_API_KEY` server-side and forwards Gemini's response; soft-fails to
  `{ candidates: [] }` when the key is missing (client degrades to canned answers).
- **Verify (expect a match in each file):**
  ```bash
  git grep -n "/api/rexi" -- server/_core/index.ts api/index.ts client/src/lib/rexi-ai-engine.ts
  ```

### ✅ A3 — Built bundle no longer contains the key; `dist/` untracked  `[HIGH]`
- **Problem:** The committed `dist/` build bundle still embedded the key.
- **Fix:** Added `dist/` to `.gitignore` and stopped tracking it; `pnpm build` regenerates
  a clean bundle.
- **Verify:**
  ```bash
  git grep -n "^dist/" -- .gitignore          # expect a match
  git ls-files | findstr /b "dist/"           # expect NO output (nothing tracked)
  pnpm build
  git grep -n "generativelanguage.googleapis" -- dist   # (after build) expect NO match
  ```

### ✅ A4 — Cross-user data leak fixed (per-user scoping)  `[HIGH]`
- **Problem:** Server reads had **no user filter** (returned all users' rows); writes used
  a synthetic email that orphaned data.
- **Fix:** Every server read/write is scoped by the authenticated athlete's real email
  (`server/db.ts`), and `server/routers.ts` guards each call with `requireEmail(ctx.user)`
  (throws `UNAUTHORIZED` if no email on session).
- **Verify (expect matches):**
  ```bash
  git grep -n "requireEmail" -- server/routers.ts
  git grep -n "eq(\"user_email\"" -- server/db.ts
  ```

### ✅ A5 — Broken MySQL Drizzle runtime removed  `[MEDIUM]`
- **Problem:** Drizzle was MySQL-configured against a Postgres DB — incoherent/dead code.
- **Fix:** Removed the `drizzle-orm/mysql2` runtime; kept the shared `InsertUser` type.
- **Verify (expect NO match):**
  ```bash
  git grep -n "drizzle-orm/mysql2" -- server
  ```

### ✅ A6 — Dangerous docs corrected  `[MEDIUM]`
- **Problem:** Docs told users to set `VITE_GEMINI_API_KEY` — the `VITE_` prefix ships a
  secret to the browser, re-introducing the leak. Also false "100% RLS" claim.
- **Fix:** Docs now say server-only `GEMINI_API_KEY`; RLS claim corrected to API-layer
  scoping; `.env.example` documents the server-only key.
- **Verify:**
  ```bash
  git grep -n "GEMINI_API_KEY" -- .env.example          # expect a match (no VITE_ prefix)
  git grep -n "VITE_GEMINI_API_KEY" -- .                 # expect NO match
  ```

---

## B. Action required before launch (humans must do these)

### ⬜ B1 — Rotate / revoke the old Gemini key  `[CRITICAL — do first]`
The key was public in git history. Revoke it in Google AI Studio / Cloud Console and mint
a new one. Assume the old key is compromised. (The clean snapshot does not contain it, but
the original public repo's history still does.)

### ⬜ B2 — Set the new key server-side
Create `.env` at the repo root with (NO `VITE_` prefix):
```
GEMINI_API_KEY=your-new-key
```
Without it, Rexi runs but only returns canned answers.

### ⬜ B3 — Push the clean snapshot to Track-On
Run in an interactive terminal (a browser sign-in appears):
```bash
git push -u origin track-on-main:main
```

---

## C. Known limitations (not fixed in this pass — decide before real launch)

- **C1 — Client-only auth gate.** Protected routes are gated by a `localStorage` flag
  (`fittrack_auth_state`), which is trivially editable in DevTools. There is no enforced
  server auth on the demo path. Acceptable for a demo; NOT for production with real data.
- **C2 — Local sign-in accepts any password for a new email.** In the localStorage
  fallback, signing in with an unregistered email creates the account and logs in.
- **C3 — `/api/rexi` is unauthenticated & unthrottled.** Once deployed, anyone can spend
  your Gemini quota through it. Add rate limiting / a same-origin check before real launch.
- **C4 — No password reset and no account deletion flow.**

_These limitations are informational; A1–A6 are the security patches this pass delivered._
