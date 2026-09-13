/* FitTrack: Interactive Beginner Fitness Glossary & Explain-This Tooltips */
import React, { useState } from "react";
import { HelpCircle, Info, BookOpen, X, Sparkles, CheckCircle2, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface GlossaryTerm {
  term: string;
  category: "training" | "nutrition" | "physiology";
  shortDefinition: string;
  inDepthExplanation: string;
  beginnerExample: string;
  proTip: string;
}

export const FITNESS_GLOSSARY: Record<string, GlossaryTerm> = {
  "set": {
    term: "Set",
    category: "training",
    shortDefinition: "A group of consecutive repetitions (reps) performed without stopping.",
    inDepthExplanation: "A set is a block of work. For example, doing 10 push-ups, then resting for 60 seconds, counts as 1 completed set. Most workout routines prescribe 3 to 4 sets per exercise.",
    beginnerExample: "3 sets of 10 reps means: do 10 reps -> rest -> do 10 reps -> rest -> do 10 reps.",
    proTip: "Rest 60–90 seconds between isolation sets (like bicep curls) and 2–3 minutes between heavy compound sets (like squats).",
  },
  "rep": {
    term: "Rep (Repetition)",
    category: "training",
    shortDefinition: "A single complete execution of an exercise movement from start to finish.",
    inDepthExplanation: "One rep includes both the lifting phase (concentric, e.g. pushing a bar up) and the lowering phase (eccentric, e.g. lowering the bar down with control).",
    beginnerExample: "Lowering yourself to the floor and pushing back up once = 1 rep.",
    proTip: "Never rush reps. Take 2 seconds to lower the weight and 1 second to lift with explosive power.",
  },
  "progressive-overload": {
    term: "Progressive Overload",
    category: "training",
    shortDefinition: "Gradually increasing the physical challenge on your muscles over time to stimulate strength and muscle growth.",
    inDepthExplanation: "Your muscles adapt to the stress placed upon them. If you lift the exact same weight for the exact same reps forever, your body has no reason to grow. Overload is achieved by adding weight, performing more reps, doing more sets, or improving form.",
    beginnerExample: "Week 1: Dumbbell press 10kg for 8 reps. Week 3: Dumbbell press 10kg for 10 reps. Week 5: Dumbbell press 12.5kg for 8 reps.",
    proTip: "Small jumps (1.25kg to 2.5kg) lead to huge long-term transformations while preventing injury.",
  },
  "target-muscle": {
    term: "Target Muscle (Primary Mover)",
    category: "physiology",
    shortDefinition: "The main muscle group designed to do the work and receive the stimulus during an exercise.",
    inDepthExplanation: "While many muscles assist in stabilizing a movement (synergists), the target muscle is the primary generator of force. For example, during a Bench Press, the Pectorals (Chest) are the target muscle, while the Triceps and Anterior Deltoids assist.",
    beginnerExample: "Bicep Curls -> Target: Biceps. Romanian Deadlifts -> Target: Hamstrings & Glutes.",
    proTip: "Focus on the 'mind-muscle connection'—actively feel the target muscle stretch and squeeze throughout each repetition.",
  },
  "rpe": {
    term: "RPE (Rate of Perceived Exertion)",
    category: "training",
    shortDefinition: "A 1–10 scale measuring how difficult a set felt and how close you were to failure.",
    inDepthExplanation: "RPE 10 means maximum effort with 0 reps left in reserve (absolute failure). RPE 8 means you finished the set but could have done 2 more reps if pushed. RPE 7 means 3 reps in reserve.",
    beginnerExample: "If you finish 10 reps and feel you could have done 2 more, that set is RPE 8.",
    proTip: "Beginners should train mostly at RPE 7–8 to master movement mechanics safely before attempting RPE 9–10.",
  },
  "1rm": {
    term: "1RM (One-Rep Max)",
    category: "training",
    shortDefinition: "The maximum amount of weight you can lift for a single repetition with clean form.",
    inDepthExplanation: "1RM is a benchmark of maximal strength. Rather than testing true 1RMs (which carries high injury risk for beginners), FitTrack calculates your estimated 1RM using Brzycki and Epley equations based on your working sets.",
    beginnerExample: "Lifting 60kg for 10 reps yields an estimated 1RM of ~80kg.",
    proTip: "Calculate working weights as percentages of your 1RM (e.g. 70% 1RM for hypertrophy).",
  },
  "warm-up": {
    term: "Warm-Up & Mobility",
    category: "training",
    shortDefinition: "Light movement to elevate core temperature, lubricate synovial joints, and prepare the central nervous system.",
    inDepthExplanation: "A proper warm-up includes 3–5 minutes of light cardio followed by dynamic mobility drills and 1–2 lightweight warm-up sets before touching your working weights.",
    beginnerExample: "Before squats: 5 minutes brisk walking + hip circles + 1 set of bodyweight squats.",
    proTip: "Never stretch statically (holding a stretch for 30s) before heavy lifting; save static stretching for post-workout cooldown.",
  },
};

interface GlossaryTooltipProps {
  termKey: keyof typeof FITNESS_GLOSSARY;
  children?: React.ReactNode;
  inline?: boolean;
}

export function GlossaryTooltip({ termKey, children, inline = true }: GlossaryTooltipProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const data = FITNESS_GLOSSARY[termKey] || {
    term: String(termKey),
    category: "training",
    shortDefinition: "Fitness training terminology concept.",
    inDepthExplanation: "Click to learn more about this term in the FitTrack glossary.",
    beginnerExample: "N/A",
    proTip: "Consistency is key.",
  };

  return (
    <>
      <span
        onClick={(e) => {
          e.stopPropagation();
          setModalOpen(true);
        }}
        className={`inline-flex items-center gap-1 cursor-pointer group text-[#c9ad7e] hover:underline ${
          inline ? "border-b border-dashed border-[#c9ad7e]/60" : ""
        }`}
        title={`Click to learn: What is a ${data.term}?`}
      >
        {children || data.term}
        <HelpCircle size={11} className="text-[#c9ad7e]/80 group-hover:text-[#c9ad7e] transition-colors" />
      </span>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md bg-[#f2e9d8] border border-[#c9ad7e]/30 text-white rounded-3xl p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-[10px] font-mono text-[#c9ad7e] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} />
                <span>Beginner Concept Guide</span>
              </span>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 text-[#8b9c8a] border border-white/10">
                {data.category}
              </span>
            </div>
            <DialogTitle className="text-xl font-extrabold text-white mt-2">
              {data.term}
            </DialogTitle>
            <DialogDescription className="text-xs text-[#c9ad7e] font-mono font-medium">
              {data.shortDefinition}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 mt-2 text-xs text-[#edf4e9]">
            <div className="bg-white/[0.02] border border-white/10 p-3 rounded-2xl">
              <span className="font-mono text-[10px] uppercase text-[#8b9c8a] block mb-1">
                How It Works
              </span>
              <p className="leading-relaxed text-[#c3cec1]">
                {data.inDepthExplanation}
              </p>
            </div>

            <div className="bg-[#c9ad7e]/5 border border-[#c9ad7e]/20 p-3 rounded-2xl">
              <span className="font-mono text-[10px] uppercase text-[#c9ad7e] block mb-1">
                Real-World Example
              </span>
              <p className="font-mono text-[11px] text-white">
                {data.beginnerExample}
              </p>
            </div>

            <div className="bg-amber-400/5 border border-amber-400/20 p-3 rounded-2xl">
              <span className="font-mono text-[10px] uppercase text-amber-400 block mb-1">
                Coach Pro Tip
              </span>
              <p className="text-[11px] text-[#e0ded8]">
                {data.proTip}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Full Interactive Dictionary Modal for Beginners
 */
export function BeginnerGlossaryModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [selectedTerm, setSelectedTerm] = useState<string>("progressive-overload");
  const current = FITNESS_GLOSSARY[selectedTerm] || FITNESS_GLOSSARY["set"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-[#f2e9d8] border border-[#c9ad7e]/30 text-white rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
            <BookOpen size={18} className="text-[#c9ad7e]" />
            <span>Beginner Fitness Encyclopedia & Fundamentals</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-[#8b9c8a]">
            Demystify gym terminology, training variables, and recovery science in plain English.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-3">
          {/* Term Selection Column */}
          <div className="sm:col-span-4 space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
            {Object.entries(FITNESS_GLOSSARY).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedTerm(key)}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex items-center justify-between border ${
                  selectedTerm === key
                    ? "bg-[#c9ad7e] text-black font-bold border-[#c9ad7e]"
                    : "bg-white/[0.02] border-white/10 text-[#8b9c8a] hover:text-white"
                }`}
              >
                <span>{item.term}</span>
                <ChevronRight size={12} />
              </button>
            ))}
          </div>

          {/* Detailed Explanation Column */}
          <div className="sm:col-span-8 bg-black/40 border border-white/10 rounded-2xl p-4 space-y-3">
            <div>
              <span className="text-[10px] font-mono text-[#c9ad7e] uppercase tracking-wider">
                {current.category}
              </span>
              <h4 className="text-base font-extrabold text-white">{current.term}</h4>
              <p className="text-xs text-[#8b9c8a] mt-0.5">{current.shortDefinition}</p>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-xs text-[#d1ddd0] leading-relaxed">
              {current.inDepthExplanation}
            </div>

            <div className="bg-[#c9ad7e]/10 p-2.5 rounded-xl border border-[#c9ad7e]/20 text-[11px] font-mono text-[#c9ad7e]">
              <b>Example: </b> {current.beginnerExample}
            </div>

            <div className="bg-amber-400/10 p-2.5 rounded-xl border border-amber-400/20 text-[11px] text-[#e0ded8]">
              <b className="text-amber-400">Pro Tip: </b> {current.proTip}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
