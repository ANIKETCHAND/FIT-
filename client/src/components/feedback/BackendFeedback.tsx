import { AlertTriangle, CheckCircle2, LoaderCircle, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";

type FeedbackTone = "loading" | "success" | "error";

type BackendFeedbackProps = {
  tone: FeedbackTone;
  title: string;
  detail: string;
  onRetry?: () => void;
  className?: string;
};

export function BackendFeedback({ tone, title, detail, onRetry, className = "" }: BackendFeedbackProps) {
  const Icon = tone === "loading" ? LoaderCircle : tone === "success" ? CheckCircle2 : AlertTriangle;
  const toneClass = tone === "error"
    ? "border-[#ff9c78]/35 bg-[#2a1612]/85 text-[#ffd2c0]"
    : tone === "success"
      ? "border-[#c9ad7e]/30 bg-[#10180f]/85 text-[#e9ffd0]"
      : "border-[#c9ad7e]/30 bg-[#f4ecdd]/85 text-[#d7efff]";

  return <motion.div
    initial={{ opacity: 0, y: 5 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2 }}
    className={`backend-feedback mt-3 flex items-start gap-3 border px-3 py-2.5 ${toneClass} ${className}`}
    role={tone === "error" ? "alert" : "status"}
    aria-live="polite"
  >
    <Icon className={tone === "loading" ? "mt-0.5 shrink-0 animate-spin" : "mt-0.5 shrink-0"} size={16} />
    <div className="min-w-0 flex-1">
      <b className="block font-mono text-[10px] uppercase tracking-[0.14em]">{title}</b>
      <span className="mt-0.5 block text-xs leading-5 text-inherit/75">{detail}</span>
    </div>
    {tone === "error" && onRetry && <button type="button" onClick={onRetry} className="shrink-0 border border-current/30 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] transition hover:bg-white/10 active:scale-[0.97]"><RotateCcw size={12} className="mr-1 inline-block" />Retry</button>}
  </motion.div>;
}
