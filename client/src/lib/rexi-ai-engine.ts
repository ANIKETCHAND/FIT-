/* FitTrack: Ultra-Intelligent Rexi AI Conversational Engine (Powered by Google Gemini + Live Telemetry) */
import { getActiveUserEmail, getAthleteProfile, getCalibrationSettings, getScopedKey } from "./user-store";

export interface RexiContext {
  athleteName: string;
  athleteEmail: string;
  experienceMode: "beginner" | "intermediate" | "advanced";
  massKg: number;
  heightCm: number;
  age: number;
  sex: "male" | "female";
  activityLevel: string;
  goalKcal: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
  bmr: number;
  tdee: number;
  loggedMealsToday: Array<{ name: string; kcal: number; p: number; c: number; f: number; meal: string }>;
  totalLoggedKcal: number;
  totalLoggedProtein: number;
  remainingKcal: number;
  remainingProtein: number;
  workoutCount: number;
  activeRoute: string;
  // Device & Temporal Context
  deviceDateString: string;
  deviceTimeString: string;
  deviceTimezone: string;
  deviceDayOfWeek: string;
  devicePlatform: string;
}

const GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
];

export function getLiveRexiContext(activeRoute: string = "/overview"): RexiContext {
  const profile = getAthleteProfile();
  const calibration = getCalibrationSettings();
  const experienceMode = (localStorage.getItem("fittrack-experience-mode") || "beginner") as "beginner" | "intermediate" | "advanced";

  const massKg = calibration.weightKg || 70;
  const heightCm = calibration.heightCm || 175;
  const age = calibration.age || 24;
  const sex = calibration.sex || "male";

  const bmr = Math.round(
    sex === "male"
      ? 10 * massKg + 6.25 * heightCm - 5 * age + 5
      : 10 * massKg + 6.25 * heightCm - 5 * age - 161
  );

  const multipliers: Record<string, number> = {
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = Math.round(bmr * (multipliers[calibration.activityLevel] || 1.55));

  let loggedMeals: any[] = [];
  try {
    const saved = localStorage.getItem(getScopedKey("fittrack_logged_nutrition_today"));
    loggedMeals = saved ? JSON.parse(saved) : [];
  } catch {}

  const totalLoggedKcal = loggedMeals.reduce((sum, item) => sum + (item.kcal || 0), 0);
  const totalLoggedProtein = Math.round(loggedMeals.reduce((sum, item) => sum + (item.p || 0), 0) * 10) / 10;

  const goalKcal = calibration.goalKcal || tdee;
  const goalProtein = calibration.goalProtein || Math.round(massKg * 2);
  const goalCarbs = calibration.goalCarbs || Math.round((goalKcal * 0.45) / 4);
  const goalFat = calibration.goalFat || Math.round((goalKcal * 0.25) / 9);

  let workoutLogs: any[] = [];
  try {
    const savedWorkouts = localStorage.getItem(getScopedKey("fittrack_workout_history"));
    workoutLogs = savedWorkouts ? JSON.parse(savedWorkouts) : [];
  } catch {}

  // Live Device & Temporal Telemetry
  const now = new Date();
  const deviceDateString = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const deviceTimeString = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const deviceTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const deviceDayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });
  let devicePlatform = "Browser Client";
  try {
    if (typeof navigator !== "undefined") {
      devicePlatform = navigator.userAgent.includes("Mobile") ? "Mobile Device" : "Desktop Workstation";
    }
  } catch {}

  return {
    athleteName: profile.name || "Athlete",
    athleteEmail: getActiveUserEmail(),
    experienceMode,
    massKg,
    heightCm,
    age,
    sex,
    activityLevel: calibration.activityLevel || "moderate",
    goalKcal,
    goalProtein,
    goalCarbs,
    goalFat,
    bmr,
    tdee,
    loggedMealsToday: loggedMeals,
    totalLoggedKcal,
    totalLoggedProtein,
    remainingKcal: Math.max(0, goalKcal - totalLoggedKcal),
    remainingProtein: Math.max(0, Math.round((goalProtein - totalLoggedProtein) * 10) / 10),
    workoutCount: workoutLogs.length,
    activeRoute,
    deviceDateString,
    deviceTimeString,
    deviceTimezone,
    deviceDayOfWeek,
    devicePlatform,
  };
}

/** Extract dynamic contextual question chips from the query and AI response */
function generateContextualChips(query: string, aiText: string): string[] {
  const q = query.toLowerCase();
  const text = aiText.toLowerCase();

  if (q.includes("date") || q.includes("time") || q.includes("day") || q.includes("today")) {
    return [
      "What is my workout split for today?",
      "What are my remaining calories today?",
      "How much protein do I have left?",
      "Recommend a chest workout",
    ];
  }
  if (q.includes("chest") || q.includes("bench") || q.includes("press") || text.includes("chest")) {
    return [
      "Incline vs Flat Dumbbell Press",
      "How to fix shoulder pain in bench press",
      "Best chest workout routine",
      "How many sets for chest hypertrophy?",
    ];
  }
  if (q.includes("protein") || q.includes("eat") || q.includes("diet") || q.includes("food") || text.includes("protein")) {
    return [
      "High protein Indian vegetarian foods",
      "Should I take whey protein before or after workout?",
      "Creatine Monohydrate dosage guide",
      "How to calculate my daily macros",
    ];
  }
  if (q.includes("arm") || q.includes("bicep") || q.includes("tricep") || text.includes("bicep")) {
    return [
      "Best exercises for bigger bicep peak",
      "Tricep long head vs lateral head",
      "How often should I train arms per week?",
      "Dumbbell hammer curls form",
    ];
  }
  if (q.includes("back") || q.includes("lat") || q.includes("deadlift") || text.includes("back")) {
    return [
      "Lat Pulldowns vs Pull-Ups",
      "How to feel lats in barbell rows",
      "Conventional vs Sumo Deadlift",
      "Lower back recovery tips",
    ];
  }
  if (q.includes("leg") || q.includes("squat") || text.includes("quad")) {
    return [
      "Bulgarian Split Squats form tips",
      "Barbell Back Squat vs Leg Press",
      "How to grow bigger hamstrings & calves",
      "Warmup routine for heavy squats",
    ];
  }

  return [
    "Recommend a workout for today",
    "What should I eat for my remaining macros?",
    "Explain progressive overload",
    "Show 3D Anatomy Map guide",
  ];
}

/**
 * Fast Google Gemini AI Generator with live device & athletic context
 */
export async function generateRexiChatResponse(
  userQuery: string,
  context: RexiContext,
  chatHistory: Array<{ sender: "rexi" | "user"; text: string }> = []
): Promise<{ text: string; chips?: string[] }> {
  const name = context.athleteName.split(" ")[0] || "Athlete";

  // 1. Official System Instruction for Gemini
  const systemPrompt = `You are Rexi, the world-class athletic intelligence AI assistant embedded directly in the FitTrack Performance OS.
You are a warm, highly motivating, scientifically grounded fitness coach, exercise biomechanist, and sports nutritionist.

CURRENT DEVICE & TEMPORAL CONTEXT:
- Current Device Date: ${context.deviceDateString}
- Current Local Time: ${context.deviceTimeString} (${context.deviceTimezone})
- Current Day of Week: ${context.deviceDayOfWeek}
- Client Platform: ${context.devicePlatform}

ATHLETE TELEMETRY CONTEXT:
- Athlete Name: ${context.athleteName} (Call them ${name})
- Body Mass: ${context.massKg} kg | Height: ${context.heightCm} cm | Age: ${context.age}
- Daily Targets: ${context.goalKcal} kcal | ${context.goalProtein}g Protein
- Telemetry Today: ${context.remainingKcal} kcal remaining | ${context.remainingProtein}g protein remaining
- Active Screen: ${context.activeRoute}

INSTRUCTIONS:
1. Exact Real-World Date & Time: Today is strictly ${context.deviceDateString}. When asked about today's date, day, or time, ALWAYS answer with the exact current device date (${context.deviceDateString}) and time (${context.deviceTimeString}). Never say past cutoff dates or 2025.
2. Answer all questions directly, accurately, and concisely without fluff or preamble.
3. If asked about workouts, provide structured routines with targeted sets, reps, and biomechanical cues.
4. If asked about exercise comparisons, compare range of motion, stabilizer recruitment, maximal load, and joint safety.
5. Do NOT output internal scratchpad notes, thoughts, or meta-commentary.
6. Use clean markdown formatting (bold headers, clean bullet points, readable spacing).`;

  // 2. Prepare conversation contents for Gemini API
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

  // Append recent chat history (last 4 turns)
  const recentHistory = chatHistory.slice(-4);
  recentHistory.forEach((msg) => {
    contents.push({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }],
    });
  });

  // Append current query
  contents.push({
    role: "user",
    parts: [{ text: userQuery }],
  });

  // 3. Try Gemini models via the same-origin proxy (key stays server-side) with timeout
  for (const model of GEMINI_MODELS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch("/api/rexi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        continue;
      }

      const data = await res.json();
      const aiReply = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (aiReply && aiReply.trim()) {
        return {
          text: aiReply.trim(),
          chips: generateContextualChips(userQuery, aiReply),
        };
      }
    } catch {
      // Try next model candidate on timeout or error
    }
  }

  // 4. Instant Fallback
  if (userQuery.toLowerCase().includes("date") || userQuery.toLowerCase().includes("today")) {
    return {
      text: `Today is **${context.deviceDateString}** (${context.deviceTimeString}).\n\nYour FitTrack telemetry is live with **${context.remainingKcal} kcal** and **${context.remainingProtein}g protein** remaining for today!`,
      chips: generateContextualChips(userQuery, ""),
    };
  }

  return {
    text: `### 🦖 Rexi Coach Insight for ${name}:\n\nToday is **${context.deviceDateString}**.\n\n• **Core Principle:** For maximum results at ${context.massKg}kg, focus on progressive overload, hitting your daily **${context.goalProtein}g Protein** target, and getting 7.5–9 hours of recovery sleep.\n\nFeel free to ask about your workouts, meal plans, or exercise form!`,
    chips: generateContextualChips(userQuery, ""),
  };
}
