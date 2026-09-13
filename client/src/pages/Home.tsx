import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/navigation/Sidebar";
import { FlameButton } from "@/components/ui/flame-button";
import { OrbitalReadinessScene } from "@/components/3d/OrbitalReadinessScene";
import {
  WorkoutRecommendationCard,
  NutritionLedgerCard,
  TrainingRhythmCard,
} from "@/components/dashboard/DashboardCards";
import { getAthleteProfile, getScopedKey } from "@/lib/user-store";
import { muscleLibrary, type MuscleId } from "@/lib/fitness-data";

export default function Home() {
  const [, setLocation] = useLocation();

  const getGreetingPeriod = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "MORNING";
    if (hour >= 12 && hour < 17) return "AFTERNOON";
    // Evening covers evening AND night, so the greeting is never "GOOD NIGHT".
    return "EVENING";
  };

  // Overall body recovery = the average of every muscle's live recovery score.
  // This keeps the dashboard readiness IN SYNC with the Body Map recovery
  // (a fresh/untrained athlete reads 100% on both screens).
  const computeReadinessScore = (): number => {
    try {
      const ids: MuscleId[] = [
        "chest", "shoulders", "biceps", "triceps", "core",
        "back", "glutes", "quads", "hamstrings", "calves",
      ];
      const scores = ids.map((id) => {
        const s = muscleLibrary[id]?.score;
        return typeof s === "number" ? s : 100;
      });
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      return Math.max(0, Math.min(100, Math.round(avg)));
    } catch {
      return 100;
    }
  };

  const [greetingWord, setGreetingWord] = useState(getGreetingPeriod());
  const [userName, setUserName] = useState(() => {
    const profile = getAthleteProfile();
    return (profile.name?.split(" ")[0] || "ATHLETE").toUpperCase();
  });
  const [readinessScore, setReadinessScore] = useState(() => computeReadinessScore());
  const [formattedTime, setFormattedTime] = useState("");

  useEffect(() => {
    const updateTimeAndGreeting = () => {
      const now = new Date();
      const day = now.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
      const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      setFormattedTime(`${day} • ${time}`);
      setGreetingWord(getGreetingPeriod());
      setReadinessScore(computeReadinessScore());

      const profile = getAthleteProfile();
      if (profile.name && profile.name.trim()) {
        const first = profile.name.trim().split(" ")[0];
        setUserName(first.toUpperCase());
      }
    };

    updateTimeAndGreeting();
    const interval = setInterval(updateTimeAndGreeting, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="editorial-app-shell">
      <Sidebar />

      <main className="editorial-main-content">
        {/* TOP HERO SECTION */}
        <section className="editorial-hero-grid">
          {/* Left Hero Column: Typography & Actions */}
          <div className="editorial-hero-left">
            <div className="editorial-timestamp">
              {formattedTime || "TUESDAY • 01:16 PM"}
            </div>

            <h1 className="editorial-greeting-title">
              GOOD<br />
              {greetingWord},<br />
              <span className="greeting-athlete">{userName}</span>
            </h1>

            <div className="editorial-action-row">
              <FlameButton
                text="Begin Today's Session"
                href=""
                height={50}
                textColor="#17110a"
                borderColor="rgba(0,0,0,0.18)"
                onClick={() => setLocation("/start-session")}
              />

              <button
                className="editorial-secondary-link"
                onClick={() => setLocation("/exercise-library")}
              >
                View training plan
              </button>
            </div>

            {/* Score & Telemetry Indicator */}
            <div className="editorial-score-block">
              <div className="editorial-score-badge">
                <span className="score-number">{readinessScore}</span>
                <div className="score-denom">
                  <span className="denom-val">/ 100</span>
                  <span className="denom-label">READINESS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero Column: 3D Orbital Readiness Form */}
          <div className="editorial-hero-right">
            <OrbitalReadinessScene score={readinessScore} />
          </div>
        </section>

        {/* BOTTOM 3-CARD TELEMETRY GRID */}
        <section className="editorial-bottom-grid">
          <WorkoutRecommendationCard />
          <NutritionLedgerCard />
          <TrainingRhythmCard />
        </section>
      </main>
    </div>
  );
}
