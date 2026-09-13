/* FitTrack: Rexi Interactive App Tour for Beginners (Clean, Professional Copy without AI jargon or special symbols) */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import { RexiMascotIcon } from "@/components/ai/EchoAssistant";
import { isProfileConfigured } from "@/lib/user-store";

export interface TourStep {
  stepIndex: number;
  title: string;
  path: string;
  pageName: string;
  category: string;
  speechText: string;
  quickHighlight: string;
}

export const tourSteps: TourStep[] = [
  {
    stepIndex: 0,
    title: "Overview Dashboard",
    path: "/overview",
    pageName: "Command Center",
    category: "Step 1 of 5",
    speechText:
      "Welcome to your Command Center! View your daily calorie & macro targets, training streak, and daily recommendations here.",
    quickHighlight: "Monitor daily nutrition goals, streak, and quick actions.",
  },
  {
    stepIndex: 1,
    title: "3D Muscle Studio",
    path: "/body-map",
    pageName: "3D Body Map",
    category: "Step 2 of 5",
    speechText:
      "Rotate the full 3D anatomical model in 360 degrees, tap any muscle group, and check recovery readiness before training.",
    quickHighlight: "Explore 3D muscle groups and track physical recovery status.",
  },
  {
    stepIndex: 2,
    title: "Exercise Directory",
    path: "/exercise-library",
    pageName: "Exercise Library",
    category: "Step 3 of 5",
    speechText:
      "Explore comprehensive exercise guides with animated video demonstrations, step by step instructions, and bookmark your favorites.",
    quickHighlight: "Watch exercise demonstration videos and save favorites.",
  },
  {
    stepIndex: 3,
    title: "Nutrition and Meal Log",
    path: "/log-food",
    pageName: "Nutrition",
    category: "Step 4 of 5",
    speechText:
      "Log your daily meals from 100+ traditional Indian foods with Hindi names, build meals from raw ingredients, and monitor your calorie and protein goals.",
    quickHighlight: "Log Indian meals with Hindi names and track your daily nutrition.",
  },
  {
    stepIndex: 4,
    title: "Workout Logger",
    path: "/log-workout",
    pageName: "Workout Tracker",
    category: "Step 5 of 5",
    speechText:
      "Log your workout sets, repetitions, and weights with guided warm up routines and safety tips to build consistent strength.",
    quickHighlight: "Record your sets, reps, and weights during workouts.",
  },
];

export function RexiGuidedTour() {
  const [location, setLocation] = useLocation();
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    // Check if tour should be active
    try {
      const activeFlag = sessionStorage.getItem("fittrack_beginner_tour_active");
      if (activeFlag === "true") {
        setIsActive(true);
        const savedIndex = Number(sessionStorage.getItem("fittrack_beginner_tour_step")) || 0;
        setCurrentStepIndex(savedIndex);
      }
    } catch {}

    const handleStartTour = () => {
      sessionStorage.setItem("fittrack_beginner_tour_active", "true");
      sessionStorage.setItem("fittrack_beginner_tour_step", "0");
      setCurrentStepIndex(0);
      setIsActive(true);
      setLocation(tourSteps[0].path);
    };

    (window as any).startRexiTour = handleStartTour;
    window.addEventListener("fittrack_start_beginner_tour", handleStartTour);
    return () => window.removeEventListener("fittrack_start_beginner_tour", handleStartTour);
  }, [location]);

  const currentStep = tourSteps[currentStepIndex] || tourSteps[0];

  const goToStep = (index: number) => {
    if (index < 0 || index >= tourSteps.length) return;
    setCurrentStepIndex(index);
    sessionStorage.setItem("fittrack_beginner_tour_step", String(index));
    setLocation(tourSteps[index].path);
  };

  const handleNext = () => {
    if (currentStepIndex < tourSteps.length - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  };

  const handleFinish = () => {
    setIsActive(false);
    sessionStorage.removeItem("fittrack_beginner_tour_active");
    sessionStorage.removeItem("fittrack_beginner_tour_step");
    if (!isProfileConfigured()) {
      toast.success("Tour complete! Now let's calibrate your athlete profile.");
      setLocation("/settings?onboarding=true");
    } else {
      toast.success("Tour complete! You are ready to start tracking your fitness.");
      setLocation("/overview");
    }
  };

  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1] }}
        className="fixed bottom-5 right-5 sm:right-8 z-[99999] max-w-md w-[calc(100vw-40px)] sm:w-[440px] bg-[#0c130e]/95 border border-[#c6ff3d]/40 rounded-3xl p-5 shadow-[0_10px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(198,255,61,0.25)] text-white backdrop-blur-2xl"
      >
        {/* Top Tour Step Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="bg-[#c6ff3d] text-black text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              Rexi Guided Tour
            </span>
            <span className="text-xs font-mono text-[#8b9c8a]">
              {currentStepIndex + 1} of {tourSteps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="p-1 rounded-lg text-[#8b9c8a] hover:text-white hover:bg-white/10 transition-colors"
            title="Exit Tour"
          >
            <X size={16} />
          </button>
        </div>

        {/* Rexi Character and Speech Area */}
        <div className="flex items-start gap-3.5 mb-4">
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            className="flex-shrink-0 mt-0.5"
          >
            <RexiMascotIcon size={46} animated />
          </motion.div>

          <div className="flex-1">
            <div className="font-bold text-sm text-white flex items-center gap-2">
              <span>{currentStep.title}</span>
              <span className="text-[10px] font-normal font-mono text-[#c6ff3d] bg-[#c6ff3d]/10 px-2 py-0.5 rounded-full border border-[#c6ff3d]/30">
                {currentStep.pageName}
              </span>
            </div>

            <p className="text-xs text-[#d1e0cf] mt-1.5 leading-relaxed">
              {currentStep.speechText}
            </p>

            <div className="mt-2 text-[11px] text-[#a1b3a0] bg-black/40 p-2.5 rounded-xl border border-white/5">
              {currentStep.quickHighlight}
            </div>
          </div>
        </div>

        {/* Step Progress Dots */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-1.5">
            {tourSteps.map((step, idx) => (
              <button
                key={step.stepIndex}
                type="button"
                onClick={() => goToStep(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentStepIndex
                    ? "w-6 bg-[#c6ff3d]"
                    : idx < currentStepIndex
                    ? "w-2 bg-[#38bdf8]"
                    : "w-2 bg-white/20"
                }`}
                title={`Jump to ${step.pageName}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1"
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 bg-[#c6ff3d] hover:bg-[#b0f028] text-black rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-[0_0_15px_rgba(198,255,61,0.3)]"
            >
              {currentStepIndex === tourSteps.length - 1 ? (
                <>
                  <span>Finish Tour</span>
                  <Check size={13} />
                </>
              ) : (
                <>
                  <span>Next Page</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
