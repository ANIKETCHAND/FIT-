# 💻 Technology Stack & Engineering Specifications
## FitTrack — Production Tech Stack
**Smart India Hackathon 2026 (SIH 2026)**

---

## 1. Complete Technology Matrix

| Category | Technology / Library | Version | Purpose & Architectural Role |
| :--- | :--- | :--- | :--- |
| **Core Framework** | React | `^19.2.1` | Next-generation declarative UI with concurrent rendering and action hooks. |
| **Language** | TypeScript | `^5.9.3` | End-to-end type safety, strict null checks, and interface contracts. |
| **Build & Bundling** | Vite | `^7.1.9` | Ultra-fast ESM dev server and optimized Rollup production bundler. |
| **CSS & Styling** | Tailwind CSS | `^4.1.14` | Modern utility-first CSS framework with native CSS variables engine. |
| **Animations** | Framer Motion | `^12.23.22` | Hardware-accelerated physics-based spring animations. |
| **3D Graphics** | Three.js | `^0.185.1` | WebGL 3D rendering for anatomical human meshes and orbital forms. |
| **React 3D Bridge** | React Three Fiber | `^9.7.0` | React renderer for Three.js scene graphs. |
| **3D Helpers** | React Three Drei | `^10.7.8` | Camera controls, lighting presets, canvas loaders, and materials. |
| **UI Primitives** | Radix UI | Latest | Accessible, unstyled UI primitives (Dialog, Tabs, Slider, Tooltip). |
| **Icons** | Lucide React | `^0.453.0` | Crisp, scalable SVG iconography. |
| **Notifications** | Sonner | `^2.0.7` | High-performance toast notification manager. |
| **Data Visuals** | Recharts | `^2.15.4` | Composable charting library for weight progression and volume curves. |
| **Client Routing** | Wouter | `^3.7.1` | Ultra-lightweight ($<12\text{ kB}$) client-side router for SPAs. |
| **Backend Compute** | Vercel Edge Serverless | Node 24 | Low-latency globally distributed serverless execution. |
| **Type-Safe RPC** | tRPC & Superjson | `^11.18.0` | End-to-end type-safe API communication between client and server. |
| **Cloud Database** | Supabase PostgreSQL | `15.x` | Managed cloud PostgreSQL database with native Row-Level Security (RLS). |
| **ORM / Schema** | Drizzle ORM (types only) | `^0.44.7` | Provides shared `User`/`InsertUser` TypeScript types. The authoritative schema is `supabase/schema.sql`; `pnpm db:push` is not used. |
| **Generative AI** | Google Gemini | REST v1beta | Conversational coaching, diet creation, workout generation — called via the same-origin `/api/rexi` server proxy (key never in the browser). |
| **OAuth Identity** | Google Identity Services | GIS v2 | Production OAuth2 authentication with JWT cryptographic verification. |
| **Cryptography** | Web Crypto API | Native | Client-side SHA-256 password hashing. |
| **Mapping** | Leaflet / OpenStreetMap | Native | Lightweight open-source outdoor GPS route tracking and rendering. |
| **Package Manager** | pnpm | `10.x` | Fast, disk space efficient content-addressable package manager. |

---

## 2. Architectural Rationale & Design Trade-offs

### 2.1 Why React 19 + Vite 7?
* **Zero Compilation Lag**: Vite leverages esbuild for dependency pre-bundling, delivering sub-100ms cold starts compared to several seconds with legacy Webpack configurations.
* **Concurrent Rendering**: React 19 handles heavy 3D Three.js canvas updates in parallel with UI DOM updates without dropping frames or freezing user input.

### 2.2 Why Supabase PostgreSQL over MongoDB / Firebase?
* **Relational Schema Integrity**: Athlete profiles, workout sessions, and logged meals have strict foreign key dependencies. Relational foreign keys prevent orphaned workout logs.
* **Per-User Data Scoping**: Every server read/write is filtered by the authenticated athlete's email in the API layer. RLS policies keyed on `public.current_athlete_email()` are defined in `supabase/schema.sql` for direct-DB access (note: the app path connects with the service-role key, so API-layer scoping is the enforced boundary).
* **Generous Starter Tier**: Free 500 MB database and 50,000 monthly active users (MAU) make public deployment cost-free for hackathons and student pilots.

### 2.3 Why Google Gemini 1.5 Flash?
* **Sub-Second Latency**: Flash offers an ultra-fast generation turnaround ($<1.5\text{s}$) compared to heavy models ($>4\text{s}$), essential for interactive conversational coaching.
* **Cost Efficiency**: Marginal API cost per token is a fraction of legacy large models, ensuring long-term financial sustainability for mass public adoption.
* **Multimodal Context Window**: Handles expansive context containing the user's complete daily nutritional ledger, 7-day workout history, and physiological goals.

### 2.4 Why Web Standards / PWA over Native Mobile Apps?
* **Zero App Store Gatekeeping**: Users can start using FitTrack immediately without waiting to download 150 MB APKs from Google Play or Apple App Store.
* **Sensor Parity**: Modern Web APIs (HTML5 Geolocation, Web Crypto, WebGL, Speech Recognition, LocalStorage) provide 100% of the sensors needed for fitness telemetry.
* **Cross-Device Continuity**: The exact same codebase runs flawlessly on budget Android phones, iPhones, iPads, MacBooks, and Windows PCs.

---

## 3. Environment Variables & Runtime Configuration

```ini
# Production Google OAuth Client Configuration
VITE_GOOGLE_CLIENT_ID=583335952268-9ibrvhstkajdn9ik9did17ml3pldijuk.apps.googleusercontent.com

# Optional Cloud Supabase Credentials (Can also be set in Settings UI)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

# Optional Gemini API Key — SERVER-ONLY, never VITE_-prefixed.
# Used by the /api/rexi proxy; never shipped to the browser.
# Without it, Rexi returns built-in coaching answers.
GEMINI_API_KEY=AIzaSy...
```
