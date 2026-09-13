/* Kinetic Anatomy Lab: athlete identity remains personal and editable while analytics read as calibrated training instruments. */
import { Activity, ArrowUpRight, Bell, CalendarDays, Check, ChevronDown, CircleCheck, Clock3, Dumbbell, Footprints, Layers3, LoaderCircle, MapPin, Pencil, Smartphone, Sparkles, Timer, Upload, Watch } from "lucide-react";
import { motion } from "framer-motion";
import { type ChangeEvent, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type AthleteProfile, type ConnectedDevice, getAthleteProfile, getConnectedDevices, saveAthleteProfile, saveConnectedDevices, getScopedKey, getExperienceTier, saveExperienceTier, markProfileConfigured } from "@/lib/user-store";
import { GithubContributionGraph } from "@/components/profile/GithubContributionGraph";
import "./ProfileInteractions.css";

function getWorkoutLogs(): { completedAt?: string; date?: string; startedAt?: string; focus?: string; movementCount?: number; durationSeconds?: number }[] {
  try {
    const a = JSON.parse(localStorage.getItem(getScopedKey("fittrack_workout_logs")) || "[]");
    const b = JSON.parse(localStorage.getItem("fittrack_workout_logs") || "[]");
    const c = JSON.parse(localStorage.getItem(getScopedKey("fittrack_workout_history")) || "[]");
    const d = JSON.parse(localStorage.getItem("fittrack_workout_history") || "[]");
    const merged = [...a, ...b, ...c, ...d];
    return Array.from(new Map(merged.map((m) => [JSON.stringify(m), m])).values());
  } catch { return []; }
}
function getGpsSessions(): { startedAt?: string; completedAt?: string; endedAt?: string; date?: string; distanceMeters?: number; durationSeconds?: number }[] {
  try {
    const a = JSON.parse(localStorage.getItem(getScopedKey("fittrack_gps_sessions")) || "[]");
    const b = JSON.parse(localStorage.getItem("fittrack_gps_sessions") || "[]");
    const merged = [...a, ...b];
    return Array.from(new Map(merged.map((m) => [JSON.stringify(m), m])).values());
  } catch { return []; }
}
function getSessions(): { completedAt?: string; startedAt?: string; date?: string; durationSeconds?: number; mode?: string; category?: string; focus?: string }[] {
  try {
    const a = JSON.parse(localStorage.getItem(getScopedKey("fittrack_sessions")) || "[]");
    const b = JSON.parse(localStorage.getItem("fittrack_sessions") || "[]");
    const merged = [...a, ...b];
    return Array.from(new Map(merged.map((m) => [JSON.stringify(m), m])).values());
  } catch { return []; }
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const now = new Date();
const formatPeriod = (days: number) => {
  const start = new Date(now.getTime() - days * 86400000);
  const m1 = MONTH_NAMES[start.getMonth()];
  const y1 = start.getFullYear();
  const m2 = MONTH_NAMES[now.getMonth()];
  const y2 = now.getFullYear();
  return `${m1} ${y1} — ${m2} ${y2}`;
};

const rangeOptions = {
  "12m": { label: "Last 12 months", period: formatPeriod(365), days: 365, weeks: 52 },
  "6m": { label: "Last 6 months", period: formatPeriod(180), days: 180, weeks: 26 },
  "90d": { label: "Last 90 days", period: formatPeriod(90), days: 90, weeks: 13 },
  "30d": { label: "Last 30 days", period: formatPeriod(30), days: 30, weeks: 5 },
} as const;
type RangeKey = keyof typeof rangeOptions;

const deviceCandidates: ConnectedDevice[] = [
  { id: "tempo-watch-s", name: "Tempo Watch S", detail: "GPS · recovery · activity capture", kind: "watch" },
  { id: "stride-sense-mini", name: "Stride Sense Mini", detail: "Pace · distance · cadence", kind: "band" },
  { id: "core-hr-strap", name: "Core HR Strap", detail: "Heart rate · training zones", kind: "band" },
];

const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "FT";
const deviceIcon = (kind: ConnectedDevice["kind"]) => kind === "watch" ? Watch : kind === "log" ? Dumbbell : Smartphone;

export default function Profile() {
  const [, setLocation] = useLocation();
  const [range, setRange] = useState<RangeKey>("12m");
  const [athlete, setAthlete] = useState<AthleteProfile>(() => getAthleteProfile());
  const [draft, setDraft] = useState<AthleteProfile>(() => getAthleteProfile());
  const [devices, setDevices] = useState<ConnectedDevice[]>(() => getConnectedDevices());
  const [profileOpen, setProfileOpen] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const availableDevices = useMemo(() => deviceCandidates.filter((candidate) => !devices.some((device) => device.id === candidate.id)), [devices]);

  // Real session logs from localStorage
  const realWorkoutLogs = useMemo(() => getWorkoutLogs(), []);
  const realGpsSessions = useMemo(() => getGpsSessions(), []);
  const realSessions = useMemo(() => getSessions(), []);

  // Filter sessions based on active range
  const filteredWorkouts = useMemo(() => {
    const cutoff = Date.now() - rangeOptions[range].days * 86400000;
    return realWorkoutLogs.filter((w) => {
      const rawDate = w.completedAt || w.startedAt || w.date;
      if (!rawDate) return true;
      const t = new Date(rawDate).getTime();
      return isNaN(t) || t >= cutoff;
    });
  }, [realWorkoutLogs, range]);

  const filteredGps = useMemo(() => {
    const cutoff = Date.now() - rangeOptions[range].days * 86400000;
    return realGpsSessions.filter((g) => {
      const rawDate = g.startedAt || g.endedAt || g.completedAt || g.date;
      if (!rawDate) return true;
      const t = new Date(rawDate).getTime();
      return isNaN(t) || t >= cutoff;
    });
  }, [realGpsSessions, range]);

  const filteredSessions = useMemo(() => {
    const cutoff = Date.now() - rangeOptions[range].days * 86400000;
    return realSessions.filter((s) => {
      const rawDate = s.startedAt || s.completedAt || s.date;
      if (!rawDate) return true;
      const t = new Date(rawDate).getTime();
      return isNaN(t) || t >= cutoff;
    });
  }, [realSessions, range]);

  const totalSessionCount = filteredWorkouts.length + filteredGps.length + filteredSessions.length;

  const totalDistanceKm = useMemo(() => {
    const meters = filteredGps.reduce((sum, g) => sum + (Number(g.distanceMeters) || 0), 0);
    return (meters / 1000).toFixed(1);
  }, [filteredGps]);

  const totalTimeUnderLoad = useMemo(() => {
    let totalSec = 0;
    filteredGps.forEach((g) => { totalSec += g.durationSeconds || 0; });
    filteredSessions.forEach((s) => { totalSec += s.durationSeconds || 0; });
    filteredWorkouts.forEach((w) => {
      totalSec += w.durationSeconds || (w.movementCount ? w.movementCount * 360 : 1800);
    });
    if (totalSec === 0) return "0h 00m";
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }, [filteredWorkouts, filteredGps, filteredSessions]);

  const movementClassesCount = useMemo(() => {
    const classes = new Set<string>();
    filteredWorkouts.forEach((w) => { if (w.focus) classes.add(w.focus); });
    if (filteredGps.length > 0) classes.add("Cardio / GPS");
    filteredSessions.forEach((s) => {
      const tag = s.mode || s.category || s.focus;
      if (tag) classes.add(tag);
    });
    return Math.max(totalSessionCount > 0 ? 1 : 0, classes.size);
  }, [filteredWorkouts, filteredGps, filteredSessions, totalSessionCount]);

  const avgDistancePerEntry = useMemo(() => {
    if (filteredGps.length === 0) return "0.0";
    const meters = filteredGps.reduce((sum, g) => sum + (Number(g.distanceMeters) || 0), 0);
    return (meters / 1000 / filteredGps.length).toFixed(1);
  }, [filteredGps]);

  const avgSessionCadence = useMemo(() => {
    if (totalSessionCount === 0) return "0m";
    let totalSec = 0;
    filteredGps.forEach((g) => { totalSec += g.durationSeconds || 0; });
    filteredSessions.forEach((s) => { totalSec += s.durationSeconds || 0; });
    filteredWorkouts.forEach((w) => {
      totalSec += w.durationSeconds || (w.movementCount ? w.movementCount * 360 : 1800);
    });
    const avgMin = Math.max(1, Math.round(totalSec / 60 / totalSessionCount));
    return `${avgMin}m`;
  }, [totalSessionCount, filteredWorkouts, filteredGps, filteredSessions]);

  const summaryMetrics = useMemo(() => [
    { label: "Logged sessions", value: String(totalSessionCount), detail: "entries in the ledger", icon: Activity, tone: "lime", size: "standard" },
    { label: "Distance captured", value: totalDistanceKm, unit: "km", detail: "ground covered", icon: MapPin, tone: "blue", size: "standard" },
    { label: "Time under load", value: totalTimeUnderLoad, detail: "clocked in motion", icon: Clock3, tone: "bone", size: "standard" },
    { label: "Movement classes", value: String(movementClassesCount), detail: "disciplines detected", icon: Layers3, tone: "bone", size: "standard" },
    { label: "Distance per entry", value: avgDistancePerEntry, unit: "km", detail: "rolling average", icon: Footprints, tone: "blue", size: "standard" },
    { label: "Session cadence", value: avgSessionCadence, detail: "average load window", icon: Timer, tone: "lime", size: "standard" },
    { label: "Active sources", value: String(Math.max(1, devices.length + 1)), detail: "synchronised inputs", icon: Smartphone, tone: "bone", size: "narrow" },
  ], [totalSessionCount, totalDistanceKm, totalTimeUnderLoad, movementClassesCount, avgDistancePerEntry, avgSessionCadence, devices]);

  const dynamicActivityTypes = useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    filteredWorkouts.forEach((w) => {
      const focusName = w.focus || "Strength";
      const cat = focusName.toLowerCase().includes("cardio") || focusName.toLowerCase().includes("endurance") ? "Conditioning" : "Strength";
      counts[cat] = (counts[cat] || 0) + 1;
      total++;
    });

    filteredGps.forEach(() => {
      counts["GPS Activity"] = (counts["GPS Activity"] || 0) + 1;
      total++;
    });

    filteredSessions.forEach((s: any) => {
      const cat = s.category || s.mode || s.focus || "Training";
      counts[cat] = (counts[cat] || 0) + 1;
      total++;
    });

    if (total === 0) return [];

    const palette = ["#c9ad7e", "#c9ad7e", "#6a879b", "#c8d2c5", "#536b78"];
    let idx = 0;
    return Object.entries(counts).map(([label, count]) => {
      const val = Math.round((count / total) * 100);
      const color = palette[idx % palette.length];
      idx++;
      return { label, value: val, color };
    });
  }, [filteredWorkouts, filteredGps, filteredSessions]);

  let offset = 0;

  const openProfileEditor = () => { setDraft(athlete); setProfileOpen(true); };
  const saveProfile = () => { const trimmedName = draft.name.trim(); if (!trimmedName) { toast.error("Add an athlete name before saving the record."); return; } const next = { ...draft, name: trimmedName, email: draft.email.trim(), location: draft.location.trim(), focus: draft.focus.trim() || "Focused strength protocol" }; saveAthleteProfile(next); markProfileConfigured(next.email); setAthlete(next); setProfileOpen(false); toast.success("Athlete record updated on this device."); };
  const updatePhoto = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/")) { toast.error("Choose an image file for the profile photo."); return; } if (file.size > 1_500_000) { toast.error("Choose an image below 1.5 MB for local device storage."); return; } const reader = new FileReader(); reader.onload = () => setDraft((current) => ({ ...current, photoDataUrl: String(reader.result) })); reader.readAsDataURL(file); };
  const simulateConnection = (candidate: ConnectedDevice) => { setConnecting(candidate.id); window.setTimeout(() => { const next = [...devices, candidate]; saveConnectedDevices(next); setDevices(next); setConnecting(null); setDeviceOpen(false); toast.success(`${candidate.name} connected to this FitTrack profile.`); }, 900); };

  return <div className="app-shell profile-shell">
    <Sidebar />
    <main className="profile-main">
      <header className="profile-topbar">
        <div className="profile-heading"><div className="header-wordmark"><div className="brand-logo-icon" style={{ width: 26, height: 26, marginRight: 6, display: "flex", alignItems: "center", justifyContent: "center" }}><Activity size={15} /></div><strong>FIT<span>TRACK</span></strong></div><div><span className="eyebrow">Activity & Contributions</span><h1>{athlete.name.split(" ")[0]}'s <em>contribution ledger.</em></h1></div></div>
        <div className="profile-top-actions"><button className="icon-button" aria-label="Notifications" onClick={() => setLocation("/notifications")}><Bell size={19} /><b /></button><button className="avatar-button profile-avatar" aria-label="Open athlete profile" onClick={() => setLocation("/settings")}>{athlete.photoDataUrl ? <img src={athlete.photoDataUrl} alt="" /> : initials(athlete.name)}<ChevronDown size={14} /></button></div>
      </header>

      <motion.section className="profile-identity-bar" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .32 }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#c9ad7e]/10 border border-[#c9ad7e]/30 flex items-center justify-center text-[#c9ad7e]">
            <CalendarDays size={18} />
          </div>
          <div>
            <span className="panel-label">Activity Ledger</span>
            <div className="flex items-center gap-2">
              <strong className="text-sm text-white font-mono">{rangeOptions[range].period}</strong>
              <span className="px-2 py-0.5 rounded-full bg-[#c9ad7e]/15 border border-[#c9ad7e]/30 text-[#c9ad7e] text-[10px] font-mono font-bold uppercase">
                {rangeOptions[range].label}
              </span>
            </div>
          </div>
        </div>
        <label className="profile-range profile-range-control"><CalendarDays size={14} /><span className="sr-only">Contribution ledger period</span><select aria-label="Contribution ledger period" value={range} onChange={(event) => setRange(event.target.value as RangeKey)}>{Object.entries(rangeOptions).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}</select><ChevronDown size={13} /></label>
      </motion.section>

      <motion.section className="profile-metric-grid" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: .035 } } }}>{summaryMetrics.map(({ label, value, unit, icon: Icon, tone, size }) => <motion.article key={label} className={`profile-metric metric-${tone} metric-${size}`} variants={{ hidden: { opacity: 0, y: 9 }, visible: { opacity: 1, y: 0 } }}><Icon size={16} /><span>{label}</span><strong>{value}{unit && <small>{unit}</small>}</strong></motion.article>)}</motion.section>

      <motion.section className="profile-contribution-wrapper" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .12 }}>
        <GithubContributionGraph />
      </motion.section>

      <section className="profile-analysis-grid">
        <motion.article className="profile-panel types-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .18 }}>
          <div className="profile-panel-head"><div><span className="panel-label">Movement mix</span><h2>Activity types</h2></div><Sparkles size={16} /></div>
          {dynamicActivityTypes.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", color: "#819084" }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: 600, fontSize: "14px", fontFamily: '"Plus Jakarta Sans", sans-serif', color: "var(--card-foreground)" }}>No activities recorded yet</p>
              <span style={{ fontSize: "12px" }}>Complete a workout or GPS session to generate activity breakdown telemetry.</span>
            </div>
          ) : (
            <>
              <div className="activity-donut"><svg viewBox="0 0 42 42" role="img" aria-label="Activity type breakdown">{dynamicActivityTypes.map((type) => { const currentOffset = offset; offset += type.value; return <circle key={type.label} cx="21" cy="21" r="15.9155" fill="transparent" stroke={type.color} strokeWidth="5" strokeDasharray={`${type.value} ${100 - type.value}`} strokeDashoffset={-currentOffset} />; })}</svg><div><strong>{totalSessionCount}</strong><span>activities</span></div></div>
              <div className="type-legend">{dynamicActivityTypes.map((type) => <div key={type.label}><i style={{ background: type.color }} /><span>{type.label}</span><b>{type.value}%</b></div>)}</div>
            </>
          )}
        </motion.article>

        <motion.article className="profile-panel device-panel" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .22 }}>
          <div className="profile-panel-head"><div><span className="panel-label">Input sources</span><h2>Device sync</h2></div><button onClick={() => setDeviceOpen(true)}><ArrowUpRight size={15} /> Manage</button></div>
          {devices.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "#819084" }}>
              <p style={{ margin: "0 0 6px 0", fontWeight: 600, fontSize: "13px", fontFamily: '"Plus Jakarta Sans", sans-serif', color: "var(--card-foreground)" }}>No hardware devices connected</p>
              <span style={{ fontSize: "11px" }}>Click Manage to pair a smartwatch, fitness band, or activity tracker.</span>
            </div>
          ) : (
            devices.map((device) => { const Icon = deviceIcon(device.kind); return <div className="device-row" key={device.id}><div className="device-symbol"><Icon size={18} /></div><div><strong>{device.name}</strong><span>{device.detail}</span></div><b><i /> {device.kind === "log" ? "synced" : "active"}</b></div>; })
          )}
        </motion.article>
      </section>
    </main>

    <Dialog open={profileOpen} onOpenChange={setProfileOpen}><DialogContent className="profile-dialog" showCloseButton><DialogHeader><span className="panel-label">Identity console</span><DialogTitle>Edit athlete record</DialogTitle><DialogDescription>These values and your profile photo are saved only in this browser.</DialogDescription></DialogHeader><form className="profile-form" onSubmit={(event) => { event.preventDefault(); saveProfile(); }}><label className="profile-photo-upload"><span className={`profile-photo-preview ${draft.photoDataUrl ? "has-photo" : ""}`}>{draft.photoDataUrl ? <img src={draft.photoDataUrl} alt="Selected profile preview" /> : initials(draft.name)}</span><span><b><Upload size={14} /> Update profile photo</b><small>PNG or JPG · up to 1.5 MB</small></span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={updatePhoto} /></label><div className="profile-form-grid"><label>Full name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required /></label><label>Email address<input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /></label><label>Location<input value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label><label>Training focus<input value={draft.focus} onChange={(event) => setDraft({ ...draft, focus: event.target.value })} /></label><label>Experience level<select value={getExperienceTier()} onChange={(e) => { saveExperienceTier(e.target.value as any); toast.info(`Experience updated to ${e.target.value.replace("_", " ").toUpperCase()}`); }}><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced Gym Rat</option></select></label></div><div className="profile-dialog-actions"><button type="button" onClick={() => setProfileOpen(false)}>Cancel</button><button type="submit">Save profile <Check size={14} /></button></div></form></DialogContent></Dialog>

    <Dialog open={deviceOpen} onOpenChange={setDeviceOpen}><DialogContent className="profile-dialog device-dialog" showCloseButton><DialogHeader><span className="panel-label">Input source console</span><DialogTitle>Connect a device</DialogTitle><DialogDescription>Choose a device to simulate a local FitTrack connection. No real pairing is performed.</DialogDescription></DialogHeader><div className="device-chooser">{availableDevices.length ? availableDevices.map((candidate) => { const Icon = deviceIcon(candidate.kind); const isConnecting = connecting === candidate.id; return <button key={candidate.id} className="device-choice" disabled={Boolean(connecting)} onClick={() => simulateConnection(candidate)}><span className="device-choice-icon"><Icon size={19} /></span><span><b>{candidate.name}</b><small>{candidate.detail}</small></span>{isConnecting ? <LoaderCircle className="device-loader" size={17} /> : <span className="device-connect">Connect <ArrowUpRight size={14} /></span>}</button>; }) : <div className="device-empty"><Check size={18} /><p>All available simulated sources are connected.</p></div>}</div></DialogContent></Dialog>
  </div>;
}
