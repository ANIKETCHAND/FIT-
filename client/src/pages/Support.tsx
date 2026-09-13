/* Carbon Command Deck: support uses an operations-console structure with direct answers, useful paths, and a copyable diagnostic trace. */
import { ArrowUpRight, BookOpen, Bug, ClipboardCheck, Compass, LifeBuoy, Mail, MessageSquareText, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { WorkflowLayout } from "@/components/workflows/WorkflowLayout";
import "./CommandDeck.css";

type Topic = "all" | "training" | "data" | "navigation";
const articles: { topic: Exclude<Topic, "all">; question: string; answer: string }[] = [
  { topic: "training", question: "How do readiness signals work?", answer: "Readiness combines the recorded training cadence, estimated recovery window, and the current volume pattern for each muscle group." },
  { topic: "data", question: "Where is my FitTrack data stored?", answer: "Your entries, preferences, workout targets, and calibration settings are stored locally in this browser." },
  { topic: "navigation", question: "How do I change a workout target?", answer: "Open Workouts, then edit the sets or reps directly on any movement card. Your revised target is saved locally." },
  { topic: "training", question: "When should I update my calibration?", answer: "Update it after a notable body-mass change, a shift in your training rhythm, or whenever you want refreshed daily macro targets." },
  { topic: "data", question: "Can I connect a wearable device?", answer: "Open Profile analytics and use the device-sync panel to simulate the tracker or smartwatch connection workflow." },
  { topic: "navigation", question: "Where can I find missed reminders?", answer: "The Notifications inbox keeps workout-reminder and milestone states together, including read and unread status." },
];

export default function Support() {
  const [, setLocation] = useLocation();
  const [topic, setTopic] = useState<Topic>("all");
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const filteredArticles = useMemo(() => {
    const result = topic === "all" ? articles : articles.filter((article) => article.topic === topic);
    setOpenIndex(0);
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);
  const copyDiagnostic = async () => {
    const trace = `FITTRACK / SUPPORT TRACE\nBuild: Performance OS\nStorage: local browser profile\nRoute: ${window.location.pathname}\nTimestamp: ${new Date().toISOString()}`;
    try { await navigator.clipboard.writeText(trace); toast("Diagnostic trace copied to clipboard"); } catch { toast("Diagnostic trace is ready — copy it from your browser console if needed"); }
  };
  return <WorkflowLayout title="Support">
    <motion.section className="support-deck" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}>
      <div className="support-knowledge"><div className="support-deck-head"><div><span className="deck-kicker"><i />Knowledge base</span><h2>Clear answers. <em>No noise.</em></h2></div><div className="support-search-status"><span><i />System nominal</span><small>LOCAL MODE</small></div></div><div className="topic-tabs" role="tablist" aria-label="Support topics">{([{ id: "all", label: "All guidance", icon: Compass }, { id: "training", label: "Training", icon: Zap }, { id: "data", label: "Data & privacy", icon: ShieldCheck }, { id: "navigation", label: "Using FitTrack", icon: BookOpen }] as const).map(({ id, label, icon: Icon }) => <button type="button" role="tab" aria-selected={topic === id} className={topic === id ? "selected" : ""} onClick={() => setTopic(id)} key={id}><Icon size={14} />{label}</button>)}</div><div className="knowledge-list">{filteredArticles.map((article, index) => <details className="knowledge-item" key={article.question} open={openIndex === index} onClick={(e) => { e.preventDefault(); setOpenIndex(openIndex === index ? null : index); }}><summary><span>0{index + 1}</span><b>{article.question}</b><i>+</i></summary><p>{article.answer}</p></details>)}</div></div>
      <aside className="support-rail"><div className="rail-panel help-route-panel"><div className="rail-head"><span><LifeBuoy size={15} />Route by intent</span><small>GUIDED</small></div><button onClick={() => setLocation("/settings")}><span><Sparkles size={16} /><b>Review calibration</b><small>Targets, rhythm &amp; macros</small></span><ArrowUpRight size={16} /></button><button onClick={() => setLocation("/notifications")}><span><ClipboardCheck size={16} /><b>Open notification inbox</b><small>Reminders &amp; milestones</small></span><ArrowUpRight size={16} /></button><button onClick={() => setLocation("/profile")}><span><Compass size={16} /><b>Inspect device status</b><small>Profile &amp; tracker simulation</small></span><ArrowUpRight size={16} /></button></div><div className="rail-panel support-contact-panel"><div className="rail-head"><span><MessageSquareText size={15} />Need a human?</span><small>SUPPORT</small></div><p>Include a short diagnostic trace so the team can identify the relevant workflow faster.</p><button className="copy-trace" onClick={copyDiagnostic}><Bug size={15} />Copy diagnostic trace</button><a href="mailto:hello@fittrack.app?subject=FitTrack%20support%20request"><Mail size={15} />Email FitTrack support <ArrowUpRight size={15} /></a></div><div className="support-privacy-note"><ShieldCheck size={15} /><div><b>Your training log stays local</b><p>FitTrack currently saves operational data in this browser.</p></div></div></aside>
    </motion.section>
  </WorkflowLayout>;
}
