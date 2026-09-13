import { useEffect, useState, useMemo } from "react";
import { Activity, Dumbbell, Pause, Play, RotateCcw, Sparkles, Timer, Video, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { WorkflowLayout } from "@/components/workflows/WorkflowLayout";
import { ExerciseVideoModal } from "@/components/video/ExerciseVideoModal";
import { advanceStreak, getScopedKey } from "@/lib/user-store";
import { recordMuscleWorkout, getDynamicMuscleLibrary } from "@/lib/fitness-data";
import { playAlarmSound, playNotificationSound } from "@/lib/audio-cue";

const format = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

const sessionWorkouts = [
  { id: "bench-press", name: "Barbell Bench Press", sets: "4 Sets", reps: "6–8 Reps", load: "82.5 kg", focus: "Pectorals" },
  { id: "incline-db-press", name: "Incline Dumbbell Press", sets: "3 Sets", reps: "8–10 Reps", load: "30.0 kg", focus: "Upper Chest" },
  { id: "cable-fly", name: "Cable Chest Fly", sets: "3 Sets", reps: "12–15 Reps", load: "27.5 kg", focus: "Chest Squeeze" },
  { id: "overhead-press", name: "Standing Overhead Press", sets: "4 Sets", reps: "5–7 Reps", load: "50.0 kg", focus: "Deltoids" },
  { id: "lateral-raise", name: "Dumbbell Lateral Raise", sets: "4 Sets", reps: "12–15 Reps", load: "12.5 kg", focus: "Side Delts" },
  { id: "tricep-pushdown", name: "Rope Tricep Pushdown", sets: "4 Sets", reps: "12–15 Reps", load: "35.0 kg", focus: "Triceps" },
];

export default function StartSession() {
  const [, setLocation] = useLocation();
  const [running, setRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [mode, setMode] = useState("Strength");
  const [selectedVideo, setSelectedVideo] = useState<{ id: string; name: string; focus?: string } | null>(null);
  const [recoveryTick, setRecoveryTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRecoveryTick((t) => t + 1);
    window.addEventListener("fittrack:recovery-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("fittrack:recovery-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const readinessScore = useMemo(() => {
    const dynamicLib = getDynamicMuscleLibrary();
    const scores = Object.values(dynamicLib).map((m) => m.score);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }, [recoveryTick]);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [running]);

  const handleToggleRunning = () => {
    setRunning((prev) => {
      const next = !prev;
      if (next) {
        playAlarmSound("digital_beep");
      } else {
        playNotificationSound("alert");
      }
      return next;
    });
  };

  const end = () => {
    if (seconds === 0) {
      toast("Start a session first before archiving.");
      return;
    }
    playAlarmSound("boxing_gong");
    setRunning(false);
    advanceStreak();
    try {
      const sessions = JSON.parse(localStorage.getItem(getScopedKey("fittrack_sessions")) || "[]");
      sessions.unshift({ mode, durationSeconds: seconds, startedAt: new Date().toISOString() });
      localStorage.setItem(getScopedKey("fittrack_sessions"), JSON.stringify(sessions.slice(0, 50)));

      // Trigger recovery fatigue on targeted chains
      if (mode === "Strength") {
        recordMuscleWorkout("chest", 4, 2310);
        recordMuscleWorkout("shoulders", 4, 1360);
        recordMuscleWorkout("triceps", 3, 1080);
      } else if (mode === "Conditioning") {
        recordMuscleWorkout("quads", 4, 2160);
        recordMuscleWorkout("calves", 4, 800);
        recordMuscleWorkout("core", 4, 1500);
      }
    } catch {
      /* ignore */
    }
    toast.success(`${mode} session archived · ${format(seconds)}`);
    setSeconds(0);
    setLocation("/overview");
  };

  return (
    <>
      <WorkflowLayout
        kicker="Session / Live Protocol"
        title="Workout Session Table"
        detail="Run the live session clock while referencing video demonstrations for every movement on the gym floor."
      >
        <motion.section
          className="workflow-grid session-grid"
          variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
        >
          <div className="workflow-panel session-console">
            <span className="panel-label">Select training mode</span>
            <div className="mode-grid">
              {["Strength", "Conditioning", "Recovery"].map((item) => (
                <button
                  key={item}
                  className={mode === item ? "selected" : ""}
                  onClick={() => setMode(item)}
                >
                  <Activity size={17} />
                  {item}
                </button>
              ))}
            </div>

            <div className={running ? "session-clock running" : "session-clock"}>
              <Timer size={22} />
              <strong>{format(seconds)}</strong>
              <span>{mode} session</span>
              <i />
            </div>

            <div className="session-controls">
              <button onClick={() => setSeconds(0)} aria-label="Reset session">
                <RotateCcw size={17} />
              </button>
              <button className="session-primary" onClick={handleToggleRunning}>
                {running ? <Pause size={18} /> : <Play size={18} />}
                {running ? "Pause session" : "Launch session"}
              </button>
            </div>

            {/* LIVE WORKOUT SESSION EXERCISE TABLE WITH VIDEO BUTTONS */}
            <div className="mt-6 border-t border-[rgba(237,244,233,0.08)] pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="panel-label flex items-center gap-1.5 text-[#c9ad7e]">
                  <Zap size={13} /> Active Session Workout Table
                </span>
                <span className="text-[10px] font-mono text-[#8b9c8a]">
                  {sessionWorkouts.length} Movements Programmed
                </span>
              </div>

              <div className="space-y-2">
                {sessionWorkouts.map((workout, idx) => (
                  <div
                    key={workout.id}
                    className="bg-[#1c140c] border border-[rgba(237,244,233,0.09)] hover:border-[#c9ad7e]/40 rounded-lg p-3 flex items-center justify-between gap-3 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#c9ad7e] text-xs font-bold w-5">
                        0{idx + 1}
                      </span>
                      <div>
                        <b className="text-[#edf4e9] text-sm block">{workout.name}</b>
                        <span className="text-[10px] font-mono text-[#8b9c8a]">
                          {workout.sets} · {workout.reps} · {workout.load}
                        </span>
                      </div>
                    </div>

                    {/* Prominent Glowing Video Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedVideo(workout)}
                      className="px-3 py-1.5 bg-[#c9ad7e]/15 hover:bg-[#c9ad7e] border border-[#c9ad7e] text-[#c9ad7e] hover:text-[#ece1cc] rounded font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_10px_rgba(231,208,166,0.25)] hover:shadow-[0_0_15px_rgba(231,208,166,0.6)] cursor-pointer transition-all active:scale-95"
                    >
                      <Play size={11} fill="currentColor" /> Play Video
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="workflow-panel session-readiness">
            <span className="panel-label">Pre-session readout</span>
            <div className="readiness-number">
              <b>{readinessScore}</b>
              <span>
                /100
                <br />
                {readinessScore >= 80 ? "ready" : "fatigue"}
              </span>
            </div>
            <div className="signal-row">
              <i style={{ background: readinessScore >= 80 ? "#22c55e" : readinessScore >= 65 ? "#f59e0b" : "#ef4444" }} />
              {readinessScore >= 80 ? "Musculoskeletal chains primed" : "Residual fatigue in active chains"}
            </div>
            <div className="signal-row">
              <i />
              Fuel reserve sufficient
            </div>
            <div className="signal-row soft">
              <i />
              Hydration stable
            </div>
            <button className="commit-button subdued" onClick={end}>
              End and archive <span>↗</span>
            </button>
          </aside>
        </motion.section>
      </WorkflowLayout>

      {/* Video Demonstration Modal */}
      <ExerciseVideoModal
        exercise={selectedVideo}
        open={Boolean(selectedVideo)}
        onClose={() => setSelectedVideo(null)}
      />
    </>
  );
}
