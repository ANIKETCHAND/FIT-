/* FitTrack: Animated post-sign-in onboarding questionnaire.
   Collects age (via DOB), sex, height, weight, activity and goal, computes
   Mifflin-St Jeor BMR/TDEE + goal-adjusted macro targets, and saves them to the
   same calibration store the rest of the app reads. */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Moon,
  Ruler,
  Sparkles,
  Sun,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import {
  getActiveUserEmail,
  getAthleteProfile,
  saveAthleteProfile,
  getCalibrationSettings,
  saveCalibrationSettings,
  markProfileConfigured,
  getScopedKey,
  type CalibrationSettings,
} from "@/lib/user-store";
import "./Onboarding.css";

type Sex = "male" | "female";
type ActivityLevel = "light" | "moderate" | "active" | "very_active";
type Goal = "build_muscle" | "lose_weight" | "gain_weight" | "maintain" | "endurance";

const ACTIVITY_OPTIONS: { value: ActivityLevel; emoji: string; title: string; desc: string; mult: number }[] = [
  { value: "light", emoji: "🚶", title: "Lightly Active", desc: "Desk job, light walks", mult: 1.375 },
  { value: "moderate", emoji: "🏋️", title: "Moderately Active", desc: "Train 3–4× per week", mult: 1.55 },
  { value: "active", emoji: "🔥", title: "Very Active", desc: "Train 5–6× per week", mult: 1.725 },
  { value: "very_active", emoji: "⚡", title: "Athlete", desc: "Intense daily training", mult: 1.9 },
];

const GOAL_OPTIONS: { value: Goal; emoji: string; title: string; desc: string; label: string; adj: number }[] = [
  { value: "build_muscle", emoji: "💪", title: "Build Muscle", desc: "Lean mass & strength", label: "Muscle Building", adj: 250 },
  { value: "lose_weight", emoji: "🔥", title: "Lose Weight", desc: "Burn fat, stay lean", label: "Fat Loss", adj: -450 },
  { value: "gain_weight", emoji: "🍚", title: "Gain Weight", desc: "Healthy weight gain", label: "Weight Gain", adj: 450 },
  { value: "maintain", emoji: "⚖️", title: "Maintain", desc: "Hold your current form", label: "Maintenance", adj: 0 },
  { value: "endurance", emoji: "🏃", title: "Endurance", desc: "Stamina & cardio", label: "Endurance", adj: 100 },
];

const ageFromDob = (dob: string): number => {
  if (!dob) return 0;
  const b = new Date(dob);
  if (isNaN(b.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
};

const TOTAL_STEPS = 5;

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { theme, toggleTheme } = useTheme();
  const baseProfile = useMemo(() => getAthleteProfile(), []);
  const baseCalibration = useMemo(() => getCalibrationSettings(), []);

  // Resume a half-finished questionnaire after a refresh (scoped per athlete).
  const draftKey = getScopedKey("fittrack_onboarding_draft");
  const savedDraft = useMemo<Record<string, any> | null>(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [step, setStep] = useState<number>(savedDraft?.step ?? 0);
  const [dir, setDir] = useState(1);
  const [name, setName] = useState<string>(
    savedDraft?.name ?? (baseProfile.name && baseProfile.name !== "Athlete" ? baseProfile.name : ""),
  );
  const [sex, setSex] = useState<Sex>(savedDraft?.sex ?? baseCalibration.sex ?? "male");
  const [dob, setDob] = useState<string>(savedDraft?.dob ?? "");
  const [heightCm, setHeightCm] = useState<string>(savedDraft?.heightCm ?? String(baseCalibration.heightCm || 175));
  const [weightKg, setWeightKg] = useState<string>(savedDraft?.weightKg ?? String(baseCalibration.weightKg || 70));
  const [activity, setActivity] = useState<ActivityLevel | "">(savedDraft?.activity ?? "");
  const [goal, setGoal] = useState<Goal | "">(savedDraft?.goal ?? "");

  // Persist progress on every change so a refresh mid-flow doesn't lose it.
  useEffect(() => {
    try {
      localStorage.setItem(
        draftKey,
        JSON.stringify({ step, name, sex, dob, heightCm, weightKg, activity, goal }),
      );
    } catch {}
  }, [draftKey, step, name, sex, dob, heightCm, weightKg, activity, goal]);

  const age = ageFromDob(dob);
  const h = Number(heightCm);
  const w = Number(weightKg);

  const stepValid = (): boolean => {
    switch (step) {
      case 0:
        return name.trim().length >= 2;
      case 1:
        return !!dob && age >= 10 && age <= 100;
      case 2:
        return h >= 100 && h <= 250 && w >= 30 && w <= 300;
      case 3:
        return !!activity;
      case 4:
        return !!goal;
      default:
        return true;
    }
  };

  const computeTargets = () => {
    const mult = ACTIVITY_OPTIONS.find((a) => a.value === activity)?.mult ?? 1.55;
    const goalMeta = GOAL_OPTIONS.find((g) => g.value === goal);
    const adj = goalMeta?.adj ?? 0;
    const bmr = sex === "male" ? 10 * w + 6.25 * h - 5 * age + 5 : 10 * w + 6.25 * h - 5 * age - 161;
    const tdee = bmr * mult;
    const goalKcal = Math.max(1200, Math.round((tdee + adj) / 10) * 10);
    const proteinPerKg = goal === "build_muscle" || goal === "lose_weight" ? 2.0 : 1.8;
    const goalProtein = Math.round(w * proteinPerKg);
    const goalFat = Math.round((goalKcal * 0.25) / 9);
    const goalCarbs = Math.max(0, Math.round((goalKcal - goalProtein * 4 - goalFat * 9) / 4));
    return { goalKcal, goalProtein, goalCarbs, goalFat, label: goalMeta?.label ?? "General Fitness" };
  };

  const targets = step >= 4 && goal ? computeTargets() : null;

  const goNext = () => {
    if (!stepValid()) return;
    if (step < TOTAL_STEPS - 1) {
      setDir(1);
      setStep((s) => s + 1);
    } else {
      finish();
    }
  };

  const goBack = () => {
    if (step === 0) {
      setLocation("/");
      return;
    }
    setDir(-1);
    setStep((s) => s - 1);
  };

  const finish = () => {
    const { goalKcal, goalProtein, goalCarbs, goalFat, label } = computeTargets();
    const settings: CalibrationSettings = {
      name: name.trim() || "Athlete",
      age: age || 26,
      heightCm: h,
      weightKg: w,
      sex,
      activityLevel: (activity || "moderate") as ActivityLevel,
      goalKcal,
      goalProtein,
      goalCarbs,
      goalFat,
    };
    saveCalibrationSettings(settings);
    saveAthleteProfile({ ...baseProfile, name: name.trim() || baseProfile.name, focus: label });
    markProfileConfigured(getActiveUserEmail());
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    toast.success(`You're all set, ${(name.trim() || "Athlete").split(" ")[0]}! Your plan is ready.`);
    setLocation("/overview");
  };

  const stepMeta = [
    { icon: Sparkles, title: `Welcome to FitTrack`, sub: "Let's build your personal plan in a few quick steps. First, what should we call you?" },
    { icon: Calendar, title: "A bit about you", sub: "We use this to calculate your energy and protein needs accurately." },
    { icon: Ruler, title: "Your measurements", sub: "Height and weight power your BMR and macro targets." },
    { icon: Activity, title: "How active are you?", sub: "Pick the option that best matches a typical week." },
    { icon: Target, title: "What's your main goal?", sub: "We'll tune your daily calories and protein to match." },
  ][step];

  const StepIcon = stepMeta.icon;

  return (
    <div className="onboarding-shell">
      <header className="onboarding-topbar">
        <div className="onboarding-brand">
          <span className="ob-logo"><Activity size={17} /></span>
          FIT<span>TRACK</span>
        </div>
        <button
          type="button"
          className="ob-theme-toggle"
          onClick={() => toggleTheme?.()}
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          <span>{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </header>

      <main className="onboarding-main">
        <div className="onboarding-card">
          {/* Progress */}
          <div className="ob-progress">
            <div className="ob-progress-track">
              <div className="ob-progress-fill" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
            </div>
            <span className="ob-progress-label">Step {step + 1} / {TOTAL_STEPS}</span>
          </div>

          <div className="ob-step-icon"><StepIcon size={26} /></div>
          <h1 className="ob-step-title">{stepMeta.title}</h1>
          <p className="ob-step-sub">{stepMeta.sub}</p>

          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={{ opacity: 0, x: dir * 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -40 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
              {step === 0 && (
                <div className="ob-field">
                  <label htmlFor="ob-name">Your name</label>
                  <input
                    id="ob-name"
                    type="text"
                    value={name}
                    autoFocus
                    placeholder="e.g. Prajwal"
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goNext()}
                  />
                </div>
              )}

              {step === 1 && (
                <>
                  <div className="ob-choices two" style={{ marginBottom: 16 }}>
                    {(["male", "female"] as Sex[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`ob-choice ${sex === s ? "selected" : ""}`}
                        onClick={() => setSex(s)}
                      >
                        <span className="ob-choice-emoji">{s === "male" ? "♂️" : "♀️"}</span>
                        <span className="ob-choice-text"><strong>{s === "male" ? "Male" : "Female"}</strong></span>
                        <Check size={18} className="ob-choice-check" />
                      </button>
                    ))}
                  </div>
                  <div className="ob-field">
                    <label htmlFor="ob-dob">Date of birth</label>
                    <input id="ob-dob" type="date" value={dob} max={new Date().toISOString().split("T")[0]} onChange={(e) => setDob(e.target.value)} />
                    {dob && age > 0 && <small style={{ color: "var(--muted)", fontSize: 12 }}>You are {age} years old.</small>}
                  </div>
                </>
              )}

              {step === 2 && (
                <div className="ob-field-row">
                  <div className="ob-field">
                    <label htmlFor="ob-height">Height (cm)</label>
                    <input id="ob-height" type="number" inputMode="numeric" value={heightCm} min={100} max={250} onChange={(e) => setHeightCm(e.target.value)} />
                  </div>
                  <div className="ob-field">
                    <label htmlFor="ob-weight">Weight (kg)</label>
                    <input id="ob-weight" type="number" inputMode="numeric" value={weightKg} min={30} max={300} onChange={(e) => setWeightKg(e.target.value)} />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="ob-choices">
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`ob-choice ${activity === opt.value ? "selected" : ""}`}
                      onClick={() => setActivity(opt.value)}
                    >
                      <span className="ob-choice-emoji">{opt.emoji}</span>
                      <span className="ob-choice-text"><strong>{opt.title}</strong><small>{opt.desc}</small></span>
                      <Check size={18} className="ob-choice-check" />
                    </button>
                  ))}
                </div>
              )}

              {step === 4 && (
                <>
                  <div className="ob-choices">
                    {GOAL_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`ob-choice ${goal === opt.value ? "selected" : ""}`}
                        onClick={() => setGoal(opt.value)}
                      >
                        <span className="ob-choice-emoji">{opt.emoji}</span>
                        <span className="ob-choice-text"><strong>{opt.title}</strong><small>{opt.desc}</small></span>
                        <Check size={18} className="ob-choice-check" />
                      </button>
                    ))}
                  </div>

                  {targets && (
                    <motion.div className="ob-summary" style={{ marginTop: 20 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <div className="ob-summary-tile"><div className="val">{targets.goalKcal}</div><div className="lbl">kcal / day</div></div>
                      <div className="ob-summary-tile"><div className="val">{targets.goalProtein}g</div><div className="lbl">protein / day</div></div>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="ob-actions">
            <button type="button" className="ob-btn-back" onClick={goBack}>
              <ArrowLeft size={14} /> {step === 0 ? "Exit" : "Back"}
            </button>
            <button type="button" className="ob-btn-next" onClick={goNext} disabled={!stepValid()}>
              {step === TOTAL_STEPS - 1 ? "Finish & Launch" : "Continue"}
              {step === TOTAL_STEPS - 1 ? <Check size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
