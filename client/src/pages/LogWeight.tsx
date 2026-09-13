/* Kinetic Anatomy Lab weight screen: a concise biometric checkpoint that visualizes trend before saving. */
import { useState } from "react";
import { ArrowDownRight, Check, Scale, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { WorkflowLayout } from "@/components/workflows/WorkflowLayout";
import { trpc } from "@/lib/trpc";
import { BackendFeedback } from "@/components/feedback/BackendFeedback";

export default function LogWeight() {
  const [, setLocation] = useLocation();
  const [weight, setWeight] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem("fittrack-calibration-settings") || "null");
      return String(s?.weightKg ?? "74.8");
    } catch {
      return "74.8";
    }
  });
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveEntry = trpc.metrics.create.useMutation({
    onMutate: () => setSaveError(null),
    onSettled: () => {
      toast.success(`Weight checkpoint ${weight} kg recorded`);
      setLocation("/overview");
    },
  });

  const save = () => {
    const parsed = Number(weight);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast.error("Enter a valid body weight before saving.");
      return;
    }

    try {
      const settings = JSON.parse(localStorage.getItem("fittrack-calibration-settings") || "null") || {
        name: "Jordan Mercer", age: 31, heightCm: 180, weightKg: 78, sex: "male", activityLevel: "moderate", goalKcal: 2840, goalProtein: 172, goalCarbs: 328, goalFat: 79
      };
      settings.weightKg = parsed;
      const bmr = Math.round(10 * settings.weightKg + 6.25 * (settings.heightCm || 180) - 5 * (settings.age || 30) + (settings.sex === "male" ? 5 : -161));
      const mult = settings.activityLevel === "light" ? 1.375 : settings.activityLevel === "active" ? 1.725 : settings.activityLevel === "very_active" ? 1.9 : 1.55;
      settings.goalKcal = Math.round(bmr * mult);
      settings.goalProtein = Math.round(parsed * 2.2);
      settings.goalFat = Math.round((settings.goalKcal * 0.25) / 9);
      settings.goalCarbs = Math.max(0, Math.round((settings.goalKcal - settings.goalProtein * 4 - settings.goalFat * 9) / 4));
      localStorage.setItem("fittrack-calibration-settings", JSON.stringify(settings));
    } catch {
      // ignore
    }

    saveEntry.mutate({ weightKg: parsed, capturedAt: new Date() });
  };

  return <WorkflowLayout title="Capture body weight"><motion.section className="workflow-grid weight-grid" variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}><div className="workflow-panel weight-input-panel"><span className="panel-label">Morning measurement</span><div className="weight-entry"><Scale size={27} /><input aria-label="Body weight in kilograms" inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value.replace(/[^0-9.]/g, ""))} /><span>kg</span></div><div className="weight-buttons"><button onClick={() => setWeight((Number(weight || 0) - .1).toFixed(1))}>− 0.1</button><button onClick={() => setWeight((Number(weight || 0) + .1).toFixed(1))}>+ 0.1</button></div><label className="checkline"><input type="checkbox" defaultChecked />Fastened state: morning, pre-fuel</label></div><aside className="workflow-panel trend-panel"><div className="trend-icon"><TrendingDown size={24} /></div><span className="panel-label">7-day direction</span><strong>−0.4 <small>kg</small></strong><p>Controlled descent. Your current rate matches the composition target.</p><div className="trend-chart">{[72, 70, 68, 69, 64, 62, 58].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div><button className="commit-button" disabled={saveEntry.isPending} onClick={save}><Check size={16} />{saveEntry.isPending ? "Saving" : "Save checkpoint"} <span>↗</span></button>{saveEntry.isPending && <BackendFeedback tone="loading" title="Secure data link" detail="Recording your biometric checkpoint." />}{saveError && <BackendFeedback tone="error" title="Checkpoint not saved" detail={saveError} onRetry={save} />}</aside></motion.section></WorkflowLayout>;
}
