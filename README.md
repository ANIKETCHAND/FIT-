# FitTrack 🏋️ — Performance Operating System
> **Smart India Hackathon 2026 (SIH 2026) Submission**  
> **Deployment Status**: Pre-Hackathon Phase (Undeployed in compliance with hackathon evaluation guidelines; local build verified)  
> **GitHub Monorepo**: [https://github.com/ANIKETCHAND/fit.git](https://github.com/ANIKETCHAND/fit.git)

FitTrack is a modern, high-performance athletic operating system built with **React 19, TypeScript, Vite, Supabase PostgreSQL, and Google Gemini 1.5 Flash**. It combines 3D interactive human anatomy, localized Indian nutritional tracking, real-time GPS route telemetry, and conversational AI coaching.

---

## 📚 Project Documentation Hub

Complete technical and architectural documentation has been prepared and indexed below:

| Document | File Link | Description |
| :--- | :--- | :--- |
| **Master Technical Report** | [🏆 `REPORT.md`](./REPORT.md) | Comprehensive project report covering mathematics, backend, frontend, database, security, and AI. |
| **Product Requirements (PRD)** | [📄 `PRD.md`](./PRD.md) | Problem statement, Indian fitness context, user personas, functional matrix, and KPIs. |
| **System Architecture** | [🏛️ `ARCHITECTURE.md`](./ARCHITECTURE.md) | High-level topology, Mermaid diagrams, multi-tenant RLS, and offline-first sync. |
| **Design System & UI/UX** | [🎨 `DESIGN.md`](./DESIGN.md) | Carbon Editorial Performance Deck, color tokens, typography, component hierarchies, and UX flows. |
| **Technology Stack** | [💻 `TECH_STACK.md`](./TECH_STACK.md) | Complete version matrix, architectural trade-offs, and dependency justifications. |
| **Business Logic & Algorithms**| [🧠 `LOGIC.md`](./LOGIC.md) | Mifflin-St Jeor BMR/TDEE math, 3D muscle recovery decay models, Haversine GPS filter, and Rexi AI guardrails. |
| **Database & Storage Schema** | [🗄️ `DATA_SCHEMA.md`](./DATA_SCHEMA.md) | PostgreSQL 15 DDL, Entity-Relationship (ER) diagram, Row-Level Security (RLS) policies, and LocalStorage keys. |

---

## 🌟 Core Features

- 📊 **Performance Overview Dashboard** – Real-time 3D Orbital Readiness scene, 7-day training rhythm, and nutrition ledgers.
- 💪 **3D Muscle Recovery Studio** – Interactive WebGL human anatomy model with individual muscle fatigue and readiness diagnostics.
- 🥗 **Localized Smart Nutrition Lab** – Verified Indian food database (Roti, Dal, Paneer, regional thalis) + raw pantry recipe builder.
- 📹 **Kinetic Video Guidance** – Form coaching flip cards with loopable slow-motion HD exercise video demonstrations.
- 🏃 **GPS Outdoor Route Tracker** – HTML5 Geolocation route tracking with pace, distance, and Leaflet/OpenStreetMap rendering.
- 🤖 **Rexi AI Conversational Coach** – Voice-enabled multimodal fitness mentor powered by Google Gemini 1.5 Flash and real-time biometric telemetry.
- 🏆 **Gamified Milestones & Streaks** – Unbroken 24-hour training streak engine and PR milestone unlock celebrations.
- ☁️ **Cloud Database & Multi-Tenancy** – Best-effort Supabase PostgreSQL synchronization with per-user data scoping (localStorage remains the primary source of truth).

---

## 🛠️ Tech Stack Summary

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19.2.1, TypeScript 5.9.3, Vite 7.1.9 |
| **Styling & Motion** | Tailwind CSS v4, Framer Motion 12.23, Radix UI Primitives |
| **3D Graphics** | Three.js 0.185, React Three Fiber 9.7, React Three Drei 10.7 |
| **Cloud Database** | Supabase PostgreSQL 15 with Row-Level Security (RLS) |
| **AI Intelligence** | Google Gemini 1.5 Flash API (Multimodal context injection) |
| **Authentication** | Google GIS OAuth2 (JWT validation) + Client-side SHA-256 Web Crypto |
| **Mapping & GPS** | HTML5 Geolocation API, Leaflet / OpenStreetMap |
| **Deployment** | Vercel Serverless Edge Platform |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **pnpm**: v10.x (`npm install -g pnpm`)

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ANIKETCHAND/fit.git
   cd fit
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Start local development server:**
   ```bash
   pnpm dev
   ```
   Open `http://localhost:3000` in your browser (Express serves the Vite client and the tRPC API on one port; if 3000 is busy it auto-selects the next free port and logs the URL).

4. **Verify TypeScript compilation:**
   ```bash
   pnpm run check
   ```

5. **Build for production:**
   ```bash
   pnpm run build
   ```

> **Rexi AI (optional):** set `GEMINI_API_KEY` (server-only, **no** `VITE_` prefix) in `.env` to enable live Gemini responses via the `/api/rexi` proxy. Without it, Rexi still runs and returns built-in coaching answers.

> **Database schema of record:** the authoritative schema is [`supabase/schema.sql`](./supabase/schema.sql), applied directly in Supabase. `pnpm db:push` (drizzle-kit) is **not** part of the workflow — the Drizzle config is legacy and the app talks to Supabase via `@supabase/supabase-js`. The app runs fully on the localStorage cache with **zero cloud config**.

---

## 🔒 Security & Privacy

FitTrack adheres strictly to data security best practices:
* **Per-User Data Scoping**: Every server read/write is filtered by the authenticated athlete's email in the API layer. PostgreSQL RLS policies (`public.current_athlete_email()`) are included in the schema for direct-DB access.
* **Cryptographic Hash Protection**: All custom passwords hashed using client-side SHA-256 before local persistence.
* **Offline Resilience**: Biometric metrics and workout logs are safely preserved in browser local storage and asynchronously synced upon connection.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
