import { ArrowRight, Utensils } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { getAthleteProfile, getScopedKey, getCalibrationSettings } from "@/lib/user-store";

// =============================================================================
// 1. WORKOUT RECOMMENDATION CARD
// =============================================================================

interface ExerciseItem {
  id: string;
  name: string;
  sets: string;
  rpe: string;
}

const defaultExercises: ExerciseItem[] = [
  { id: "01", name: "Back Squat", sets: "4-6", rpe: "RPE 7" },
  { id: "02", name: "Romanian Deadlift", sets: "4-8", rpe: "RPE 7" },
  { id: "03", name: "Bulgarian Split Squat", sets: "3-10", rpe: "RPE 7" },
];

export function WorkoutRecommendationCard() {
  const [, setLocation] = useLocation();

  return (
    <div className="editorial-card">
      <div className="card-topline">
        <span className="card-label">WORKOUT RECOMMENDATION</span>
      </div>

      <h3 className="card-heading">Lower Body Foundation</h3>

      <div className="exercise-table">
        {defaultExercises.map((ex) => (
          <div key={ex.id} className="exercise-table-row">
            <span className="exercise-num">{ex.id}</span>
            <span className="exercise-name">{ex.name}</span>
            <span className="exercise-sets">{ex.sets}</span>
            <span className="exercise-rpe">{ex.rpe}</span>
          </div>
        ))}
      </div>

      <button
        className="card-footer-link"
        onClick={() => setLocation("/exercise-library")}
      >
        <span>View full workout</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

// =============================================================================
// 2. NUTRITION LEDGER CARD
// =============================================================================

interface NutritionTarget {
  energy: { current: number; target: number; unit: string };
  protein: { current: number; target: number; unit: string };
  carbs: { current: number; target: number; unit: string };
  fats: { current: number; target: number; unit: string };
}

export function NutritionLedgerCard() {
  const [, setLocation] = useLocation();
  // Targets come from the athlete's onboarding calibration so the dashboard,
  // Log Food, and the onboarding plan all agree on the same numbers.
  const calibration = getCalibrationSettings();
  const [data, setData] = useState<NutritionTarget>({
    energy: { current: 0, target: calibration.goalKcal, unit: "kcal" },
    protein: { current: 0, target: calibration.goalProtein, unit: "g" },
    carbs: { current: 0, target: calibration.goalCarbs, unit: "g" },
    fats: { current: 0, target: calibration.goalFat, unit: "g" },
  });

  useEffect(() => {
    try {
      const cal = getCalibrationSettings();
      const todayKey = new Date().toISOString().split("T")[0];
      const scopedToday = localStorage.getItem(getScopedKey("fittrack_logged_nutrition_today"));
      const legacyToday = localStorage.getItem("fittrack_logged_nutrition_today");
      const rawLogs = localStorage.getItem(getScopedKey("fittrack_nutrition_logs")) || localStorage.getItem("fittrack_nutrition_logs");

      let currentCals = 0;
      let currentProtein = 0;
      let currentCarbs = 0;
      let currentFats = 0;

      if (scopedToday || legacyToday) {
        const parsed = JSON.parse(scopedToday || legacyToday || "{}");
        currentCals = parsed.calories || 0;
        currentProtein = parsed.protein || 0;
        currentCarbs = parsed.carbs || 0;
        currentFats = parsed.fats || 0;
      } else if (rawLogs) {
        const list = JSON.parse(rawLogs);
        if (Array.isArray(list)) {
          const todayMeals = list.filter((m: any) => m.date === todayKey || m.consumedAt?.startsWith(todayKey));
          todayMeals.forEach((m: any) => {
            currentCals += Number(m.calories || 0);
            currentProtein += Number(m.protein || 0);
            currentCarbs += Number(m.carbs || 0);
            currentFats += Number(m.fats || 0);
          });
        }
      }

      setData({
        energy: { current: Math.round(currentCals), target: cal.goalKcal, unit: "kcal" },
        protein: { current: Math.round(currentProtein), target: cal.goalProtein, unit: "g" },
        carbs: { current: Math.round(currentCarbs), target: cal.goalCarbs, unit: "g" },
        fats: { current: Math.round(currentFats), target: cal.goalFat, unit: "g" },
      });
    } catch {
      // fallback
    }
  }, []);

  const items = [
    { label: "Energy", ...data.energy },
    { label: "Protein", ...data.protein },
    { label: "Carbs", ...data.carbs },
    { label: "Fats", ...data.fats },
  ];

  return (
    <div className="editorial-card">
      <div className="card-topline flex items-center justify-between">
        <span className="card-label">NUTRITION LEDGER</span>
        <Utensils size={14} className="text-muted-foreground opacity-60" />
      </div>

      <div className="nutrition-ledger-rows">
        {items.map((item) => {
          const pct = Math.min(100, Math.round((item.current / item.target) * 100));
          return (
            <div key={item.label} className="nutrition-ledger-item">
              <div className="nutrition-item-meta">
                <span className="nutrition-label">{item.label}</span>
                <span className="nutrition-values">
                  {item.current.toLocaleString()} / {item.target.toLocaleString()} {item.unit}
                  <span className="nutrition-pct">{pct}%</span>
                </span>
              </div>
              <div className="nutrition-track">
                <div className="nutrition-bar" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <button
        className="card-footer-link"
        onClick={() => setLocation("/log-food")}
      >
        <span>View nutrition details</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

// =============================================================================
// 3. TRAINING RHYTHM CARD
// =============================================================================

interface DayStatus {
  dayName: string;
  isToday: boolean;
  isCompleted: boolean;
  isPast: boolean;
}

export function TrainingRhythmCard() {
  const [, setLocation] = useLocation();
  const profile = getAthleteProfile();
  const [days, setDays] = useState<DayStatus[]>([]);
  const [latestWeight, setLatestWeight] = useState<number>(70);
  const [gpsCount, setGpsCount] = useState<number>(0);

  useEffect(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

    let workoutDates = new Set<string>();
    try {
      const rawLogs =
        localStorage.getItem(getScopedKey("fittrack_workout_logs")) ||
        localStorage.getItem("fittrack_workout_logs") ||
        localStorage.getItem("fittrack_workout_history");
      if (rawLogs) {
        const parsed = JSON.parse(rawLogs);
        if (Array.isArray(parsed)) {
          parsed.forEach((w: any) => {
            const d = w.completedAt || w.date || w.startedAt;
            if (d) workoutDates.add(new Date(d).toDateString());
          });
        }
      }
    } catch {}

    const list: DayStatus[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const isToday = d.toDateString() === now.toDateString();
      const isPast = d < now && !isToday;
      const isCompleted = workoutDates.has(d.toDateString());

      list.push({
        dayName: weekDays[i],
        isToday,
        isCompleted,
        isPast,
      });
    }
    setDays(list);

    try {
      const rawWeight = localStorage.getItem(getScopedKey("fittrack_weight_logs")) || localStorage.getItem("fittrack_weight_logs");
      if (rawWeight) {
        const parsed = JSON.parse(rawWeight);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const last = parsed[parsed.length - 1];
          if (last.weightKg) setLatestWeight(Number(last.weightKg));
        }
      }
    } catch {}

    try {
      const rawGps = localStorage.getItem(getScopedKey("fittrack_gps_sessions")) || localStorage.getItem("fittrack_gps_sessions");
      if (rawGps) {
        const parsed = JSON.parse(rawGps);
        if (Array.isArray(parsed)) setGpsCount(parsed.length);
      }
    } catch {}
  }, []);

  return (
    <div className="editorial-card">
      <div className="card-topline">
        <span className="card-label">TRAINING RHYTHM</span>
      </div>

      <div className="rhythm-week-grid">
        <div className="rhythm-days-header">
          {days.map((d, idx) => (
            <span key={idx} className={`day-label ${d.isToday ? "today-label" : ""}`}>
              {d.dayName}
            </span>
          ))}
        </div>

        <div className="rhythm-dots-row">
          {days.map((d, idx) => {
            let stateClass = "dot-upcoming";
            if (d.isCompleted) stateClass = "dot-completed";
            else if (d.isToday) stateClass = "dot-today";

            return (
              <div key={idx} className="rhythm-dot-wrapper">
                <div className={`rhythm-dot ${stateClass}`} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="rhythm-legend">
        <span><i className="legend-dot dot-completed" /> Completed</span>
        <span><i className="legend-dot dot-today" /> Today</span>
        <span><i className="legend-dot dot-upcoming" /> Upcoming</span>
      </div>

      <div className="rhythm-metrics-divider" />

      <div className="rhythm-metrics-row">
        <div className="rhythm-metric-item">
          <strong>{latestWeight} <small>kg</small></strong>
          <span>Latest weight</span>
        </div>
        <div className="rhythm-metric-item">
          <strong>{gpsCount}</strong>
          <span>GPS sessions</span>
        </div>
      </div>

      <button
        className="card-footer-link"
        onClick={() => setLocation("/log-weight")}
      >
        <span>View progress</span>
        <ArrowRight size={14} />
      </button>
    </div>
  );
}
