import { useState, useEffect, type ChangeEvent } from "react";
import { Activity, ArrowRight, Calculator, Check, Dumbbell, Flame, Gauge, LoaderCircle, MapPin, Pencil, Save, Scale, Sparkles, Target, Upload, UserRound, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { WorkflowLayout } from "@/components/workflows/WorkflowLayout";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  getCalibrationSettings, 
  saveCalibrationSettings, 
  type CalibrationSettings, 
  getExperienceTier, 
  saveExperienceTier, 
  type ExperienceTier,
  markProfileConfigured,
  getAthleteProfile,
  saveAthleteProfile,
  type AthleteProfile
} from "@/lib/user-store";
import { autoSyncAthleteLocation, requestDeviceLocation } from "@/lib/location-resolver";
import { SupabaseDatabaseCard } from "@/components/settings/SupabaseDatabaseCard";
import { AccountDataCard } from "@/components/settings/AccountDataCard";
import "./CommandDeck.css";
import "./ProfileInteractions.css";

const activityOptions = [
  { value: "light" as const, label: "Light", detail: "1 to 2 sessions each week" },
  { value: "moderate" as const, label: "Moderate", detail: "3 to 4 sessions each week" },
  { value: "active" as const, label: "Active", detail: "5 to 6 sessions each week" },
  { value: "very_active" as const, label: "Very Active", detail: "Daily or twice daily training" },
];

const experienceTierOptions = [
  { id: "beginner" as const, label: "Beginner", desc: "Learning proper exercise form, guided cues and basic lifts", icon: Dumbbell, color: "text-emerald-400" },
  { id: "intermediate" as const, label: "Intermediate", desc: "Consistent training, progressive overload and volume", icon: Zap, color: "text-[#c9ad7e]" },
  { id: "advanced" as const, label: "Advanced Gym Rat", desc: "Biomechanics mastery, periodization and deep telemetry", icon: Flame, color: "text-amber-400" },
];

function calcBmr(settings: CalibrationSettings) {
  const { weightKg, heightCm, age, sex } = settings;
  if (!weightKg || !heightCm || !age) return 1750;
  if (sex === "female") {
    return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age - 161);
  }
  return Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + 5);
}

function calcTdee(settings: CalibrationSettings) {
  const bmr = calcBmr(settings);
  const multipliers = { light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  return Math.round(bmr * (multipliers[settings.activityLevel] || 1.55));
}

function computeTargets(settings: CalibrationSettings) {
  const tdee = calcTdee(settings);
  const goalProtein = Math.round(settings.weightKg * 2.0);
  const goalFat = Math.round((tdee * 0.25) / 9);
  const goalCarbs = Math.round((tdee - (goalProtein * 4 + goalFat * 9)) / 4);
  return { goalKcal: tdee, goalProtein, goalCarbs: Math.max(0, goalCarbs), goalFat: Math.max(0, goalFat) };
}

const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "FT";

export default function Settings() {
  const [, setLocation] = useLocation();
  const isOnboarding = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("onboarding") === "true";
  const [form, setForm] = useState<CalibrationSettings>(() => getCalibrationSettings());
  const [saved, setSaved] = useState(true);
  const [experienceTier, setExperienceTierState] = useState<ExperienceTier>(() => getExperienceTier());

  // Athlete Identity state
  const [athlete, setAthlete] = useState<AthleteProfile>(() => getAthleteProfile());
  const [draft, setDraft] = useState<AthleteProfile>(() => getAthleteProfile());
  const [profileOpen, setProfileOpen] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Warn before leaving/reloading the tab with unsaved calibration changes.
  useEffect(() => {
    if (saved) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [saved]);

  useEffect(() => {
    // Auto-detect and sync real device location on mount
    autoSyncAthleteLocation().then((detected) => {
      if (detected) {
        setAthlete((prev) => ({ ...prev, location: detected }));
        setDraft((prev) => ({ ...prev, location: detected }));
      }
    });

    const handleLocUpdate = (e: CustomEvent<string>) => {
      if (e.detail) {
        setAthlete((prev) => ({ ...prev, location: e.detail }));
        setDraft((prev) => ({ ...prev, location: e.detail }));
      }
    };

    window.addEventListener("fittrack_location_updated" as any, handleLocUpdate);
    return () => window.removeEventListener("fittrack_location_updated" as any, handleLocUpdate);
  }, []);

  const handleAutoDetectLocation = async () => {
    setIsLocating(true);
    try {
      const loc = await requestDeviceLocation();
      if (loc) {
        setDraft((prev) => ({ ...prev, location: loc }));
        const updated = { ...athlete, location: loc };
        saveAthleteProfile(updated);
        setAthlete(updated);
        toast.success(`Current location detected: ${loc}`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Could not detect location. Please check browser location permissions.");
    } finally {
      setIsLocating(false);
    }
  };

  const openProfileEditor = () => {
    setDraft(athlete);
    setProfileOpen(true);
  };

  const saveProfile = () => {
    const trimmedName = draft.name.trim();
    if (!trimmedName) {
      toast.error("Add an athlete name before saving the record.");
      return;
    }
    const next = { 
      ...draft, 
      name: trimmedName, 
      email: draft.email.trim(), 
      location: draft.location.trim(), 
      focus: draft.focus.trim() || "Hypertrophy & Strength" 
    };
    saveAthleteProfile(next);
    setAthlete(next);
    setForm((current) => ({ ...current, name: trimmedName }));
    setProfileOpen(false);
    toast.success("Athlete profile updated.");
  };

  const updatePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file for the profile photo.");
      return;
    }
    if (file.size > 1_500_000) {
      toast.error("Choose an image below 1.5 MB for local device storage.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft((current) => ({ ...current, photoDataUrl: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const updateBiometric = <Key extends keyof CalibrationSettings>(key: Key, value: CalibrationSettings[Key]) => {
    setSaved(false);
    setForm((current) => {
      const next = { ...current, [key]: value };
      const targets = computeTargets(next);
      return { ...next, ...targets };
    });
  };

  const handleSelectTier = (tier: ExperienceTier) => {
    setSaved(false);
    setExperienceTierState(tier);
    saveExperienceTier(tier);
    toast.info(`Experience level updated to ${tier.replace("_", " ").toUpperCase()}`);
  };

  const update = <Key extends keyof CalibrationSettings>(key: Key, value: CalibrationSettings[Key]) => {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const bmr = calcBmr(form);
  const tdee = calcTdee(form);

  const autoSetTargets = () => {
    const targets = computeTargets(form);
    setForm((current) => ({ ...current, ...targets }));
    toast.success("Daily targets calculated from your measurements and activity level.");
  };

  const save = () => { 
    saveCalibrationSettings(form); 
    saveExperienceTier(experienceTier);
    markProfileConfigured();
    setSaved(true); 
    
    if (isOnboarding) {
      toast.success("Profile calibrated successfully! Launching your Overview Dashboard...");
      setTimeout(() => {
        setLocation("/overview");
        if (experienceTier === "beginner") {
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("fittrack_start_beginner_tour"));
          }, 400);
        }
      }, 500);
    } else {
      toast.success("Settings saved successfully."); 
    }
  };

  return (
    <WorkflowLayout title="Profile">
      {isOnboarding && (
        <div className="bg-gradient-to-r from-[#c9ad7e]/20 via-[#c9ad7e]/10 to-transparent border border-[#c9ad7e]/40 rounded-2xl p-4 mb-6 flex items-center justify-between shadow-[0_0_30px_rgba(231,208,166,0.12)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c9ad7e] text-black flex items-center justify-center font-bold">
              <Sparkles size={20} />
            </div>
            <div>
              <b className="text-sm text-white block font-sans uppercase tracking-wide">Welcome to FitTrack Calibration</b>
              <p className="text-xs text-[#8b9c8a] mt-0.5">Let's calibrate your daily biometrics and nutrition targets to personalize your command center.</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-[#c9ad7e]/20 text-[#c9ad7e] px-3 py-1 rounded-full border border-[#c9ad7e]/40 font-bold">
            Step 2 of 2
          </span>
        </div>
      )}
      {/* 🌟 Athlete Record Identity Card */}
      <motion.section 
        className="profile-identity-bar mb-4" 
        initial={{ opacity: 0, y: 10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.32 }}
      >
        <div className="identity-athlete">
          <div className={`profile-orb ${athlete.photoDataUrl ? "has-photo" : ""}`}>
            {athlete.photoDataUrl ? (
              <img src={athlete.photoDataUrl} alt={`${athlete.name} profile`} />
            ) : (
              initials(athlete.name || form.name)
            )}
          </div>
          <div>
            <span className="panel-label">Athlete Record</span>
            <div className="flex items-center gap-2">
              <strong>{athlete.name || form.name}</strong>
              <span className="px-2 py-0.5 rounded-full bg-[#c9ad7e]/15 border border-[#c9ad7e]/30 text-[#c9ad7e] text-[10px] font-mono font-bold uppercase">
                {experienceTier.replace("_", " ")}
              </span>
            </div>
            <p className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#c9ad7e] font-medium">{athlete.location || "Detecting location..."}</span>
              <button
                type="button"
                onClick={handleAutoDetectLocation}
                disabled={isLocating}
                title="Detect GPS Location"
                className="p-1 rounded text-[#c9ad7e] hover:bg-[#c9ad7e]/10 transition-colors inline-flex items-center"
              >
                <MapPin size={11} className={isLocating ? "animate-pulse" : ""} />
              </button>
              · <b>{athlete.focus || "Hypertrophy & Strength"}</b>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <button 
            type="button" 
            className="profile-edit-box-btn" 
            onClick={openProfileEditor}
          >
            <Pencil size={12} />
            <span>Edit Profile</span>
          </button>
        </div>
      </motion.section>

      <motion.section className="settings-deck" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}>
        <form className="settings-command" onSubmit={(event) => { event.preventDefault(); save(); }}>
          <div className="command-deck-head">
            <div>
              <span className="deck-kicker"><i /> Athlete Profile</span>
              <h2>Personal Profile and Goals</h2>
              <p>Enter your measurements to automatically calculate daily calorie and macronutrient targets.</p>
            </div>
            <div className={`deck-status ${saved ? "is-saved" : ""}`}><i />{saved ? "Saved" : "Unsaved changes"}</div>
          </div>

          {/* 01: Personal Details */}
          <section className="settings-section">
            <div className="section-marker"><UserRound size={16} /><div><span>01</span><b>Personal Details</b></div></div>
            <div className="settings-field-grid identity-grid">
              <label className="deck-field wide"><span>Display name</span><input value={form.name} onChange={(event) => update("name", event.target.value)} placeholder="Your Name" /></label>
              <label className="deck-field"><span>Age</span><input type="number" min="14" max="99" value={form.age} onChange={(event) => updateBiometric("age", Number(event.target.value))} /></label>
              <label className="deck-field"><span>Height <em>cm</em></span><input type="number" min="120" max="250" value={form.heightCm} onChange={(event) => updateBiometric("heightCm", Number(event.target.value))} /></label>
              <label className="deck-field"><span>Weight <em>kg</em></span><input type="number" min="35" max="300" step="0.1" value={form.weightKg} onChange={(event) => updateBiometric("weightKg", Number(event.target.value))} /></label>
            </div>
            <div className="sex-control" aria-label="Biological sex">
              <span>Biological sex</span>
              <div>
                <button type="button" className={form.sex === "male" ? "selected" : ""} onClick={() => updateBiometric("sex", "male")}>Male</button>
                <button type="button" className={form.sex === "female" ? "selected" : ""} onClick={() => updateBiometric("sex", "female")}>Female</button>
              </div>
            </div>
          </section>

          {/* 02: Experience Tier */}
          <section className="settings-section">
            <div className="section-marker"><Sparkles size={16} /><div><span>02</span><b>Experience Level</b></div></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {experienceTierOptions.map((opt) => {
                const isSelected = experienceTier === opt.id;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectTier(opt.id)}
                    className={`tier-choice-card p-3 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                      isSelected ? "selected" : ""
                    }`}
                  >
                    <div className={`tier-icon-wrapper p-2 rounded-xl flex-shrink-0 mt-0.5 ${opt.color}`}>
                      <Icon size={16} />
                    </div>
                    <div>
                      <b className="tier-card-title text-xs block font-bold">{opt.label}</b>
                      <span className="tier-card-desc text-[11px] block mt-0.5">{opt.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 03: Workload Rhythm */}
          <section className="settings-section workload-section">
            <div className="section-marker"><Activity size={16} /><div><span>03</span><b>Weekly Activity Level</b></div></div>
            <div className="activity-matrix">
              {activityOptions.map((option, index) => (
                <button type="button" key={option.value} className={form.activityLevel === option.value ? "activity-choice selected" : "activity-choice"} onClick={() => updateBiometric("activityLevel", option.value)}>
                  <span>0{index + 1}</span>
                  <b>{option.label}</b>
                  <small>{option.detail}</small>
                  <i />
                </button>
              ))}
            </div>
          </section>

          {/* 04: Daily Targets */}
          <section className="settings-section target-section">
            <div className="section-marker">
              <Target size={16} />
              <div><span>04</span><b>Daily Nutrition Targets</b></div>
              <button type="button" className="recalculate-button" onClick={autoSetTargets}><Calculator size={14} />Auto Calculate</button>
            </div>
            <div className="settings-field-grid targets-grid">
              <label className="deck-field"><span>Calories <em>kcal</em></span><input type="number" min="1000" max="6000" value={form.goalKcal} onChange={(event) => update("goalKcal", Number(event.target.value))} /></label>
              <label className="deck-field"><span>Protein <em>g</em></span><input type="number" min="40" max="450" value={form.goalProtein} onChange={(event) => update("goalProtein", Number(event.target.value))} /></label>
              <label className="deck-field"><span>Carbohydrates <em>g</em></span><input type="number" min="0" max="800" value={form.goalCarbs} onChange={(event) => update("goalCarbs", Number(event.target.value))} /></label>
              <label className="deck-field"><span>Fat <em>g</em></span><input type="number" min="20" max="300" value={form.goalFat} onChange={(event) => update("goalFat", Number(event.target.value))} /></label>
            </div>
          </section>

          <div className="settings-actions">
            <button type="submit" className="save-calibration flex items-center gap-2">
              <Save size={16} />
              <span>{isOnboarding ? "Complete Calibration & Launch Dashboard →" : "Save Changes"}</span>
            </button>
          </div>
        </form>

        <aside className="calibration-rail">
          <div className="rail-panel metabolism-panel">
            <div className="rail-head"><span><Gauge size={15} />Metabolic Estimates</span><small>ESTIMATE</small></div>
            <div className="metabolism-readout">
              <div><span>Resting energy</span><strong>{bmr}<small>kcal</small></strong><em>BMR</em></div>
              <div><span>Daily expenditure</span><strong>{tdee}<small>kcal</small></strong><em>TDEE</em></div>
            </div>
            <div className="energy-rail"><i /><i /><i /><b style={{ left: `${Math.min(88, Math.max(12, ((tdee - 1700) / 2200) * 100))}%` }} /></div>
            <p><i />Calculated based on your body weight, height, age, biological sex, and weekly activity level.</p>
          </div>
          <div className="rail-panel target-stack">
            <div className="rail-head"><span><Scale size={15} />Daily Targets</span><small>DAILY</small></div>
            {[{ label: "Protein", value: form.goalProtein, unit: "g", color: "lime" }, { label: "Carbohydrates", value: form.goalCarbs, unit: "g", color: "blue" }, { label: "Fat", value: form.goalFat, unit: "g", color: "ember" }].map((item) => (
              <div className="target-readout" key={item.label}>
                <span>{item.label}</span>
                <b>{item.value}<small>{item.unit}</small></b>
                <i className={item.color} />
              </div>
            ))}
          </div>
          <div className="rail-note">
            <Check size={15} />
            <p><b>Helpful tip:</b> Update your weight whenever you experience a significant change in body mass or activity level.</p>
          </div>
        </aside>
      </motion.section>

      {/* 🚀 Supabase Cloud Database Panel */}
      <div className="mt-8 mb-6">
        <SupabaseDatabaseCard />
      </div>

      {/* Account & Data management (sign out / delete account) */}
      <AccountDataCard />

      {/* Edit Bio / Photo Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="profile-dialog">
          <DialogHeader>
            <DialogTitle>Edit Athlete Profile</DialogTitle>
            <DialogDescription>Update your display name, profile picture, location, and training focus.</DialogDescription>
          </DialogHeader>
          <form className="profile-form" onSubmit={(event) => { event.preventDefault(); saveProfile(); }}>
            <label className="profile-photo-upload">
              <div className={`profile-photo-preview ${draft.photoDataUrl ? "has-photo" : ""}`}>
                {draft.photoDataUrl ? <img src={draft.photoDataUrl} alt="Preview" /> : initials(draft.name)}
              </div>
              <span>
                <b><Upload size={14} /> Upload profile photo</b>
                <small>PNG, JPG up to 1.5MB</small>
              </span>
              <input type="file" accept="image/*" onChange={updatePhoto} />
            </label>

            <div className="profile-form-grid">
              <label>
                <span>Full Name</span>
                <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="Athlete Name" />
              </label>
              <label>
                <span>Email Address</span>
                <input value={draft.email} onChange={(event) => setDraft((current) => ({ ...current, email: event.target.value }))} placeholder="athlete@example.com" />
              </label>
              <label>
                <div className="flex items-center justify-between mb-1">
                  <span>Location</span>
                  <button
                    type="button"
                    onClick={handleAutoDetectLocation}
                    disabled={isLocating}
                    className="text-[#c9ad7e] hover:text-[#d4ff66] text-[10px] font-mono uppercase flex items-center gap-1 bg-[#c9ad7e]/10 px-2 py-0.5 rounded border border-[#c9ad7e]/30"
                  >
                    <MapPin size={11} className={isLocating ? "animate-spin" : ""} />
                    {isLocating ? "Detecting..." : "Auto-Detect GPS"}
                  </button>
                </div>
                <input value={draft.location} onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="e.g. City, State, Country" />
              </label>
              <label>
                <span>Training Focus</span>
                <input value={draft.focus} onChange={(event) => setDraft((current) => ({ ...current, focus: event.target.value }))} placeholder="e.g. Hypertrophy & Strength" />
              </label>
            </div>

            <div className="profile-dialog-actions">
              <button type="button" onClick={() => setProfileOpen(false)}>Cancel</button>
              <button type="submit">Save Athlete Profile</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </WorkflowLayout>
  );
}
