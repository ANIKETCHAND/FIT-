import { useEffect, useMemo, useState } from "react";
import { Heart, Search, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { WorkflowLayout } from "@/components/workflows/WorkflowLayout";
import { ExerciseFlipCard } from "@/components/exercises/ExerciseFlipCard";
import { ExerciseVideoModal } from "@/components/video/ExerciseVideoModal";
import { libraryExercises, type LibraryExercise } from "@/lib/rewards-data";
import {
  getExercisePreferences,
  getExerciseProgress,
  saveExercisePreferences,
  saveExerciseProgress,
  type ExercisePreference,
  type ExerciseProgress,
  type ExerciseTarget,
} from "@/lib/user-store";

const muscleAliases: Record<string, string[]> = {
  Pectorals: ["pec", "chest", "bench", "press", "fly", "dip"],
  Lats: ["lat", "back", "pull", "row", "chin"],
  Deltoids: ["shoulder", "delt", "overhead", "press", "lateral", "raise", "face pull"],
  Biceps: ["bicep", "arm", "curl", "preacher", "hammer"],
  Triceps: ["tricep", "arm", "pushdown", "skull", "dip", "extension"],
  Quadriceps: ["quad", "leg", "squat", "press", "lunge", "split"],
  Hamstrings: ["hamstring", "leg", "deadlift", "rdl", "curl"],
  Core: ["core", "ab", "plank", "raise", "woodchopper", "rollout"],
};

const filterTabs = [
  "All signals",
  "Favorites",
];

export default function ExerciseLibrary() {
  const [, setLocation] = useLocation();
  const [focus, setFocus] = useState("All signals");
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [videoExercise, setVideoExercise] = useState<LibraryExercise | null>(null);
  const [preferences, setPreferences] = useState<Record<string, ExercisePreference>>(getExercisePreferences);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseProgress>(getExerciseProgress);

  // Automatically check for 24h expiration on focus and periodic interval
  useEffect(() => {
    const checkExpiration = () => {
      setExerciseProgress(getExerciseProgress());
    };
    checkExpiration();
    const interval = setInterval(checkExpiration, 60000);
    window.addEventListener("focus", checkExpiration);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", checkExpiration);
    };
  }, []);

  const persist = (next: Record<string, ExercisePreference>) => {
    setPreferences(next);
    saveExercisePreferences(next);
  };

  const persistProgress = (next: ExerciseProgress) => {
    setExerciseProgress(next);
    saveExerciseProgress(next);
  };

  const preferenceFor = (id: string) => preferences[id] ?? {};

  const targetFor = (exercise: LibraryExercise): ExerciseTarget => {
    const [defaultSets = "3", defaultReps = "8–10"] = exercise.sets.split("×").map((part) => part.trim());
    return exerciseProgress[exercise.id] ?? { sets: defaultSets, reps: defaultReps, completed: false };
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return libraryExercises.filter((exercise) => {
      const preference = preferenceFor(exercise.id);
      if (preference.hidden) return false;

      // Filter by tab
      let matchesTab = false;
      if (focus === "All signals") {
        matchesTab = true;
      } else if (focus === "Favorites") {
        matchesTab = Boolean(preference.favorite);
      } else if (focus === "Coached") {
        matchesTab = Boolean(preference.viewedAt);
      } else {
        const aliases = muscleAliases[focus] || [focus.toLowerCase()];
        const exFocus = exercise.focus.toLowerCase();
        const exName = exercise.name.toLowerCase();
        matchesTab =
          exFocus.includes(focus.toLowerCase()) ||
          aliases.some((alias) => exFocus.includes(alias) || exName.includes(alias));
      }

      if (!matchesTab) return false;

      // Search query matching
      if (!q) return true;
      const nameMatch = exercise.name.toLowerCase().includes(q);
      const focusMatch = exercise.focus.toLowerCase().includes(q);
      const equipMatch = exercise.equipment.toLowerCase().includes(q);
      const levelMatch = exercise.level.toLowerCase().includes(q);

      const matchesQueryAlias = Object.entries(muscleAliases).some(([group, aliases]) => {
        if (group.toLowerCase().includes(q) || aliases.some((a) => a.includes(q))) {
          return exercise.focus.toLowerCase().includes(group.toLowerCase());
        }
        return false;
      });

      return nameMatch || focusMatch || equipMatch || levelMatch || matchesQueryAlias;
    });
  }, [focus, query, preferences]);

  // Determine active exercise dynamically
  const activeExercise = useMemo(() => {
    if (selectedExerciseId) {
      const found = filtered.find((e) => e.id === selectedExerciseId);
      if (found) return found;
    }
    if (filtered.length > 0) {
      return filtered[0];
    }
    return null;
  }, [selectedExerciseId, filtered]);

  // Target muscle label to display in banner
  const targetMuscleLabel = useMemo(() => {
    if (activeExercise) {
      return activeExercise.focus.toUpperCase();
    }
    if (focus !== "All signals" && focus !== "Favorites" && focus !== "Coached") {
      return focus.toUpperCase();
    }
    return "ALL MUSCLE GROUPS";
  }, [activeExercise, focus]);

  // Active muscle group for visual anatomy highlight
  const activeMuscleFocus = useMemo(() => {
    if (activeExercise) {
      const f = activeExercise.focus.toLowerCase();
      if (f.includes("pectoral") || f.includes("chest")) return "pecs";
      if (f.includes("lat") || f.includes("back") || f.includes("rhomboid")) return "lats";
      if (f.includes("deltoid") || f.includes("shoulder") || f.includes("trap")) return "shoulders";
      if (f.includes("bicep") || f.includes("tricep") || f.includes("arm") || f.includes("forearm")) return "arms";
      if (f.includes("core") || f.includes("ab") || f.includes("oblique")) return "core";
      if (f.includes("quad") || f.includes("hamstring") || f.includes("glute") || f.includes("leg") || f.includes("calf")) return "legs";
    }
    const foc = focus.toLowerCase();
    if (foc === "pectorals") return "pecs";
    if (foc === "lats") return "lats";
    if (foc === "deltoids") return "shoulders";
    if (foc === "biceps" || foc === "triceps") return "arms";
    if (foc === "core") return "core";
    if (foc === "quadriceps" || foc === "hamstrings") return "legs";
    return "all";
  }, [activeExercise, focus]);

  const stage = (exercise: LibraryExercise) => {
    localStorage.setItem("fittrack-staged-exercise", exercise.name);
    toast(`${exercise.name} staged in your active protocol`);
    setLocation("/log-workout");
  };

  const toggleFavorite = (id: string) => {
    const current = preferenceFor(id);
    persist({ ...preferences, [id]: { ...current, favorite: !current.favorite } });
  };

  const hideExercise = (id: string) => {
    const current = preferenceFor(id);
    persist({ ...preferences, [id]: { ...current, hidden: true } });
    toast("Movement hidden from this device library");
  };

  const markViewed = (id: string) => {
    const current = preferenceFor(id);
    if (!current.viewedAt) persist({ ...preferences, [id]: { ...current, viewedAt: new Date().toISOString() } });
  };

  const updateTarget = (exercise: LibraryExercise, target: Pick<ExerciseTarget, "sets" | "reps">) =>
    persistProgress({ ...exerciseProgress, [exercise.id]: { ...targetFor(exercise), ...target } });

  const setCompleted = (exercise: LibraryExercise, completed: boolean) => {
    persistProgress({
      ...exerciseProgress,
      [exercise.id]: { ...targetFor(exercise), completed, completedAt: completed ? new Date().toISOString() : undefined },
    });
    toast(completed ? `${exercise.name} marked complete` : `${exercise.name} returned to active protocol`);
  };

  return (
    <WorkflowLayout title="Study the pattern">
      <section className="library-toolbar">
        <div className="library-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSelectedExerciseId(null);
            }}
            placeholder="Search movements..."
          />
          {query && (
            <button
              className="search-clear-btn"
              onClick={() => {
                setQuery("");
                setSelectedExerciseId(null);
              }}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="library-filters">
          <button
            className={focus === "Favorites" ? "selected" : ""}
            onClick={() => {
              const next = focus === "Favorites" ? "All signals" : "Favorites";
              setFocus(next);
              setSelectedExerciseId(null);
              if (next === "Favorites") toast("Showing favorite movements");
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            aria-label="Filter by favorites"
          >
            <Heart size={13} fill={focus === "Favorites" ? "currentColor" : "none"} />
            Favorites
          </button>
        </div>
      </section>

      <section className="exercise-library-grid">
        {filtered.map((exercise, index) => (
          <ExerciseFlipCard
            key={exercise.id}
            exercise={exercise}
            index={index}
            isActive={activeExercise?.id === exercise.id}
            onSelect={() => setSelectedExerciseId(exercise.id)}
            onStage={stage}
            favorite={Boolean(preferenceFor(exercise.id).favorite)}
            viewed={Boolean(preferenceFor(exercise.id).viewedAt)}
            target={targetFor(exercise)}
            onTargetChange={(target) => updateTarget(exercise, target)}
            onCompletionChange={(completed) => setCompleted(exercise, completed)}
            onFavorite={() => toggleFavorite(exercise.id)}
            onHide={() => hideExercise(exercise.id)}
            onViewed={() => markViewed(exercise.id)}
            onWatchVideo={(ex) => setVideoExercise(ex)}
          />
        ))}
      </section>

      <ExerciseVideoModal
        exercise={videoExercise}
        open={Boolean(videoExercise)}
        onClose={() => setVideoExercise(null)}
      />

      {filtered.length === 0 && (
        <div className="library-empty" style={{ textAlign: "center", padding: "40px 20px" }}>
          <p style={{ marginBottom: "14px", color: "#8fa18f" }}>
            {focus === "Coached"
              ? "No coached exercises yet. Flip any exercise card to review its coaching cues — it will appear here."
              : focus === "Favorites"
              ? "No favorites saved yet. Click the star on any exercise card to save it here."
              : `No exercises match "${query || focus}".`}
          </p>
          <button
            className="inline-add-custom-btn"
            onClick={() => {
              setFocus("All signals");
              setQuery("");
              setSelectedExerciseId(null);
            }}
          >
            Show All Movements ({libraryExercises.length} available)
          </button>
        </div>
      )}
    </WorkflowLayout>
  );
}
