export type AchievementKind = "streak" | "record" | "volume" | "recovery" | "explorer" | "fuel" | "distance";
export type AchievementCategory = "daily" | "monthly";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  kind: AchievementKind;
  progress: number;
  target: number;
  reward: string;
  unlocked: boolean;
};

export type ExerciseVariant = "bench" | "squat" | "curl" | "row" | "fly" | "press" | "deadlift" | "raise" | "pushdown" | "core";
export type LibraryExercise = { id: string; name: string; focus: string; equipment: string; tempo: string; sets: string; variant: ExerciseVariant; level: "Foundation" | "Build" | "Peak"; coaching: { setup: string; cue: string; tip: string } };

export const achievements: Achievement[] = [
  // --- PART 1: DAILY TASK ACHIEVEMENTS (Small Daily Triumphs) ---
  {
    id: "daily-workout",
    title: "Daily Workout Commit",
    description: "Complete and log any resistance training or conditioning workout today.",
    category: "daily",
    kind: "explorer",
    progress: 0,
    target: 1,
    reward: "Daily Check",
    unlocked: false,
  },
  {
    id: "daily-weight",
    title: "Morning Weight Checkpoint",
    description: "Record your morning body weight in the biometric ledger.",
    category: "daily",
    kind: "record",
    progress: 0,
    target: 1,
    reward: "Fasted Pin",
    unlocked: false,
  },
  {
    id: "daily-nutrition",
    title: "Precision Fuel Target",
    description: "Log your daily meals (Breakfast, Lunch, Dinner) to meet your macro target.",
    category: "daily",
    kind: "fuel",
    progress: 0,
    target: 3,
    reward: "Macro Shield",
    unlocked: false,
  },
  {
    id: "daily-gps",
    title: "1 km Movement Trace",
    description: "Track an outdoor walk, run, or GPS cardio route of at least 1.0 km.",
    category: "daily",
    kind: "distance",
    progress: 0,
    target: 1.0,
    reward: "Pathfinder Badge",
    unlocked: false,
  },
  {
    id: "daily-cues",
    title: "Coaching Cue Review",
    description: "Inspect form setup cues for 3 exercises in the exercise library.",
    category: "daily",
    kind: "explorer",
    progress: 0,
    target: 3,
    reward: "Form Crest",
    unlocked: false,
  },

  // --- PART 2: MONTHLY MILESTONES (Big Monthly Achievements) ---
  {
    id: "monthly-streak-20",
    title: "20-Day Signal Streak",
    description: "Achieve 20 active logged training days within a single calendar month.",
    category: "monthly",
    kind: "streak",
    progress: 0,
    target: 20,
    reward: "Golden Chain",
    unlocked: false,
  },
  {
    id: "monthly-volume-100k",
    title: "100K Tonnage Titan",
    description: "Accumulate 100,000 kg of cumulative resistance training volume this month.",
    category: "monthly",
    kind: "volume",
    progress: 0,
    target: 100000,
    reward: "Titan Crest",
    unlocked: false,
  },
  {
    id: "monthly-century-100km",
    title: "Century Runner (100 km)",
    description: "Cover 100 total kilometers of outdoor routes in the monthly ledger.",
    category: "monthly",
    kind: "distance",
    progress: 0,
    target: 100,
    reward: "Century Crown",
    unlocked: false,
  },
  {
    id: "monthly-pr-breaker",
    title: "Compound PR Breaker",
    description: "Set a new personal record on Bench Press, Squat, or Deadlift this month.",
    category: "monthly",
    kind: "record",
    progress: 0,
    target: 85,
    reward: "PR Onyx Trophy",
    unlocked: false,
  },
  {
    id: "monthly-full-spectrum",
    title: "Full Spectrum Master",
    description: "Log training sessions covering all 6 kinetic body regions (Chest, Back, Delts, Arms, Legs, Core).",
    category: "monthly",
    kind: "explorer",
    progress: 0,
    target: 6,
    reward: "Master Ring",
    unlocked: false,
  },
];

export const libraryExercises: LibraryExercise[] = [
  // Pectorals (Chest)
  { id: "bench-press", name: "Barbell Bench Press", focus: "Pectorals · Triceps", equipment: "Barbell", tempo: "3–1–1", sets: "4 × 6–8", variant: "bench", level: "Peak", coaching: { setup: "Pin the shoulder blades down and back before you unrack.", cue: "Drive the bar toward the mid chest, then press through the bench.", tip: "Keep both feet heavy. If wrists drift back, reduce the load." } },
  { id: "incline-db-press", name: "Incline Dumbbell Press", focus: "Pectorals · Anterior Deltoids", equipment: "Dumbbells", tempo: "2–1–1", sets: "3 × 8–10", variant: "bench", level: "Build", coaching: { setup: "Set bench angle to 30 degrees to bias the clavicular pectorals.", cue: "Press up and slightly inward without clacking the weights.", tip: "Keep the lower back glued with natural arch, elbows tucked at 45 degrees." } },
  { id: "cable-fly", name: "Cable Chest Fly", focus: "Pectorals", equipment: "Cable", tempo: "2–1–2", sets: "3 × 12–15", variant: "fly", level: "Foundation", coaching: { setup: "Stagger the stance and set handles at chest height.", cue: "Bring the biceps toward each other, squeezing the chest at peak contraction.", tip: "Keep a soft elbow bend; avoid turning into a press." } },
  { id: "chest-dips", name: "Weighted Chest Dips", focus: "Pectorals · Triceps", equipment: "Dip Station", tempo: "3–1–1", sets: "3 × 6–10", variant: "bench", level: "Peak", coaching: { setup: "Lean torso forward 20 degrees with elbows flared slightly.", cue: "Lower until upper arms are parallel to floor, then press through palms.", tip: "Control the descent; do not bounce out of the bottom." } },

  // Quadriceps & Lower Body
  { id: "barbell-back-squat", name: "Barbell Back Squat", focus: "Quadriceps · Glutes", equipment: "Barbell", tempo: "3–1–1", sets: "4 × 5–8", variant: "squat", level: "Peak", coaching: { setup: "Create tight upper back shelf, feet shoulder-width, toes turned 15°.", cue: "Break at hips and knees together, driving knees in line with toes.", tip: "Brace abdominal wall tightly before every rep." } },
  { id: "front-squat", name: "Front Squat", focus: "Quadriceps · Core", equipment: "Barbell", tempo: "3–0–1", sets: "4 × 5–7", variant: "squat", level: "Build", coaching: { setup: "Set elbows high and create a stable three-point foot.", cue: "Let the knees travel forward as the torso stays upright through the hole.", tip: "Use a heel wedge if ankle mobility limits depth." } },
  { id: "leg-press", name: "45° Incline Leg Press", focus: "Quadriceps · Glutes", equipment: "Machine", tempo: "3–1–2", sets: "3 × 10–12", variant: "squat", level: "Foundation", coaching: { setup: "Place feet mid-platform shoulder-width apart.", cue: "Lower sled under full control until knees reach 90 degrees.", tip: "Never lock out knees fully at the top to preserve joint tension." } },
  { id: "bulgarian-split-squat", name: "Bulgarian Split Squat", focus: "Quadriceps · Glutes", equipment: "Dumbbells", tempo: "2–1–1", sets: "3 × 8–10", variant: "squat", level: "Build", coaching: { setup: "Rest rear foot on bench laces-down, front foot 3 feet forward.", cue: "Drop hips straight down, keeping front knee tracking over middle toe.", tip: "Keep 80% of weight through the front heel and midfoot." } },

  // Lats & Back
  { id: "lat-pulldown", name: "Lat Pulldown", focus: "Lats · Biceps", equipment: "Cable", tempo: "2–1–2", sets: "4 × 8–12", variant: "row", level: "Foundation", coaching: { setup: "Grip slightly wider than shoulder width with slight torso lean.", cue: "Drive elbows down and back toward your hip pockets.", tip: "Resist the upward stretch for a full 2 seconds." } },
  { id: "chest-row", name: "Chest Supported Row", focus: "Lats · Rhomboids", equipment: "Machine", tempo: "2–1–2", sets: "3 × 8–10", variant: "row", level: "Build", coaching: { setup: "Set the bench so the chest stays firmly connected throughout.", cue: "Pull elbows toward your back pockets, then pause without shrugging.", tip: "Keep the neck long; do not chase range by lifting the chest." } },
  { id: "barbell-row", name: "Bent-Over Barbell Row", focus: "Lats · Upper Back", equipment: "Barbell", tempo: "2–1–1", sets: "4 × 6–8", variant: "row", level: "Peak", coaching: { setup: "Hinge hips back at 45 degrees with spine braced rigid.", cue: "Pull bar towards lower ribcage, squeezing shoulder blades at top.", tip: "Avoid using momentum from the legs." } },
  { id: "pull-ups", name: "Wide Grip Pull-Ups", focus: "Lats · Teres Major", equipment: "Bodyweight / Bar", tempo: "2–1–2", sets: "3 × 6–10", variant: "row", level: "Peak", coaching: { setup: "Full dead-hang grip with active depression of scaps.", cue: "Drive chest toward the bar, leading with the elbows.", tip: "Control the eccentric lowering all the way to complete extension." } },

  // Deltoids (Shoulders)
  { id: "overhead-press", name: "Standing Overhead Press", focus: "Deltoids · Triceps", equipment: "Barbell", tempo: "2–1–1", sets: "4 × 5–7", variant: "press", level: "Peak", coaching: { setup: "Grip bar just outside shoulders, squeeze glutes and quads.", cue: "Press straight up, tucking chin back then moving head through at lockout.", tip: "Keep ribs locked down; avoid hyperextending lumbar spine." } },
  { id: "seated-press", name: "Seated Dumbbell Shoulder Press", focus: "Deltoids · Triceps", equipment: "Dumbbells", tempo: "2–0–2", sets: "3 × 8–10", variant: "press", level: "Build", coaching: { setup: "Set bench upright and brace ribs down before the first press.", cue: "Press up in an arc so dumbbells finish over crown of head.", tip: "Use a neutral grip if anterior shoulder comfort is limited." } },
  { id: "lateral-raise", name: "Dumbbell Lateral Raise", focus: "Deltoids · Lateral Head", equipment: "Dumbbells", tempo: "2–1–2", sets: "4 × 12–15", variant: "raise", level: "Foundation", coaching: { setup: "Lean slightly forward with dumbbells in front of thighs.", cue: "Raise arms out to sides in scapular plane (30° forward).", tip: "Lead with elbows, keeping hands lower than elbows at top." } },
  { id: "face-pull", name: "Cable Face Pull", focus: "Deltoids · Rear Delts · Traps", equipment: "Cable", tempo: "2–2–1", sets: "3 × 15–20", variant: "row", level: "Foundation", coaching: { setup: "Attach rope to high pulley, thumbs pointing backward.", cue: "Pull rope towards bridge of nose while externally rotating shoulders.", tip: "Hold 2 second squeeze at the back of every rep." } },

  // Arms (Biceps & Triceps)
  { id: "incline-curl", name: "Incline Dumbbell Curl", focus: "Biceps · Forearms", equipment: "Dumbbells", tempo: "2–1–2", sets: "3 × 10–12", variant: "curl", level: "Foundation", coaching: { setup: "Lock upper arms slightly behind torso on incline pad.", cue: "Turn palm as dumbbell rises; squeeze peak contraction.", tip: "Stop one rep before form turns into a shoulder swing." } },
  { id: "barbell-preacher-curl", name: "EZ-Bar Preacher Curl", focus: "Biceps · Brachialis", equipment: "EZ-Bar", tempo: "3–1–1", sets: "3 × 8–10", variant: "curl", level: "Build", coaching: { setup: "Anchor armpits over preacher bench with chest firmly braced.", cue: "Curl bar up until forearms are vertical, maintaining tension.", tip: "Avoid hyperextending elbows at the bottom of the bench." } },
  { id: "hammer-curl", name: "Cross-Body Hammer Curl", focus: "Biceps · Brachioradialis", equipment: "Dumbbells", tempo: "2–1–1", sets: "3 × 10–12", variant: "curl", level: "Foundation", coaching: { setup: "Hold dumbbells with neutral (palms facing) grip.", cue: "Curl dumbbell up toward opposite pec, squeezing forearm.", tip: "Keep torso still; avoid rocking back." } },
  { id: "tricep-pushdown", name: "Rope Tricep Pushdown", focus: "Triceps", equipment: "Cable", tempo: "2–1–2", sets: "4 × 12–15", variant: "pushdown", level: "Foundation", coaching: { setup: "Pin elbows at ribcage with slight forward torso lean.", cue: "Extend elbows fully and spread the rope ends apart at bottom.", tip: "Keep upper arms stationary throughout the entire stroke." } },
  { id: "skull-crushers", name: "Lying EZ-Bar Skull Crushers", focus: "Triceps · Long Head", equipment: "EZ-Bar", tempo: "3–1–1", sets: "3 × 8–10", variant: "pushdown", level: "Build", coaching: { setup: "Lie on flat bench with arms angled slightly backward at 10°.", cue: "Bend elbows to lower bar towards crown of head, then extend.", tip: "Keep elbows tucked in; don't allow them to flare out wide." } },

  // Hamstrings & Posterior Chain
  { id: "romanian-deadlift", name: "Romanian Deadlift (RDL)", focus: "Hamstrings · Glutes", equipment: "Barbell", tempo: "3–1–1", sets: "4 × 6–8", variant: "deadlift", level: "Peak", coaching: { setup: "Stand tall with bar against thighs, slight knee unlock.", cue: "Push hips backward as if touching a wall behind you.", tip: "Lower bar until maximum hamstring stretch is felt, keeping back flat." } },
  { id: "lying-leg-curl", name: "Lying Leg Curl", focus: "Hamstrings", equipment: "Machine", tempo: "3–1–2", sets: "3 × 10–12", variant: "curl", level: "Foundation", coaching: { setup: "Align knee joint with machine axis of rotation.", cue: "Curl pad toward glutes, flexing feet towards shins.", tip: "Keep hips pressed down into pad; do not arch lower back." } },

  // Core & Abs
  { id: "hanging-leg-raise", name: "Hanging Leg Raise", focus: "Core · Lower Abs", equipment: "Pull-Up Bar", tempo: "2–1–2", sets: "3 × 10–15", variant: "core", level: "Build", coaching: { setup: "Hang from bar with active shoulders and engaged lats.", cue: "Roll pelvis upward, raising legs until parallel to floor.", tip: "Avoid swinging; use abdominal control throughout the arc." } },
  { id: "cable-woodchopper", name: "Cable Woodchopper", focus: "Core · Obliques", equipment: "Cable", tempo: "2–1–2", sets: "3 × 12–15", variant: "core", level: "Foundation", coaching: { setup: "Set pulley at chest height, arms extended in front.", cue: "Rotate torso through the core, driving from the hips.", tip: "Pivot rear foot and keep arms relatively straight." } },
  { id: "ab-wheel-rollout", name: "Ab Wheel Rollout", focus: "Core · Rectus Abdominis", equipment: "Ab Wheel", tempo: "3–1–1", sets: "3 × 8–12", variant: "core", level: "Peak", coaching: { setup: "Kneel on mat with wheel directly beneath shoulders.", cue: "Roll forward extending hips and arms, maintaining slight pelvic posterior tilt.", tip: "Do not let lower back collapse or sag." } },
];

import { getScopedKey } from "@/lib/user-store";

export const achievementStorageKey = (id: string) => getScopedKey(`fittrack-achievement-${id}`);
