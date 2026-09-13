import { useMemo, useState, useEffect } from "react";
import { Activity, Check, Dumbbell, LibraryBig, Minus, Play, Plus, TimerReset } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { WorkflowLayout } from "@/components/workflows/WorkflowLayout";
import { BackendFeedback } from "@/components/feedback/BackendFeedback";
import { BadgeUnlockOverlay, BadgeShareSheet } from "@/components/achievements/BadgeComponents";
import { StreakFireOverlay } from "@/components/streaks/StreakFireOverlay";
import { ExerciseVideoModal } from "@/components/video/ExerciseVideoModal";
import { achievementStorageKey, achievements, libraryExercises, type Achievement } from "@/lib/rewards-data";
import { advanceStreak, pushMilestoneNotification, getScopedKey, type DailyStreak } from "@/lib/user-store";
import { trpc } from "@/lib/trpc";
import {
  focusToMuscleId,
  recordLiveSetProgress,
  recordMuscleWorkout,
  getDynamicMuscleLibrary,
  type MuscleId,
} from "@/lib/fitness-data";
import { playNotificationSound, playAlarmSound } from "@/lib/audio-cue";

const defaultLifts = [
  { name: "Barbell bench press", prescription: "4 × 6–8", load: 82.5, rest: "02:30", focus: "Pectorals" },
  { name: "Incline Dumbbell Press", prescription: "3 × 10", load: 30, rest: "01:45", focus: "Pectorals" },
  { name: "Cable Fly", prescription: "3 × 12", load: 27.5, rest: "01:15", focus: "Pectorals" },
];

export default function LogWorkout() {
  const [, setLocation] = useLocation();
  const [staged] = useState(() => localStorage.getItem("fittrack-staged-exercise"));
  const [stagedMuscle] = useState<MuscleId | null>(() => {
    try {
      const sm = localStorage.getItem("fittrack-staged-muscle") as MuscleId | null;
      if (sm) return sm;
      if (staged) return focusToMuscleId(staged);
    } catch {}
    return null;
  });

  const lifts = useMemo(() => {
    if (stagedMuscle) {
      const dynamicLib = getDynamicMuscleLibrary();
      const m = dynamicLib[stagedMuscle];
      if (m && m.exercises && m.exercises.length > 0) {
        return m.exercises.map((ex) => ({
          name: ex.name,
          prescription: `${ex.sets} × ${ex.reps}`,
          load: parseFloat(ex.load.replace(/[^0-9.]/g, "")) || 40,
          rest: "02:00",
          focus: m.label,
        }));
      }
    }
    if (!staged) return defaultLifts;
    const found = libraryExercises.find((e) => e.name === staged);
    if (!found) return defaultLifts;
    const [setsStr = "3", repsStr = "8–10"] = found.sets.split("×").map((s) => s.trim());
    return [
      { name: found.name, prescription: `${setsStr} × ${repsStr}`, load: 60, rest: "02:00", focus: found.focus.split("·")[0].trim() },
      ...defaultLifts.slice(1).map((l) => ({ ...l, focus: found.focus.split("·")[0].trim() })),
    ];
  }, [staged, stagedMuscle]);

  const primaryFocus = lifts[0].focus;
  const targetMuscleId: MuscleId = stagedMuscle || focusToMuscleId(primaryFocus);

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

  const activeMuscleInfo = useMemo(() => {
    const dynamicLib = getDynamicMuscleLibrary();
    return dynamicLib[targetMuscleId] || dynamicLib.chest;
  }, [targetMuscleId, recoveryTick]);

  const [complete, setComplete] = useState<number[]>([]);
  const [load, setLoad] = useState(lifts[0].load);
  const [startTime] = useState(() => Date.now());
  const [videoExercise, setVideoExercise] = useState<{ name: string; focus?: string } | null>(null);
  const [celebrating, setCelebrating] = useState<Achievement | null>(null);
  const [sharing, setSharing] = useState<Achievement | null>(null);
  const [streakCelebrating, setStreakCelebrating] = useState<DailyStreak | null>(null);
  const [pendingAchievement, setPendingAchievement] = useState<Achievement | null>(null);

  const saveWorkout = trpc.workouts.create.useMutation({ onError: () => commitRewards(), onSuccess: () => commitRewards() });
  const toggle = (index: number) => {
    setComplete((previous) => {
      const isCompleting = !previous.includes(index);
      const next = isCompleting ? [...previous, index] : previous.filter((item) => item !== index);
      const currentVolume = next.reduce((total, idx) => total + (idx === 0 ? load * 28 : lifts[idx].load * (idx === 1 ? 30 : 36)), 0);
      recordLiveSetProgress(targetMuscleId, next.length, lifts.length, currentVolume);
      if (isCompleting) {
        playNotificationSound("chime");
        try {
          const info = getDynamicMuscleLibrary()[targetMuscleId];
          toast.success(`Set logged — ${info?.label || "muscle"} recovery now ${info?.score ?? ""}% (fatigued)`);
        } catch { /* ignore */ }
      }
      return next;
    });
  };
  const completion = Math.round((complete.length / lifts.length) * 100);
  const volume = complete.reduce((total, index) => total + (index === 0 ? load * 28 : lifts[index].load * (index === 1 ? 30 : 36)), 0);
  const finish = () => {
    try {
      localStorage.removeItem("fittrack-staged-exercise");
      localStorage.removeItem("fittrack-staged-muscle");
    } catch { /* ignore */ }
    setLocation("/overview");
  };
  const afterStreak = () => { if (pendingAchievement) { setCelebrating(pendingAchievement); setPendingAchievement(null); } else finish(); };

  const commitRewards = () => {
    playAlarmSound("kinetic_chime");
    const streakResult = advanceStreak();
    const benchBreaker = achievements.find((a) => a.id === "bench-breaker")!;
    const alreadyUnlocked = localStorage.getItem(achievementStorageKey(benchBreaker.id)) === "unlocked";
    const earnedPR = load >= 85 && !alreadyUnlocked;
    if (earnedPR) { localStorage.setItem(achievementStorageKey(benchBreaker.id), "unlocked"); pushMilestoneNotification("Bench Breaker unlocked", benchBreaker.description); setPendingAchievement({ ...benchBreaker, unlocked: true }); }
    if (streakResult.advanced) { pushMilestoneNotification(`${streakResult.streak.count} day streak secured`, "A completed daily training protocol extended your continuity signal."); setStreakCelebrating(streakResult.streak); }
    else if (earnedPR) setCelebrating({ ...benchBreaker, unlocked: true });
    else { toast(streakResult.alreadyRecorded ? "Training saved — today's daily streak is already secured" : `Training stimulus recorded — ${primaryFocus.toLowerCase()} readiness recalibrated`); finish(); }
  };

  const save = () => {
    if (complete.length !== lifts.length) { toast("Complete all movements before closing the training protocol"); return; }
    const elapsedSeconds = Math.max(900, Math.round((Date.now() - startTime) / 1000));
    try {
      const sessions = JSON.parse(localStorage.getItem(getScopedKey("fittrack_workout_logs")) || "[]");
      sessions.unshift({
        title: `${primaryFocus} protocol`,
        focus: primaryFocus,
        movementCount: lifts.length,
        volumeKg: Number(volume.toFixed(2)),
        durationSeconds: elapsedSeconds,
        completedAt: new Date().toISOString()
      });
      localStorage.setItem(getScopedKey("fittrack_workout_logs"), JSON.stringify(sessions.slice(0, 50)));

      // Finalize the completed workout in recovery engine
      recordMuscleWorkout(targetMuscleId, lifts.length, volume);
    } catch { /* ignore */ }
    saveWorkout.mutate({ title: `${primaryFocus} hypertrophy protocol`, focus: primaryFocus, movementCount: lifts.length, volumeKg: Number(volume.toFixed(2)), completedAt: new Date() });
  };

  return (
    <>
      <WorkflowLayout
        kicker="Training / Strength Telemetry"
        title="Record the work"
        detail="Capture load, effort, and recovery intervals before the signal fades. Complete the full protocol to advance your daily training streak."
      >
        <motion.section
          className="workflow-grid workout-grid"
          variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}
        >
          <div className="workflow-panel exercise-board">
            <div className="workout-head">
              <div>
                <span className="panel-label">{primaryFocus} / hypertrophy</span>
                <b className="workout-status">
                  <Activity size={12} className="text-[#c9ad7e] animate-pulse" />
                  Strength protocol
                </b>
              </div>
              <div className="workout-head-actions">
                <span className="protocol-tag">46 min protocol</span>
                <button className="library-link" onClick={() => setLocation("/exercise-library")}>
                  <LibraryBig size={14} />
                  Library
                </button>
              </div>
            </div>

            {staged && (
              <button className="staged-movement" onClick={() => setLocation("/exercise-library")}>
                <i />
                Staged movement: <b>{staged}</b>
                <span>Review ↗</span>
              </button>
            )}

            {/* Live ECG Heartbeat Pulse Bar */}
            <div className="bg-[#f0e6d3] border border-[rgba(237,244,233,0.08)] rounded-lg p-2.5 my-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c9ad7e] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#c9ad7e]"></span>
                </span>
                <span className="text-[10px] font-mono text-[#1c140c] uppercase tracking-wider">Live Work Output</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg className="w-24 h-5 text-[#c9ad7e]" viewBox="0 0 100 20" fill="none">
                  <motion.path
                    d="M0 10 L25 10 L32 2 L40 18 L48 6 L55 13 L62 10 L100 10"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  />
                </svg>
                <span className="text-[10px] font-mono text-[#c9ad7e]">138 BPM</span>
              </div>
            </div>

            <div className="set-ledger-label">
              <span>Set ledger</span>
              <span>Rest clock</span>
              <span>Load</span>
            </div>

            {lifts.map((lift, index) => (
              <motion.div
                key={lift.name}
                className={complete.includes(index) ? "lift-row complete" : "lift-row"}
                whileTap={{ scale: 0.99 }}
              >
                <button
                  className="set-toggle relative overflow-hidden"
                  aria-label={`Mark ${lift.name} complete`}
                  onClick={() => toggle(index)}
                >
                  {complete.includes(index) ? (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <Check size={16} className="text-[#ece1cc]" />
                    </motion.div>
                  ) : (
                    <span>0{index + 1}</span>
                  )}
                </button>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <b>{lift.name}</b>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoExercise({ name: lift.name, focus: lift.focus });
                      }}
                      className="workout-video-play-btn hover:scale-105 transition-transform"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 12px",
                        background: "linear-gradient(135deg, rgba(231, 208, 166, 0.25) 0%, rgba(231, 208, 166, 0.1) 100%)",
                        border: "1.5px solid #c9ad7e",
                        borderRadius: "4px",
                        color: "#c9ad7e",
                        fontSize: "11px",
                        fontFamily: "'Space Mono', monospace",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        cursor: "pointer",
                        boxShadow: "0 0 10px rgba(231, 208, 166, 0.35)",
                      }}
                      title={`Watch video demonstration for ${lift.name}`}
                    >
                      <Play size={11} fill="currentColor" /> Play Video Guide
                    </button>
                  </div>
                  <small>
                    {lift.prescription} · RPE 8 · rest {lift.rest}
                  </small>
                </div>
                <button
                  className="load-control"
                  aria-label={`Decrease ${lift.name} load`}
                  onClick={() => index === 0 && setLoad(Math.max(0, load - 2.5))}
                >
                  <Minus size={13} />
                </button>
                <strong>
                  {index === 0 ? load : lift.load}
                  <small>kg</small>
                </strong>
                <button
                  className="load-control"
                  aria-label={`Increase ${lift.name} load`}
                  onClick={() => index === 0 && setLoad(load + 2.5)}
                >
                  <Plus size={13} />
                </button>
              </motion.div>
            ))}

            <button className="text-action" onClick={() => setLocation("/exercise-library")}>
              <Plus size={15} />
              Browse exercise library
            </button>
          </div>

          <aside className="workflow-panel training-readout">
            <div className="focus-anatomy">
              <div className="focus-anatomy-head">
                <span className="panel-label">Focus region</span>
                <span
                  className="font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: activeMuscleInfo.accent }}
                >
                  {activeMuscleInfo.intensity}
                </span>
              </div>
              <div className="pectoral-scan">
                <i className="pectoral-left" />
                <i className="pectoral-right" />
                <b>
                  {activeMuscleInfo.label.toUpperCase()}
                  <br />
                  <span className="text-[10px] font-mono opacity-80 font-normal">
                    {activeMuscleInfo.anatomicalName}
                  </span>
                </b>
                <span className="scan-beam" />
              </div>
              <div className="focus-meta">
                <span>
                  <i style={{ background: activeMuscleInfo.accent }} />
                  Readiness {activeMuscleInfo.score}%
                </span>
                <span>{activeMuscleInfo.weeklyVolume} volume</span>
              </div>
            </div>

            {/* Circular Protocol Completion Dial */}
            <div className="bg-[#f0e6d3] border border-[rgba(237,244,233,0.08)] rounded-xl p-4 flex items-center gap-4 my-2">
              <div className="relative w-16 h-16 flex-shrink-0 flex items-center justify-center">
                <svg className="w-16 h-16 -rotate-90 transform" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="24" className="stroke-[rgba(255,255,255,0.08)] fill-none" strokeWidth="5" />
                  <motion.circle
                    cx="30"
                    cy="30"
                    r="24"
                    className="stroke-[#c9ad7e] fill-none"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 24}
                    initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                    animate={{ strokeDashoffset: (2 * Math.PI * 24) - ((completion / 100) * (2 * Math.PI * 24)) }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ filter: "drop-shadow(0 0 6px rgba(231,208,166,0.6))" }}
                  />
                </svg>
                <span className="absolute text-xs font-bold font-mono text-[#1c140c]">{completion}%</span>
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider text-[#6b5a44] font-mono block">Progress</span>
                <strong className="text-xs text-[#1c140c] font-mono block">
                  {complete.length} of {lifts.length} sets completed
                </strong>
                <span className="text-[10px] text-[#c9ad7e] font-mono">
                  {completion === 100 ? "Ready to commit protocol" : "Sets remaining"}
                </span>
              </div>
            </div>

            <div className="readout-line">
              <span>Estimated volume</span>
              <b>{Math.round(volume).toLocaleString()} kg</b>
            </div>
            <div className="readout-line">
              <span>Focus signal</span>
              <b className="lime">{primaryFocus}</b>
            </div>

            <button className="commit-button" disabled={saveWorkout.isPending} onClick={save}>
              <TimerReset size={16} />
              {saveWorkout.isPending ? "Saving protocol" : "Save training"} <span>↗</span>
            </button>
            {saveWorkout.isPending && (
              <BackendFeedback
                tone="loading"
                title="Secure training commit"
                detail="Writing this completed protocol to your athlete ledger."
              />
            )}
          </aside>
        </motion.section>
      </WorkflowLayout>
      {streakCelebrating && <StreakFireOverlay streak={streakCelebrating} onContinue={afterStreak} />}
      {celebrating && (
        <BadgeUnlockOverlay
          achievement={celebrating}
          onClose={finish}
          onShare={() => {
            setSharing(celebrating);
            setCelebrating(null);
          }}
        />
      )}
      {sharing && <BadgeShareSheet achievement={sharing} onClose={finish} />}
      <ExerciseVideoModal
        exercise={videoExercise}
        open={Boolean(videoExercise)}
        onClose={() => setVideoExercise(null)}
      />
    </>
  );
}
