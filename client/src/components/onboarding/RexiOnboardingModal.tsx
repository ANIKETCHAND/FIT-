/* FitTrack: Rexi AI Onboarding Modal (Step 1: Fullscreen 3D Rexi + Cloud Speech Bubble -> Step 2: Experience Selection (Beginner, Intermediate, Advanced) -> Step 3: Gym Rat Mode) */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Dumbbell, Flame, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import { Rexi3DCanvas } from "./Rexi3DCanvas";
import { getAthleteProfile, saveExperienceMode, saveExperienceTier, getScopedKey, isProfileConfigured, getActiveUserEmail } from "@/lib/user-store";

export function RexiOnboardingModal() {
  const [location, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [stage, setStage] = useState<"greeting" | "ask_level" | "gym_rat_popup">("greeting");
  const [selectedLevel, setSelectedLevel] = useState<"beginner" | "intermediate" | "advanced" | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const profile = getAthleteProfile() || { name: "Athlete" };
  const rawName = (profile?.name && typeof profile.name === "string" ? profile.name : "Athlete").trim();
  const firstName = rawName.split(" ")[0] || "Athlete";

  useEffect(() => {
    const checkAndOpen = () => {
      try {
        // The dedicated /onboarding questionnaire owns first-run setup; never
        // overlay this legacy welcome modal on top of it.
        if (location.startsWith("/onboarding")) {
          setIsOpen(false);
          return;
        }

        const isAuth = localStorage.getItem("fittrack_auth_state") === "authenticated";
        if (!isAuth) {
          setIsOpen(false);
          return;
        }

        const trigger = localStorage.getItem("fittrack_trigger_rexi_welcome");
        const configured = isProfileConfigured();
        const cleanScope = getActiveUserEmail().replace(/[^a-z0-9]/gi, "_");
        const welcomedPermanent = localStorage.getItem(`fittrack_rexi_welcomed__${cleanScope}`) === "true";
        const welcomedSession = sessionStorage.getItem("fittrack_rexi_welcomed") === "true";

        // If user already configured profile and no explicit trigger, bypass completely
        if (configured && trigger !== "true") {
          setIsOpen(false);
          return;
        }

        // If user was already welcomed and no explicit trigger, bypass completely
        if ((welcomedPermanent || welcomedSession) && trigger !== "true") {
          setIsOpen(false);
          return;
        }

        if (trigger === "true" || (!configured && !welcomedPermanent)) {
          localStorage.removeItem("fittrack_trigger_rexi_welcome");
          setStage("greeting");
          setIsTransitioning(false);
          setSelectedLevel(null);
          setIsOpen(true);
        }
      } catch {
        // Safe fallback
      }
    };

    const timer = setTimeout(checkAndOpen, 250);

    const handleOpen = () => {
      setStage("greeting");
      setIsTransitioning(false);
      setSelectedLevel(null);
      setIsOpen(true);
    };

    window.addEventListener("fittrack_open_rexi_onboarding", handleOpen);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("fittrack_open_rexi_onboarding", handleOpen);
    };
  }, [location]);

  const handleSelectLevel = (level: "beginner" | "intermediate" | "advanced") => {
    setSelectedLevel(level);

    try {
      saveExperienceMode(level === "beginner" ? "beginner" : "advanced");
      saveExperienceTier(level);
      const cleanScope = getActiveUserEmail().replace(/[^a-z0-9]/gi, "_");
      localStorage.setItem(`fittrack_rexi_welcomed__${cleanScope}`, "true");
      sessionStorage.setItem("fittrack_rexi_welcomed", "true");
      localStorage.setItem("fittrack_just_onboarded", "true");
    } catch {}

    if (level === "beginner") {
      setIsTransitioning(true);
      toast.success("Beginner Mode activated! Let's calibrate your profile in Settings...");
      setTimeout(() => {
        setIsOpen(false);
        setLocation("/settings?onboarding=true");
      }, 500);
    } else {
      // Open dedicated "Welcome Gym rat" popup box!
      setStage("gym_rat_popup");
    }
  };

  const handleProceedToSettings = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsOpen(false);
      setLocation("/settings?onboarding=true");
    }, 400);
  };

  const handleLaunchTourFromGymRat = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setIsOpen(false);
      sessionStorage.setItem("fittrack_beginner_tour_active", "true");
      sessionStorage.setItem("fittrack_beginner_tour_step", "0");
      setLocation("/overview");
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent("fittrack_start_beginner_tour"));
      }, 200);
    }, 400);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl overflow-y-auto">
        {/* Ambient Glows across the screen */}
        <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#c6ff3d]/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="fixed bottom-10 left-1/4 w-72 h-72 bg-[#38bdf8]/10 rounded-full blur-[90px] pointer-events-none" />

        {stage === "greeting" ? (
          /* STAGE 1: IMMERSIVE FULL-SCREEN REXI + CLEAN CLOUD SPEECH BUBBLE */
          <motion.div
            key="greeting"
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-md flex flex-col items-center text-center relative z-10 py-6"
          >
            {/* 3D Floating Rexi Mascot */}
            <motion.div
              initial={{ y: -40, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative flex flex-col items-center mb-1"
            >
              <div className="w-[300px] h-[260px] relative flex items-center justify-center">
                <Rexi3DCanvas step="greeting" />
              </div>
              <span className="absolute top-3 right-6 bg-[#c6ff3d] text-black text-[9.5px] font-bold font-mono px-3 py-1 rounded-full uppercase tracking-wider shadow-[0_0_16px_rgba(198,255,61,0.6)]">
                3D AI Guide
              </span>
            </motion.div>

            {/* Cloud-Like Speech Bubble Structure */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.45, ease: "easeOut" }}
              className="w-full relative bg-gradient-to-b from-[#141f16] via-[#101712] to-[#0c120e] border-2 border-[#c6ff3d]/45 rounded-[2.5rem] p-7 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(198,255,61,0.15)] text-center my-2"
            >
              {/* Speech Bubble Pointer pointing up to Rexi */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-7 h-7 bg-[#141f16] border-t-2 border-l-2 border-[#c6ff3d]/45 rotate-45" />

              {/* Cloud Soft Highlight Accents */}
              <div className="absolute top-2 left-6 w-16 h-4 rounded-full bg-white/[0.05] blur-sm pointer-events-none" />
              <div className="absolute top-2 right-6 w-12 h-3.5 rounded-full bg-white/[0.05] blur-sm pointer-events-none" />

              <div className="space-y-3 relative z-10">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Hello, <span className="text-[#c6ff3d]">{firstName}</span>! 👋
                </h2>

                <p className="text-sm text-[#b8cbb5] max-w-xs mx-auto leading-relaxed">
                  I'm <strong className="text-white">Rexi</strong>, your personal 3D AI fitness companion.
                </p>

                <p className="text-xs text-[#718270] font-mono bg-black/40 py-2 px-4 rounded-full inline-block border border-white/5">
                  Let's calibrate your training protocol in 2 quick steps.
                </p>
              </div>
            </motion.div>

            {/* Action Button */}
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => setStage("ask_level")}
              className="w-full mt-4 py-4 bg-[#c6ff3d] hover:bg-[#b0f028] text-black font-mono font-bold text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_30px_rgba(198,255,61,0.4)] transition-all flex items-center justify-center gap-2"
            >
              <span>Let's Get Started</span>
              <ArrowRight size={16} />
            </motion.button>
          </motion.div>
        ) : stage === "gym_rat_popup" ? (
          /* STAGE 3 (GYM RAT POPUP): DEDICATED DIALOG FOR INTERMEDIATE & PRO */
          <motion.div
            key="gym_rat_popup"
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-md bg-[#0c120e] border border-[#c6ff3d]/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(198,255,61,0.22)] text-white relative overflow-hidden transition-all duration-300 z-10"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-full relative flex items-center justify-center -mt-2">
                <Rexi3DCanvas step="greeting" isCelebrating={true} />
                <span className="absolute top-2 right-4 bg-amber-400 text-black text-[9px] font-bold font-mono px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md pointer-events-none flex items-center gap-1">
                  <span>🐀🔥</span> Gym Rat Mode
                </span>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-3 space-y-2.5"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c6ff3d]/10 border border-[#c6ff3d]/30 rounded-full text-[#c6ff3d] text-[11px] font-mono font-bold uppercase tracking-wider">
                  <Dumbbell size={13} />
                  <span>{selectedLevel === "advanced" ? "Advanced Athlete" : "Intermediate"} Unlocked</span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Welcome, <span className="text-[#c6ff3d]">Gym Rat! 🐀🔥</span>
                </h2>

                <p className="text-xs sm:text-sm text-[#b8cbb5] max-w-xs mx-auto leading-relaxed">
                  You already know the iron game! Full 3D muscle telemetry, progressive overload tracking, and hypertrophy diagnostics are primed for you.
                </p>

                <p className="text-[11px] text-[#718270] font-mono bg-black/40 p-2.5 rounded-xl border border-white/5">
                  ⚡ Next: Calibrate your body mass (kg), height and target load in Settings.
                </p>
              </motion.div>

              <div className="w-full space-y-2 mt-5">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleProceedToSettings}
                  disabled={isTransitioning}
                  className="w-full py-3.5 bg-[#c6ff3d] hover:bg-[#b0f028] text-black font-mono font-bold text-xs uppercase tracking-wider rounded-2xl shadow-[0_0_25px_rgba(198,255,61,0.35)] transition-all flex items-center justify-center gap-2"
                >
                  <span>Calibrate in Settings</span>
                  <ArrowRight size={15} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleLaunchTourFromGymRat}
                  disabled={isTransitioning}
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white font-mono text-xs uppercase tracking-wider rounded-2xl border border-white/10 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles size={13} className="text-[#c6ff3d]" />
                  <span>Take Guided App Tour</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* STAGE 2: THEN REXI ASKS YOUR TRAINING LEVEL (3 TIERS: BEGINNER, INTERMEDIATE, ADVANCED) */
          <motion.div
            key="ask_level"
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-lg bg-[#0c120e] border border-[#c6ff3d]/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(198,255,61,0.22)] text-white relative overflow-hidden transition-all duration-300 z-10"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-full h-[160px] relative flex items-center justify-center -mt-2 mb-2">
                <Rexi3DCanvas step="ask_level" isCelebrating={isTransitioning} />
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                What is your training experience level?
              </h3>
              <p className="text-xs text-[#8b9c8a] mt-0.5 mb-4 font-mono">
                Step 1 of 2: Tailors weight load and form guidance
              </p>

              {/* 3 Experience Level Cards */}
              <div className="w-full space-y-2.5">
                {[
                  {
                    id: "beginner" as const,
                    title: "Beginner",
                    desc: "Learning proper exercise form, guided cues and fundamental movements",
                    icon: ShieldCheck,
                    color: "text-emerald-400",
                    border: "hover:border-emerald-400/50",
                    bg: "bg-emerald-500/10",
                  },
                  {
                    id: "intermediate" as const,
                    title: "Intermediate",
                    desc: "Tracking progressive overload, workout volume and muscle growth",
                    icon: Dumbbell,
                    color: "text-[#c6ff3d]",
                    border: "hover:border-[#c6ff3d]/50",
                    bg: "bg-[#c6ff3d]/10",
                  },
                  {
                    id: "advanced" as const,
                    title: "Advanced Gym Rat",
                    desc: "High intensity training, custom programming and performance tracking",
                    icon: Flame,
                    color: "text-amber-400",
                    border: "hover:border-amber-400/50",
                    bg: "bg-amber-500/10",
                  },
                ].map((item) => {
                  const isSelected = selectedLevel === item.id;
                  const Icon = item.icon;

                  return (
                    <motion.button
                      key={item.id}
                      whileHover={{ scale: 1.015 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => handleSelectLevel(item.id)}
                      disabled={isTransitioning}
                      className={`w-full p-4 rounded-2xl text-left border transition-all flex items-center justify-between ${
                        isSelected
                          ? "border-[#c6ff3d] bg-[#c6ff3d]/20 shadow-[0_0_25px_rgba(198,255,61,0.25)]"
                          : `border-white/10 bg-white/[0.03] ${item.border} hover:bg-white/[0.06]`
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-white flex items-center gap-2">
                            {item.title}
                            {isSelected && <Check size={14} className="text-[#c6ff3d]" />}
                          </div>
                          <div className="text-[10px] sm:text-[11px] text-[#8b9c8a] mt-0.5">{item.desc}</div>
                        </div>
                      </div>

                      <ArrowRight size={15} className="text-[#8b9c8a] flex-shrink-0 ml-2" />
                    </motion.button>
                  );
                })}
              </div>

              {/* Transition Indicator */}
              <div className="mt-4 text-center">
                {isTransitioning ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-xs font-mono text-[#c6ff3d] flex items-center justify-center gap-2"
                  >
                    <Sparkles size={14} className="animate-spin" />
                    <span>Calibrating... Launching Guided Tour</span>
                  </motion.div>
                ) : (
                  <p className="text-[10px] font-mono text-[#5a6b58]">
                    Next step: Calibrate body mass (kg), height and daily targets
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </AnimatePresence>
  );
}
