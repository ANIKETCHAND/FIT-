# 📄 Product Requirements Document (PRD)
## FitTrack — Intelligent Athletic Performance Operating System
**Smart India Hackathon 2026 (SIH 2026) Submission**

---

## 1. Document Overview
* **Product Name**: FitTrack Performance OS
* **Version**: 2.0.0 (Production Release)
* **Author / Team**: FitTrack Engineering Team (SIH 2026)
* **Status**: Pre-Hackathon Phase (Undeployed in compliance with competition guidelines; local build verified)
* **Target Audience**: Indian fitness enthusiasts, students, athletes, desk workers, and gym-goers combating sedentary lifestyles.

---

## 2. Problem Statement & Market Opportunity

### 2.1 The Indian Fitness Paradox
1. **The Regional Nutrition Blindspot**: Over 85% of global fitness tracking applications (MyFitnessPal, MyNetDiary) cater exclusively to Western diets (oatmeal, salads, protein shakes). They lack native, verified nutritional breakdowns for staple Indian home-cooked meals such as *Roti, Dal Tadka, Paneer Bhurji, Regional Thalis, Idli, Dosa, and Biryani*. Users are forced to guess portions or abandon logging altogether.
2. **Prohibitive Personal Coaching Costs**: Professional personal gym training and clinical dietary guidance in India cost between **₹3,000 and ₹10,000 per month**, making ongoing athletic guidance inaccessible to students and early-career professionals.
3. **The 90-Day Gym Attrition Epidemic**: Over 80% of individuals who start fitness regimens abandon them within the first three months due to lack of immediate feedback, confusing exercise setups, unscientific volume progression, and burnout.
4. **The Youth Lifestyle Disease Crisis**: Non-communicable diseases (Type-2 Diabetes, early hypertension, metabolic syndrome) are surging among sedentary Indian youth. Preventative, accessible, and engaging fitness telemetry is a vital national imperative supporting the **Fit India Movement**.

---

## 3. Product Vision & Value Proposition
FitTrack is an all-in-one, browser-first, cloud-synchronized **Athletic Performance Operating System**. It democratizes elite-tier sports telemetry, biomechanics guidance, and personalized nutrition through:
* **Interactive 3D Anatomy & Muscle Recovery Studio**: Visualizing muscle fatigue and readiness in full WebGL 3D without expensive proprietary hardware.
* **Localized Smart Nutrition Lab**: Tracking regional Indian culinary items alongside raw pantry ingredients with automated Mifflin-St Jeor BMR/TDEE calibrations.
* **Rexi AI Conversational Coach**: An always-available multimodal AI fitness mentor (powered by Google Gemini 1.5 Flash) grounded in real-time athlete biometrics.
* **Kinetic Form Video Guidance**: Loopable, slow-motion exercise demonstrations directly embedded inside workout protocols.
* **GPS Outdoor Route Tracker**: Browser-native route and pace telemetry with zero battery-draining native app overhead.
* **Zero-Barrier Inclusivity**: Operates smoothly across low-bandwidth connections and budget smartphones as a progressive web app (PWA) with zero subscription fees.

---

## 4. User Personas

| Persona | Demographics & Context | Pain Points | FitTrack Solution |
| :--- | :--- | :--- | :--- |
| **Aarav (The College Beginner)** | 20 yrs, University Student, Tier-2 City | Confused by gym equipment; cannot afford personal trainers; intimidates easily. | Beginner Mode, step-by-step 3D muscle cues, and slow-motion video form guides. |
| **Pooja (The Urban Professional)** | 27 yrs, Software Engineer, Bengaluru | Sits 10+ hours a day; suffers postural fatigue; eats home-cooked Indian meals. | Instant Indian food macro breakdown, 3D postural recovery tracking, and adaptive quick workouts. |
| **Vikram (The "Gym Rat" Athlete)** | 24 yrs, Dedicated Lifter, Delhi | Needs precise progressive overload tracking, volume telemetry, and periodization. | Multi-set logging, tonnage calculations, 24-hour streak continuity, and PR badge unlocks. |
| **Rohit (The Outdoor Runner)** | 22 yrs, Runner & Cyclist, Pune | Dislikes carrying bulky fitness trackers; needs GPS distance and pace logging. | Native HTML5 GPS route tracking with live Leaflet route mapping and pace telemetry. |

---

## 5. Functional Requirements (FR Matrix)

### FR-1: Authentication & Identity Management
* **FR-1.1**: Email & password authentication with client-side SHA-256 password hashing.
* **FR-1.2**: Production Google GIS (Google Identity Services) OAuth2 One-Tap and popup sign-in.
* **FR-1.3**: Automatic default Dark Mode enforcement upon successful athlete authentication.
* **FR-1.4**: Per-user data scoping in the API layer — every server read/write is filtered by the authenticated athlete's email. RLS policies keyed on `public.current_athlete_email()` are included in `supabase/schema.sql` for direct-DB access.

### FR-2: Rexi AI Onboarding & Level Calibration
* **FR-2.1**: Interactive 3D mascot greeting for first-time sign-ups with animated speech bubble.
* **FR-2.2**: Multi-tier experience selection: **Beginner**, **Intermediate**, or **Advanced Gym Rat**.
* **FR-2.3**: Biometric onboarding calibration wizard: Body weight (kg), height (cm), age, sex, and activity tier.
* **FR-2.4**: Single-run onboarding rule: Subsequent sign-ins by configured accounts bypass onboarding directly to the Overview Dashboard.

### FR-3: Home & Performance Overview Dashboard
* **FR-3.1**: Real-time athletic readiness score (0–100) computed from workout continuity, nutrition adherence, and active fatigue.
* **FR-3.2**: 3D Orbital Readiness Form rendered via WebGL Three.js.
* **FR-3.3**: 7-day visual Training Rhythm grid tracking completed, today's, and upcoming workouts.
* **FR-3.4**: Daily Nutrition Ledger card showing remaining calories and real-time macronutrient progress.

### FR-4: Workouts & Exercise Library
* **FR-4.1**: Comprehensive exercise directory categorized across 8 core muscle groups (Pectorals, Lats, Deltoids, Biceps, Triceps, Quads, Hamstrings, Core).
* **FR-4.2**: Kinetic Flip Cards featuring setup cues, primary cues, and coaching tips.
* **FR-4.3**: Integrated video playback modal streaming high-definition MP4 demonstrations (`barbell-bench-press.mp4`, etc.).
* **FR-4.4**: Video controls: Slow-motion playback rate cycling (`1x`, `0.75x`, `0.5x`), looping, and audio mute/unmute.
* **FR-4.5**: Search and filter by muscle group, movement name, equipment, and user favorites.

### FR-5: Workout Logging & Progression Protocol
* **FR-5.1**: Multi-exercise set logging with load (kg), target repetitions, and rest timers.
* **FR-5.2**: Dynamic estimated workout volume computation (Total kg lifted).
* **FR-5.3**: Protocol completion dial requiring 100% check-off before closing training sessions.
* **FR-5.4**: Automatic daily streak incrementation upon protocol commitment.

### FR-6: Localized Smart Nutrition Lab
* **FR-6.1**: Verified Indian Food Database containing calories, protein, carbs, and fats for regional meals (Roti, Dal, Paneer, Sabzi, etc.).
* **FR-6.2**: Dynamic portion size multiplier (`0.5x`, `1.0x`, `1.5x`, `2.0x`, `3.0x`).
* **FR-6.3**: Custom Meal Builder tab with raw pantry items (rolled oats, milk, eggs, rice, lentils) scaled by grams/ml.
* **FR-6.4**: Multi-slot categorization: *Breakfast, Lunch, Evening Snack, Dinner, Post-Workout*.
* **FR-6.5**: Automated daily targets calibrated from athlete BMR and TDEE formulas.

### FR-7: 3D Anatomy & Muscle Recovery Studio
* **FR-7.1**: Real-time interactive 3D human anatomical model rendered in WebGL Canvas.
* **FR-7.2**: Interactive selection of individual muscle groups (Chest, Shoulders, Biceps, Triceps, Core, Back, Glutes, Quads, Hamstrings, Calves).
* **FR-7.3**: Color-coded recovery telemetry: Fully Recovered (Green `#22C55E`), Recovering (Amber `#F59E0B`), Needs Rest (Red `#EF4444`).
* **FR-7.4**: Diagnostic panel detailing anatomical names, weekly tonnage, last trained date, and recovery recommendations.

### FR-8: GPS Outdoor Running & Walking Tracker
* **FR-8.1**: Browser-based real-time geolocation tracking using the HTML5 Geolocation API.
* **FR-8.2**: Interactive route mapping using open-source Leaflet (loaded via CDN) with OpenStreetMap/ArcGIS tiles — the key-free default engine. Google Maps is used only when a Maps API key is supplied.
* **FR-8.3**: Live metric calculation: Distance (km), Elapsed Time, Average Pace (min/km), and Caloric Burn.
* **FR-8.4**: Route noise suppression filtering erratic coordinate drift (>35 km/h for running).

### FR-9: Rexi AI Conversational Coach
* **FR-9.1**: Persistent floating AI drawer with natural language chat and voice command support.
* **FR-9.2**: Context-grounded response generation using Google Gemini, called through a same-origin server-side proxy (`/api/rexi`) so the API key is never shipped to the browser. Degrades gracefully to canned coaching answers when no key is configured.
* **FR-9.3**: Injection of live athlete context (name, daily macro balance, current calories, experience tier, device time) into prompt telemetry.
* **FR-9.4**: Generation of tailored meal plans, vegetarian high-protein diets, workout variations, and recovery advice.

### FR-10: Cloud Database & Supabase Sync
* **FR-10.1**: Best-effort cloud database synchronization with a Supabase PostgreSQL backend (the client-side localStorage cache is the primary source of truth; cloud sync is an additive convenience, not a hard dependency).
* **FR-10.2**: Offline-first persistent client cache; data is retained locally and pushed to Supabase on a best-effort basis when connectivity and cloud config are available.
* **FR-10.3**: Supabase Management card in Settings offering SQL schema export, connection latency testing, and manual push/pull triggers.

---

## 6. Non-Functional Requirements (NFRs)

| Metric | Requirement | Target |
| :--- | :--- | :--- |
| **Performance** | Initial page load time (LCP) | $< 1.8\text{ seconds}$ on 4G network |
| **Responsiveness** | UI interaction latency | $< 50\text{ ms}$ response on input |
| **Graphics** | 3D WebGL Canvas Frame Rate | Constant $60\text{ FPS}$ on desktop and mobile |
| **AI Speed** | Rexi AI conversation turnaround | $< 1.5\text{ seconds}$ average generation time |
| **Security** | Database Tenant Isolation | Per-user data scoping enforced in the API layer (every read/write filtered by the authenticated athlete's email); PostgreSQL Row-Level Security policies are included in `supabase/schema.sql` for direct-DB access |
| **Privacy** | Biometric and Location Data | Client-scoped local encryption + zero third-party tracking |
| **Reliability** | Offline Resilience | 100% core logging operational without active internet |
| **Compatibility** | Device & Browser Coverage | Chrome, Edge, Safari, Firefox on Desktop, Android & iOS |

---

## 7. Future Roadmap (Post-Hackathon)
* **v2.1**: Native PWA Install Prompt with Service Worker background synchronization.
* **v2.2**: Bluetooth Low Energy (BLE) heart rate monitor and smartband sensor pairing via Web Bluetooth API.
* **v2.3**: Computer Vision (MediaPipe) real-time camera rep counting and posture feedback.
* **v2.4**: Multi-language regional Indian voice recognition (Hindi, Tamil, Telugu, Marathi).
