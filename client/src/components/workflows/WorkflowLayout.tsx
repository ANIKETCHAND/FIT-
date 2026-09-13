/* Kinetic Anatomy Lab workflow shell: a linear instrument surface that carries a task-specific athlete scan through every routed flow. */
/* Carbon Command Deck: shared workflow chrome pairs a task-specific diagnostic strip with a quieter operational topbar. */
import type { ReactNode } from "react";
import { Activity, ArrowLeft, Bell, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { Sidebar } from "@/components/navigation/Sidebar";

import { getAthleteProfile } from "@/lib/user-store";

type WorkflowLayoutProps = { kicker?: string; title: string; detail?: string; children: ReactNode };

export function WorkflowLayout({ kicker, title, detail, children }: WorkflowLayoutProps) {
  const [, setLocation] = useLocation();
  const profile = getAthleteProfile();
  const initials = profile.name ? profile.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "AT";

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="workflow-main">
        <header className="workflow-topbar">
          <div className="workflow-topbar-left">
            <button className="back-button" onClick={() => setLocation("/overview")}>
              <ArrowLeft size={17} />Command center
            </button>
            <div className="workflow-brand" aria-label="FitTrack" onClick={() => setLocation("/overview")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              <div className="brand-logo-icon" style={{ width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={14} />
              </div>
              <strong>FIT<span>TRACK</span></strong>
            </div>
          </div>
          <div className="workflow-status">
            <span><i />Active protocol</span>
            <button className="icon-button" aria-label="Notifications" onClick={() => setLocation("/notifications")}>
              <Bell size={18} />
            </button>
            <button className="avatar-button" aria-label="Profile" onClick={() => setLocation("/profile")}>{initials}<ChevronDown size={14} /></button>
          </div>
        </header>
        <motion.section
          className="workflow-intro"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        >
          {kicker && <span className="eyebrow">{kicker}</span>}
          <h1>{title}</h1>
          {detail && <p>{detail}</p>}
        </motion.section>
        <motion.div
          className="workflow-content"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
