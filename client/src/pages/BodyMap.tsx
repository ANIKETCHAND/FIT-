import { useEffect, useState } from "react";
import { Activity, ArrowLeft, RotateCcw, Sparkles, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Sidebar } from "@/components/navigation/Sidebar";
import { BodyMuscleMap } from "@/components/3d/BodyMuscleMap";
import { MuscleInfo } from "@/components/3d/MuscleInfo";
import { muscleLibrary, resetAllMuscleRecovery, type MuscleId } from "@/lib/fitness-data";

export default function BodyMap() {
  const [selected, setSelected] = useState<MuscleId>("chest");
  const [, setLocation] = useLocation();
  const [libraryTick, setLibraryTick] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setLibraryTick((t) => t + 1);
    window.addEventListener("fittrack:recovery-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("fittrack:recovery-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const handleResetToFresh = () => {
    resetAllMuscleRecovery();
    toast.success("All muscle groups reset to 100% Fully Recovered");
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="dashboard-main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLocation("/overview")}
                className="icon-button flex items-center justify-center rounded-xl"
                aria-label="Back to Overview"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <span className="eyebrow flex items-center gap-1">
                  <Sparkles size={11} className="text-[#c9ad7e]" /> 3D Muscle Studio
                </span>
                <h1 className="text-2xl font-bold uppercase font-sans text-white tracking-wide">
                  Anatomy & Recovery Map
                </h1>
              </div>
            </div>
          </div>
          <div className="topbar-actions flex items-center gap-2">
            <button
              onClick={handleResetToFresh}
              className="px-3 py-1.5 bg-[#22c55e]/10 hover:bg-[#22c55e]/20 border border-[#22c55e]/30 rounded-xl text-xs font-mono text-[#22c55e] transition-colors flex items-center gap-1.5"
              title="Reset all muscles to 100% Fully Recovered"
            >
              <RefreshCw size={13} />
              <span>Reset to 100% (Fresh)</span>
            </button>
            <button
              onClick={() => setSelected("chest")}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-mono text-[#8b9c8a] hover:text-white transition-colors flex items-center gap-1.5"
            >
              <RotateCcw size={13} />
              <span>Reset Focus</span>
            </button>
          </div>
        </header>

        {/* 3D Anatomy Stage + Diagnostic Sidebar Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch min-h-[680px]">
          {/* Main 3D Interactive Canvas */}
          <motion.div
            className="lg:col-span-8 bg-[#1e130c] border border-white/10 rounded-2xl overflow-hidden relative min-h-[580px] flex flex-col"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35 }}
          >
            <BodyMuscleMap selected={selected} onSelected={setSelected} />
          </motion.div>

          {/* Diagnostic Sidebar Panel */}
          <motion.div
            className="lg:col-span-4 flex flex-col"
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
          >
            <MuscleInfo key={`${selected}-${libraryTick}`} muscle={muscleLibrary[selected]} />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
