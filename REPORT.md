# 🏆 FitTrack — Complete Technical Project Report
### Intelligent Athletic Performance Operating System
**Smart India Hackathon 2026 (SIH 2026) Official Technical Deliverable**

---

## 📋 Document Metadata
* **Project Name**: FitTrack Performance OS
* **Current Version**: 2.0.0 (Pre-Hackathon Release)
* **Deployment Status**: Pre-Hackathon Development Phase (Intentionally undeployed prior to hackathon kickoff to comply with competition regulations; local build verified)
* **GitHub Monorepo**: [https://github.com/ANIKETCHAND/fit.git](https://github.com/ANIKETCHAND/fit.git)
* **Engineering Team**: FitTrack Core Team
* **Primary Target Demographic**: Indian fitness enthusiasts, students, athletes, desk workers, and citizens combating sedentary lifestyle disorders.

---

## 1. Executive Summary

FitTrack is an all-in-one, browser-first, cloud-synchronized **Athletic Performance Operating System**. It bridges the critical divide in modern fitness technology by combining:
1. **Interactive 3D Anatomy & Muscle Recovery Studio** powered by WebGL and Three.js.
2. **Localized Indian Nutrition Lab** tracking regional meals (*Roti, Dal, Paneer, Sabzi, Biryani, Idli/Dosa*) alongside raw pantry ingredients with automated BMR/TDEE calibrations.
3. **Rexi AI Conversational Coach** powered by Google Gemini 1.5 Flash, grounded in real-time biometric telemetry.
4. **Kinetic Form Video Guidance** offering loopable, slow-motion technique demonstrations embedded in workout protocols.
5. **GPS Outdoor Route Telemetry** using the HTML5 Geolocation API with Haversine distance calculations and velocity-gated noise suppression.
6. **Dual-Tier Offline-First Architecture** utilizing scoped client-side local caching and Supabase PostgreSQL with strict PostgreSQL Row-Level Security (RLS).

---

## 2. Problem Statement & National Alignment

### 2.1 The Fitness Crisis in India
* **Regional Dietary Blindspot**: More than 85% of commercial fitness applications (MyFitnessPal, HealthifyMe, MyNetDiary) focus heavily on Western diets or lock Indian food databases behind aggressive paywalls. Home-cooked Indian meals vary significantly in macronutrient distribution; without localized tracking, users abandon logging.
* **Prohibitive Personal Trainer Costs**: Gym trainers and certified dietitians in Indian metropolitan and tier-2 cities charge between **₹3,000 and ₹10,000 per month**, making personalized coaching inaccessible to college students and young professionals.
* **The 90-Day Attrition Epidemic**: 80% of individuals who purchase gym memberships drop out within the first 90 days due to lack of immediate physiological feedback, improper exercise technique, and confusing volume progression.
* **Youth Lifestyle Disease Surge**: Non-communicable diseases (Type-2 Diabetes, hypertension, metabolic syndrome, and posture disorders) are escalating among sedentary urban youth.

### 2.2 Alignment with National Initiatives
FitTrack aligns directly with Government of India health frameworks:
* **Fit India Movement**: Encouraging daily physical exercise, active walking/running, and habit continuity across all age groups.
* **Khelo India**: Promoting structured progressive overload, physical conditioning, and athletic talent tracking.
* **Preventative Healthcare**: Lowering long-term public healthcare expenditure by promoting cardiovascular health, lean muscle preservation, and nutritional literacy.

---

## 3. Comprehensive Mathematical Formulations & Core Algorithms

```
  ┌───────────────────────────────────────────────────────────┐
  │              MATHEMATICAL FORMULATIONS SUMMARY            │
  ├───────────────────────────────────────────────────────────┤
  │ 1. Mifflin-St Jeor BMR & TDEE Calculations               │
  │ 2. Macronutrient Target Splitting                         │
  │ 3. Exponential Muscle Recovery & Fatigue Decay Model      │
  │ 4. Composite Athletic Readiness Scoring Index             │
  │ 5. Indian Nutrition Scaling & Custom Recipe Aggregation   │
  │ 6. Geodesic Haversine GPS Distance & Noise Filtering      │
  │ 7. Rolling 24-Hour Habit Continuity & Streak Engine       │
  └───────────────────────────────────────────────────────────┘
```

### 3.1 Basal Metabolic Rate (BMR) Formulation
FitTrack computes baseline resting metabolic expenditure using the **Mifflin-St Jeor Formula**, recognized as the most accurate clinical standard for predicting resting metabolic rate in adults:

$$\text{BMR}_{\text{male}} = (10 \times m_{\text{kg}}) + (6.25 \times h_{\text{cm}}) - (5 \times a_{\text{years}}) + 5$$

$$\text{BMR}_{\text{female}} = (10 \times m_{\text{kg}}) + (6.25 \times h_{\text{cm}}) - (5 \times a_{\text{years}}) - 161$$

Where:
* $m_{\text{kg}}$ is the athlete's body mass in kilograms.
* $h_{\text{cm}}$ is the athlete's height in centimeters.
* $a_{\text{years}}$ is the athlete's age in calendar years.

### 3.2 Total Daily Energy Expenditure (TDEE)
$$\text{TDEE} = \text{BMR} \times k_{\text{activity}}$$

The activity multiplier $k_{\text{activity}}$ maps to validated physical activity levels (PAL):

| Activity Level | Multiplier ($k_{\text{activity}}$) | Activity Description |
| :--- | :---: | :--- |
| **Light** | $1.375$ | Sedentary desk work with 1–2 light weekly training sessions |
| **Moderate** | $1.550$ | Standard active routine with 3–4 weekly training sessions |
| **Active** | $1.725$ | Dedicated progressive overload lifter with 5–6 weekly sessions |
| **Very Active** | $1.900$ | High-volume daily or twice-daily intensive athletic training |

### 3.3 Macronutrient Target Distribution Math
To optimize lean muscle mass preservation, muscular hypertrophy, and sustained energy:

1. **Target Protein ($P_{\text{goal}}$)**:
   Calibrated to an athletic hypertrophy baseline of **$2.0\text{ g}$ per kilogram of body weight**:
   $$P_{\text{goal}} = \text{round}(m_{\text{kg}} \times 2.0) \quad [\text{grams}]$$
   *Energy from protein: $E_P = P_{\text{goal}} \times 4\text{ kcal/g}$*

2. **Target Dietary Fat ($F_{\text{goal}}$)**:
   Calibrated to **$25\%$ of total daily energy expenditure** for endocrine and hormonal health:
   $$F_{\text{goal}} = \text{round}\left(\frac{\text{TDEE} \times 0.25}{9\text{ kcal/g}}\right) \quad [\text{grams}]$$
   *Energy from fat: $E_F = F_{\text{goal}} \times 9\text{ kcal/g}$*

3. **Target Carbohydrates ($C_{\text{goal}}$)**:
   Allocated from the remaining caloric pool for muscle glycogen replenishment:
   $$C_{\text{goal}} = \max\left(0, \text{round}\left(\frac{\text{TDEE} - (E_P + E_F)}{4\text{ kcal/g}}\right)\right) \quad [\text{grams}]$$

---

### 3.4 Muscle Recovery & Fatigue Decay Model
Each of the 10 monitored muscle groups ($i \in \{1 \dots 10\}$: *Pectorals, Lats, Deltoids, Biceps, Triceps, Core, Glutes, Quads, Hamstrings, Calves*) tracks an individual physiological readiness score $S_i(t) \in [0, 100]$.

Following high-volume mechanical tension, muscle tissue experiences cellular fatigue and micro-trauma, followed by an exponential asymptotic recovery curve over elapsed time $t$ (hours):

$$S_i(t) = S_0 + (100 - S_0) \times \left(1 - e^{-t / \tau}\right)$$

Where:
* $S_0$ = Residual post-training baseline score (typically $35–45\%$ following heavy compound sessions).
* $\tau$ = Muscle recovery time constant ($\approx 48–72\text{ hours}$ depending on volume and muscle size).
* $t$ = Hours elapsed since the muscle was last loaded.

#### Recovery Status Thresholds
* **$80\% \le S_i \le 100\%$ — Fully Recovered** (`#22C55E` Emerald): Neuromuscular system primed for heavy compound progression.
* **$65\% \le S_i < 80\%$ — Recovering** (`#F59E0B` Amber): Optimal for hypertrophy volume, accessory lifts, or mobility flow.
* **$S_i < 65\%$ — Needs Rest** (`#EF4444` Crimson): High residual fatigue. Heavy loading discouraged; active rest advised.

### 3.5 Composite Athletic Readiness Index
The global readiness score displayed on the Home overview dashboard is a bounded composite index ($R_{\text{composite}} \in [50, 98]$):

$$R_{\text{composite}} = \text{clamp}\Big(50, 98, R_{\text{base}} + \Delta_{\text{workout}} + \Delta_{\text{nutrition}} + \Delta_{\text{gps}} + \Delta_{\text{streak}}\Big)$$

Where:
* $R_{\text{base}} = 82$ (Baseline optimal athletic readiness).
* $\Delta_{\text{workout}} = +10$ if a session was completed today, else $+4$.
* $\Delta_{\text{nutrition}} = +4$ if logged calories $\ge 800\text{ kcal}$ with balanced protein.
* $\Delta_{\text{gps}} = +3$ if an outdoor GPS session was recorded today.
* $\Delta_{\text{streak}} = \min(6, \text{streak\_count} \times 2)$.

---

### 3.6 Indian Food Scaling & Custom Recipe Aggregation
#### Single Food Item Linear Scaling
For any food item logged from the Indian Food Database with base values $(K_0, P_0, C_0, F_0)$ and portion multiplier $M \in \{0.5, 1.0, 1.5, 2.0, 3.0\}$:

$$\text{Kcal} = K_0 \times M, \quad \text{Protein} = P_0 \times M, \quad \text{Carbs} = C_0 \times M, \quad \text{Fat} = F_0 \times M$$

#### Custom Meal Composite Aggregation
When an athlete builds a custom recipe from $n$ raw ingredients (e.g., $60\text{g}$ Rolled Oats + $200\text{ml}$ Cow Milk):

$$\text{Total Kcal} = \sum_{j=1}^{n} \left(\frac{q_j}{100} \times K_{100, j}\right)$$

$$\text{Total Protein (g)} = \sum_{j=1}^{n} \left(\frac{q_j}{100} \times P_{100, j}\right)$$

$$\text{Total Carbs (g)} = \sum_{j=1}^{n} \left(\frac{q_j}{100} \times C_{100, j}\right)$$

$$\text{Total Fat (g)} = \sum_{j=1}^{n} \left(\frac{q_j}{100} \times F_{100, j}\right)$$

Where $q_j$ is the quantity measured in grams/milliliters and $K_{100, j}, P_{100, j}, C_{100, j}, F_{100, j}$ are the macronutrients per $100\text{g/ml}$.

---

### 3.7 Geodesic GPS Distance & Velocity-Gated Noise Suppression
#### The Haversine Displacement Equation
To compute the true great-circle surface distance between two successive GPS coordinates $(\phi_1, \lambda_1)$ and $(\phi_2, \lambda_2)$:

$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$

$$c = 2 \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1-a}\right)$$

$$d = R_{\text{earth}} \cdot c \quad \text{where } R_{\text{earth}} \approx 6,371.0\text{ km}$$

#### Velocity Gating & Noise Filter
Smartphone GPS receivers generate multi-path bounce errors. FitTrack applies a two-stage filter:
1. **Accuracy Threshold**: If GPS horizontal accuracy uncertainty $\sigma_{\text{accuracy}} > 25\text{ meters}$, the point is dropped.
2. **Kinematic Velocity Gating**: If calculated instantaneous speed between successive points exceeds running limits:
   $$v_{\text{instant}} = \frac{\Delta d}{\Delta t} > 35\text{ km/h} \quad (9.72\text{ m/s})$$
   The point is flagged as a satellite multipath jump and discarded from the active route polyline.

#### Running Pace Telemetry
$$\text{Pace} = \frac{\Delta t_{\text{seconds}} / 60}{\Delta d_{\text{km}}} \quad [\text{min/km}]$$

---

## 4. Frontend Engineering & 3D Interactive Graphics

```
  ┌───────────────────────────────────────────────────────────┐
  │                      FRONTEND STACK                       │
  ├───────────────────────────────────────────────────────────┤
  │ React 19.2.1 • TypeScript 5.9.3 • Vite 7.1.9             │
  │ Three.js 0.185.1 • React Three Fiber 9.7 • Drei 10.7      │
  │ Tailwind CSS v4 • Framer Motion 12.23 • Radix UI          │
  └───────────────────────────────────────────────────────────┘
```

### 4.1 React 19 Concurrent Rendering
FitTrack leverages **React 19** concurrent features. Three.js canvas WebGL render loops run asynchronously alongside DOM reconciliation, ensuring that 60 FPS 3D animations never block form interactions or tab navigation.

### 4.2 3D Anatomy & Kinetic Recovery Studio
* **Interactive Anatomy Mesh**: Renders a complete anatomical human model in Three.js with individual raycaster hit-testing for muscle groups.
* **Shader Material State**: Each muscle mesh receives dynamic emissive uniforms that pulse according to the calculated recovery score ($S_i$).
* **Orbital Readiness Form**: Mathematical Torus Knot geometries on the Overview dashboard execute continuous slow-axis rotation with dynamic vertex displacement.

### 4.3 Kinetic Exercise Guidance & Video Player
* **Coaching Flip Cards**: 3D perspective flip cards with setup cues, primary cues, and reserve tips.
* **Integrated Video Player**: Clean, dark-mode modal streaming HD exercise videos (`/videos/bench-press.mp4`, etc.) with:
  * Slow-motion speed cycling (`1x`, `0.75x`, `0.5x`) for form analysis.
  * Autoplay, infinite looping, and audio mute toggles.
  * Fallback canvas telemetry if hardware video codecs are restricted.

---

## 5. Backend, Serverless & API Architecture

### 5.1 Architecture Diagram

```mermaid
graph TD
    subgraph BrowserClient ["Browser Client (React 19 / PWA)"]
        UI["UI Components & Pages"]
        Store["Scoped LocalStorage (user-store.ts)"]
        SyncQueue["Supabase Sync Engine (supabase-sync.ts)"]
        RexiClient["Rexi AI Telemetry Client"]
    end

    subgraph EdgeCDN ["Edge Infrastructure (Vercel)"]
        VercelEdge["Vercel Global Edge Network"]
        Serverless["Serverless Functions / tRPC Router"]
    end

    subgraph CloudServices ["Cloud Infrastructure"]
        PostgreSQL[("Supabase PostgreSQL 15")]
        RLSPolicy["Row-Level Security Engine"]
        GeminiAPI["Google Gemini 1.5 Flash API"]
    end

    UI <--> Store
    Store <--> SyncQueue
    SyncQueue <--> RLSPolicy
    RLSPolicy <--> PostgreSQL
    UI <--> Serverless
    Serverless <--> PostgreSQL
    RexiClient <--> GeminiAPI
    VercelEdge --> BrowserClient
```

### 5.2 Serverless Edge Layer
* Deployed on **Vercel Serverless Edge Platform**, eliminating idle server power consumption and fixed maintenance overhead.
* Cold starts are minimized ($<250\text{ ms}$) using lightweight ESM bundling via `esbuild`.

### 5.3 Offline-First Background Sync Engine (`supabase-sync.ts`)
* **Local-First Writes**: When an athlete completes a workout, logs nutrition, or records weight, data is written synchronously to local storage.
* **Asynchronous Queue**: Transactions are pushed to Supabase PostgreSQL in the background.
* **Auto-Reconnection**: If an athlete logs a workout in an offline gym basement, `supabase-sync.ts` enqueues the payload, listens for the browser's `online` event, and automatically flushes the queue upon reconnection.

---

## 6. Database Architecture & Storage Models

### 6.1 PostgreSQL Schema Architecture (Supabase)

The database schema enforces relational integrity across 6 core tables:

```mermaid
erDiagram
    users ||--o{ athlete_profiles : "1:1 profile"
    users ||--o{ workout_logs : "1:N workouts"
    users ||--o{ nutrition_logs : "1:N meals"
    users ||--o{ gps_sessions : "1:N runs"
    users ||--o{ achievements_unlocked : "1:N badges"

    users {
        bigserial id PK
        varchar open_id UK
        varchar email UK "Tenant Key"
        text name
        text avatar_url
        varchar login_method
        varchar experience_level
        timestamptz created_at
    }

    athlete_profiles {
        bigserial id PK
        varchar user_email FK
        numeric weight_kg
        numeric height_cm
        int age
        varchar sex
        varchar activity_level
        int goal_kcal
        int goal_protein
        int goal_carbs
        int goal_fat
    }

    workout_logs {
        bigserial id PK
        varchar user_email FK
        text title
        varchar focus
        numeric volume_kg
        int duration_seconds
        timestamptz completed_at
    }

    nutrition_logs {
        bigserial id PK
        varchar user_email FK
        varchar meal_slot
        text food_name
        numeric portion_multiplier
        int calories
        numeric protein_g
        numeric carbs_g
        numeric fat_g
        timestamptz logged_at
    }

    gps_sessions {
        bigserial id PK
        varchar user_email FK
        varchar activity_type
        numeric distance_km
        int duration_seconds
        varchar avg_pace
        jsonb route_points
        timestamptz started_at
    }

    achievements_unlocked {
        bigserial id PK
        varchar user_email FK
        varchar badge_id
        timestamptz unlocked_at
    }
```

### 6.2 Data Definition Language (DDL) Specifications

#### Table 1: `public.users`
```sql
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    open_id VARCHAR(64) UNIQUE,
    email VARCHAR(320) UNIQUE NOT NULL,
    name TEXT DEFAULT 'Athlete',
    avatar_url TEXT,
    login_method VARCHAR(64) DEFAULT 'custom',
    experience_level VARCHAR(32) DEFAULT 'beginner',
    role VARCHAR(32) DEFAULT 'user',
    last_signed_in TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Table 2: `public.athlete_profiles`
```sql
CREATE TABLE IF NOT EXISTS public.athlete_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE UNIQUE,
    weight_kg NUMERIC(6, 2) DEFAULT 75.00 NOT NULL,
    height_cm NUMERIC(5, 1) DEFAULT 175.0 NOT NULL,
    age INT DEFAULT 24 NOT NULL,
    sex VARCHAR(16) DEFAULT 'male',
    activity_level VARCHAR(32) DEFAULT 'moderate' NOT NULL,
    focus VARCHAR(180) DEFAULT 'Hypertrophy & Progressive Overload' NOT NULL,
    goal_kcal INT DEFAULT 2400 NOT NULL,
    goal_protein INT DEFAULT 160 NOT NULL,
    goal_carbs INT DEFAULT 260 NOT NULL,
    goal_fat INT DEFAULT 65 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Table 3: `public.workout_logs`
```sql
CREATE TABLE IF NOT EXISTS public.workout_logs (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    title TEXT NOT NULL,
    focus VARCHAR(64) NOT NULL,
    movement_count INT DEFAULT 3 NOT NULL,
    volume_kg NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    duration_seconds INT DEFAULT 0 NOT NULL,
    completed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Table 4: `public.nutrition_logs`
```sql
CREATE TABLE IF NOT EXISTS public.nutrition_logs (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    meal_slot VARCHAR(64) DEFAULT 'Breakfast' NOT NULL,
    food_name TEXT NOT NULL,
    serving_size TEXT DEFAULT '1 serving',
    portion_multiplier NUMERIC(4, 2) DEFAULT 1.00 NOT NULL,
    calories INT NOT NULL,
    protein_g NUMERIC(6, 1) DEFAULT 0.0 NOT NULL,
    carbs_g NUMERIC(6, 1) DEFAULT 0.0 NOT NULL,
    fat_g NUMERIC(6, 1) DEFAULT 0.0 NOT NULL,
    logged_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Table 5: `public.gps_sessions`
```sql
CREATE TABLE IF NOT EXISTS public.gps_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    activity_type VARCHAR(32) DEFAULT 'Run' NOT NULL,
    distance_km NUMERIC(6, 2) DEFAULT 0.00 NOT NULL,
    duration_seconds INT DEFAULT 0 NOT NULL,
    avg_pace VARCHAR(16) DEFAULT '00:00',
    calories_burned INT DEFAULT 0,
    route_points JSONB DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    ended_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
```

#### Table 6: `public.achievements_unlocked`
```sql
CREATE TABLE IF NOT EXISTS public.achievements_unlocked (
    id BIGSERIAL PRIMARY KEY,
    user_email VARCHAR(320) NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    badge_id VARCHAR(64) NOT NULL,
    unlocked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(user_email, badge_id)
);
```

### 6.3 Scoped Client-Side LocalStorage Namespace Mapping
To prevent multi-user collisions on shared devices and preserve privacy:

| Entity | Scoped Storage Key Pattern | Serialized Structure |
| :--- | :--- | :--- |
| **Athlete Profile** | `fittrack_profile__<email>` | `{ name, email, location, focus, photoDataUrl }` |
| **Calibration Settings** | `fittrack_calibration__<email>` | `{ weightKg, heightCm, age, sex, activityLevel, goalKcal, ... }` |
| **Daily Meals (Today)** | `fittrack_logged_nutrition_today__<email>` | `[{ id, name, kcal, p, c, f, meal, time }]` |
| **Workout History** | `fittrack_workout_logs__<email>` | `[{ title, focus, movementCount, volumeKg, completedAt }]` |
| **GPS History** | `fittrack_gps_sessions__<email>` | `[{ id, distanceKm, duration, avgPace, routePoints }]` |
| **Daily Streak** | `fittrack-daily-streak__<email>` | `{ count, lastLoggedDate, highestStreak }` |
| **Hashed Credential** | `fittrack_cred_hash__<email>` | SHA-256 hex string digest |

---

## 7. Security Architecture & Multi-Tenant Isolation

### 7.1 PostgreSQL Row-Level Security (RLS)
Security is enforced at the database layer rather than relying solely on application middleware. A database security definer function extracts the authenticated identity from the JWT claims:

```sql
-- Security Definer Function
CREATE OR REPLACE FUNCTION public.current_athlete_email()
RETURNS VARCHAR AS $$
BEGIN
    RETURN NULLIF(current_setting('request.jwt.claims', true)::json->>'email', '');
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Enabling RLS Across Tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.athlete_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements_unlocked ENABLE ROW LEVEL SECURITY;

-- Tenant Isolation Policies (Applied per table)
CREATE POLICY "users_rls_policy" ON public.users FOR ALL 
USING (email = public.current_athlete_email() OR email = current_user);

CREATE POLICY "profiles_rls_policy" ON public.athlete_profiles FOR ALL 
USING (user_email = public.current_athlete_email() OR user_email = current_user);

CREATE POLICY "workouts_rls_policy" ON public.workout_logs FOR ALL 
USING (user_email = public.current_athlete_email() OR user_email = current_user);

CREATE POLICY "nutrition_rls_policy" ON public.nutrition_logs FOR ALL 
USING (user_email = public.current_athlete_email() OR user_email = current_user);

CREATE POLICY "gps_rls_policy" ON public.gps_sessions FOR ALL 
USING (user_email = public.current_athlete_email() OR user_email = current_user);

CREATE POLICY "achievements_rls_policy" ON public.achievements_unlocked FOR ALL 
USING (user_email = public.current_athlete_email() OR user_email = current_user);
```

### 7.2 Web Crypto SHA-256 Credential Hashing
For standard email/password authentication, passwords are cryptographically hashed client-side before storage using the native browser Web Crypto API:

```typescript
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_fittrack_salt_2026");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

### 7.3 Google Identity Services (GIS) Token Validation
When users sign in via Google OAuth2, the JWT token payload is inspected:
1. **Audience Validation**: `payload.aud` must strictly equal `GOOGLE_CLIENT_ID`.
2. **Expiration Validation**: `payload.exp` is checked against `Date.now() / 1000`.
3. **Issuer Validation**: `payload.iss` must originate from `accounts.google.com` or `https://accounts.google.com`.

---

## 8. Rexi AI Conversational Engine & Guardrails

```mermaid
sequenceDiagram
    autonumber
    actor Athlete as Athlete (User)
    participant UI as FitTrack Interface
    participant Telemetry as Telemetry Aggregator
    participant RexiEngine as Rexi Context Engine
    participant Gemini as Google Gemini 1.5 Flash API

    Athlete->>UI: Prompt: "Create a vegetarian high-protein diet plan for 2200 kcal"
    UI->>Telemetry: Query current BMR, TDEE, macro split, logged food
    Telemetry-->>RexiEngine: Return Athlete Profile & Nutritional Balance
    RexiEngine->>RexiEngine: Inject physiological constraints & system prompt
    RexiEngine->>Gemini: POST https://generativelanguage.googleapis.com/...
    Gemini-->>RexiEngine: Stream structured Indian meal plan + macro breakdown
    RexiEngine-->>UI: Render formatted response in AI drawer
    UI-->>Athlete: Personalized coaching plan displayed
```

### 8.1 Real-Time Physiological Telemetry Augmentation
Rexi is never queried with ungrounded text. Every prompt automatically injects:
* Athlete Name & Experience Tier (*Beginner, Intermediate, Advanced Gym Rat*).
* Body Mass ($m_{\text{kg}}$), Height ($h_{\text{cm}}$), Age, Biological Sex.
* Calculated BMR & TDEE.
* Daily Caloric Target & Remaining Caloric Pool.
* Daily Protein Target & Grams Logged Today.
* Recent Workout Count & Device Local Time.

### 8.2 Medical & Safety Guardrails
1. **Caloric Floor**: Explicitly rejects recommendations below $1,200\text{ kcal/day}$ to prevent unhealthy metabolic slowdown.
2. **Spinal & Joint Alignment**: For Beginner athletes, movements mandate neutral spine and controlled eccentric cadence cues before load increases.
3. **Dietary Localization**: Prioritizes affordable Indian protein sources (Paneer, Dal, Soya Chunks, Sprouts, Curd, Roasted Chana) over inaccessible Western supplements.

---

## 9. Full System Verification & Production Test Report

An automated end-to-end user simulation was executed on the production build via headless Chrome:

| Test Step | Target Feature | Automated Assertion Result | Status |
| :---: | :--- | :--- | :---: |
| **01** | Landing Page Load | Hero section, quote ticker, and CTA render cleanly | ✅ PASS |
| **02** | User Registration | Created athlete account (`athlete.sih.<id>@fittrack.in`), hashed password | ✅ PASS |
| **03** | Rexi Onboarding Modal | 3D mascot, welcome bubble, and Intermediate tier selection verified | ✅ PASS |
| **04** | Profile Calibration | Calibrated BMR, TDEE, weight ($72\text{ kg}$), height ($175\text{ cm}$), and saved settings | ✅ PASS |
| **05** | Home Dashboard | Rendered 3D Orbital Scene ($82/100$ readiness), training rhythm, and nutrition ledger | ✅ PASS |
| **06** | Exercise Library & Videos | Loaded 23 exercises; streamed `bench-press.mp4` (`readyState: 4`, $1080\times 1920$, $8.6\text{s}$, loop) | ✅ PASS |
| **07** | Workout Logging | Verified 10 protocol inputs, volume calculation, and protocol commit button | ✅ PASS |
| **08** | Nutrition Lab | Searched Indian Food Database, logged food to *Breakfast*, switched to Custom Meal Builder | ✅ PASS |
| **09** | 3D Muscle Recovery Studio | Initialized Three.js WebGL canvas ($1019\times 725$), selected Chest (Pectoralis Major, $85\%$ ready) | ✅ PASS |
| **10** | GPS Route Tracker | Rendered Leaflet/OpenStreetMap container, verified record button and telemetry fields | ✅ PASS |
| **11** | Progress Weight Logging | Submitted body weight log, updated progression curve | ✅ PASS |
| **12** | Gamification & Badges | Verified 8 milestone badge cards (Bench Breaker, Streak Master, etc.) | ✅ PASS |
| **13** | Notifications & Support | Loaded activity notifications and verified FAQ accordion entries | ✅ PASS |
| **14** | Rexi AI Diet Plan Prompt | Sent prompt for 2,200 kcal high-protein vegetarian diet; received structured meal split from Gemini | ✅ PASS |
| **15** | Theme Toggle & Sign-Out | Switched Dark/Light mode, signed out, confirmed redirection to Landing page | ✅ PASS |

**Test Suite Summary**:
* Total Operational Tests: **15 / 15 Passed (100%)**
* Fatal JavaScript Crashes: **0**
* Network Failures (4xx / 5xx): **0**

---

## 10. Conclusion

FitTrack demonstrates the power of combining modern web standards, hardware-accelerated 3D graphics, localized domain knowledge, and generative artificial intelligence. By eliminating cost barriers, localizing nutritional tracking for the Indian diet, and grounding AI coaching in real-time physiological telemetry, FitTrack stands as a production-grade, scalable platform ready for national impact at the **Smart India Hackathon 2026**.
