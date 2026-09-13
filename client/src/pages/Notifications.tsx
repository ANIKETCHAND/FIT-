/** FitTrack Notification & Reminder Center: Cleaned Layout & Unified Signal-Lime Theme */
import { useMemo, useState, useEffect } from "react";
import { 
  Bell, 
  CalendarClock, 
  CheckCheck, 
  Clock3, 
  Droplets, 
  Medal, 
  Plus, 
  Settings2, 
  SlidersHorizontal, 
  Sparkles,
  Play,
  RotateCcw,
  Volume2,
  VolumeX
} from "lucide-react";
import { toast } from "sonner";
import { WorkflowLayout } from "@/components/workflows/WorkflowLayout";
import { 
  getNotifications, 
  getReminderSettings, 
  saveNotifications, 
  saveReminderSettings, 
  getHydrationReminderSettings, 
  saveHydrationReminderSettings, 
  playHydrationChime, 
  getTodayHydrationMl, 
  addHydrationMl,
  playNotificationSound,
  playAlarmSound,
  isSoundEnabled,
  toggleSoundEnabled,
  type NotificationRecord, 
  type ReminderSettings, 
  type HydrationReminderSettings,
  type WorkoutAlarmSound
} from "@/lib/user-store";

function formatNotificationTime(createdAt: string): string {
  if (!createdAt.includes("T")) return createdAt;
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Today · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (diffHours < 48) return `Yesterday · ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const intervalOptions = [
  { value: 30, label: "Every 30 min" },
  { value: 45, label: "Every 45 min" },
  { value: 60, label: "Every 1 hour" },
  { value: 90, label: "Every 1.5 hours" },
  { value: 120, label: "Every 2 hours" },
];

export default function Notifications() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>(getNotifications);
  const [workoutReminder, setWorkoutReminder] = useState<ReminderSettings>(getReminderSettings);
  const [hydrationReminder, setHydrationReminder] = useState<HydrationReminderSettings>(getHydrationReminderSettings);
  const [todayWaterMl, setTodayWaterMl] = useState<number>(getTodayHydrationMl);
  const [soundOn, setSoundOn] = useState(isSoundEnabled);

  const unread = notifications.filter((item) => !item.read).length;

  const handleToggleSound = () => {
    const next = toggleSoundEnabled();
    setSoundOn(next);
    if (next) {
      playNotificationSound("chime");
      toast.success("Sound effects enabled");
    } else {
      toast.info("Sound effects muted");
    }
  };

  const handleTestNotification = () => {
    playNotificationSound("chime");
    toast.info("🔔 Playing FitTrack notification chime");
  };

  const handleTestWorkoutAlarm = () => {
    const snd = workoutReminder.soundType || "radar_pulse";
    playAlarmSound(snd);
    toast.info(`⏰ Playing workout alarm: "${snd.replace("_", " ")}"`);
  };

  const saveWorkout = (next: ReminderSettings) => {
    setWorkoutReminder(next);
    saveReminderSettings(next);
  };

  const saveHydration = (next: HydrationReminderSettings) => {
    setHydrationReminder(next);
    saveHydrationReminderSettings(next);
  };

  const markAll = () => {
    const next = notifications.map((item) => ({ ...item, read: true }));
    setNotifications(next);
    saveNotifications(next);
    playNotificationSound("success");
    toast.success("Notification archive marked as reviewed");
  };

  const toggleDay = (day: string) => {
    const nextDays = workoutReminder.days.includes(day)
      ? workoutReminder.days.filter((item) => item !== day)
      : [...workoutReminder.days, day];
    saveWorkout({ ...workoutReminder, days: nextDays });
  };

  const handleAddWater = (ml: number) => {
    const next = addHydrationMl(ml);
    setTodayWaterMl(next);
    if (hydrationReminder.alarmSoundEnabled) {
      playHydrationChime(hydrationReminder.soundType);
    }
    toast.success(`Logged +${ml}ml water! (${(next / 1000).toFixed(2)}L today)`);
  };

  const handleTestChime = () => {
    playHydrationChime(hydrationReminder.soundType);
    toast.info(`Playing "${hydrationReminder.soundType.replace("_", " ")}" alert sound`);
  };

  // Background ticker for hydration reminder interval
  useEffect(() => {
    if (!hydrationReminder.enabled) return;

    const intervalTimer = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const currentTimeStr = `${String(currentHours).padStart(2, "0")}:${String(currentMins).padStart(2, "0")}`;

      if (currentTimeStr >= hydrationReminder.startTime && currentTimeStr <= hydrationReminder.endTime) {
        if (hydrationReminder.alarmSoundEnabled) {
          playHydrationChime(hydrationReminder.soundType);
        }
        toast.info("💧 Hydration Reminder: Time to drink a glass of water!");
      }
    }, hydrationReminder.intervalMinutes * 60 * 1000);

    return () => clearInterval(intervalTimer);
  }, [hydrationReminder]);

  // Background ticker for workout reminder alarm
  useEffect(() => {
    if (!workoutReminder.enabled) return;

    let lastFiredMinute = "";

    const checkWorkoutAlarm = () => {
      const now = new Date();
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const currentTimeStr = `${String(currentHours).padStart(2, "0")}:${String(currentMins).padStart(2, "0")}`;

      if (
        workoutReminder.days.includes(dayName) &&
        currentTimeStr === workoutReminder.time &&
        lastFiredMinute !== currentTimeStr
      ) {
        lastFiredMinute = currentTimeStr;
        if (workoutReminder.alarmSoundEnabled !== false) {
          playAlarmSound(workoutReminder.soundType || "radar_pulse");
        }
        toast.success("🏋️ Workout Reminder: It's time for your training protocol!");
      }
    };

    const workoutTimer = setInterval(checkWorkoutAlarm, 30000);
    return () => clearInterval(workoutTimer);
  }, [workoutReminder]);

  const targetMl = Math.round(hydrationReminder.targetDailyLiters * 1000);
  const hydrationPct = Math.min(100, Math.round((todayWaterMl / targetMl) * 100));

  const grouped = useMemo(
    () => ({
      new: notifications.filter((item) => !item.read),
      archive: notifications.filter((item) => item.read),
    }),
    [notifications]
  );

  return (
    <WorkflowLayout title="Notifications">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full items-start">
        {/* Left Column: Notification Stream (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#1c140c] border border-white/10 rounded-3xl p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <span className="text-[10px] font-mono text-[#8b9c8a] uppercase tracking-wider block">
                  Signal inbox
                </span>
                <h2 className="text-xl font-bold font-mono text-white mt-0.5">
                  {unread ? `${unread} update${unread > 1 ? "s" : ""}` : "Archive clear"}
                </h2>
              </div>
              <div className="flex items-center gap-1.5">
                <button 
                  type="button" 
                  onClick={handleTestNotification}
                  className="px-2.5 py-1.5 bg-[#c9ad7e]/10 hover:bg-[#c9ad7e]/20 text-[#c9ad7e] border border-[#c9ad7e]/30 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all"
                  title="Test notification sound effect"
                >
                  <Bell size={13} />
                  <span>Test Chime</span>
                </button>
                <button 
                  type="button" 
                  onClick={handleToggleSound}
                  className={`p-1.5 rounded-xl border transition-all ${
                    soundOn 
                      ? "bg-white/5 border-white/10 text-[#c9ad7e] hover:bg-white/10" 
                      : "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
                  }`}
                  title={soundOn ? "Sound effects active (click to mute)" : "Sound effects muted (click to enable)"}
                >
                  {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>
                <button 
                  type="button" 
                  onClick={markAll}
                  className="px-3 py-1.5 bg-white/5 hover:bg-[#c9ad7e]/20 text-[#8b9c8a] hover:text-[#c9ad7e] border border-white/10 rounded-xl text-xs font-mono flex items-center gap-1.5 transition-all"
                >
                  <CheckCheck size={14} />
                  <span>Mark all read</span>
                </button>
              </div>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed font-mono text-[#8b9c8a]">
              These are in-app reminders — they alert you while FitTrack is open in your browser.
            </p>

            {/* Active signals */}
            {grouped.new.length > 0 && (
              <div className="mt-4 space-y-2">
                <span className="text-[10px] font-mono text-[#c9ad7e] uppercase tracking-wider block px-1">
                  Active Signals
                </span>
                <div className="space-y-2">
                  {grouped.new.map((item) => (
                    <NotificationItem
                      key={item.id}
                      item={item}
                      onRead={() => {
                        playNotificationSound("chime");
                        const next = notifications.map((value) =>
                          value.id === item.id ? { ...value, read: true } : value
                        );
                        setNotifications(next);
                        saveNotifications(next);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Archived signals */}
            <div className="mt-5 space-y-2">
              <span className="text-[10px] font-mono text-[#8b9c8a] uppercase tracking-wider block px-1">
                Archived Signals
              </span>
              {grouped.archive.length === 0 && grouped.new.length === 0 ? (
                <div className="p-8 text-center bg-black/20 rounded-2xl border border-white/5">
                  <p className="text-sm font-semibold text-[#d6ded6] mb-1">
                    No notifications in your inbox
                  </p>
                  <span className="text-xs text-[#819084]">
                    Hydration reminders and workout milestone alerts will appear here.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {grouped.archive.map((item) => (
                    <NotificationItem key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Reminders Stack (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* --- 1. HYDRATION REMINDER & ALARM CONSOLE (SIGNAL LIME THEME) --- */}
          <div className="bg-[#1c140c] border border-[#c9ad7e]/30 rounded-3xl p-5 space-y-4 shadow-xl relative overflow-hidden">
            {/* Top Accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#c9ad7e] via-[#c9ad7e]/50 to-transparent" />

            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#c9ad7e]/15 border border-[#c9ad7e]/30 text-[#c9ad7e] flex items-center justify-center shadow-[0_0_12px_rgba(231,208,166,0.2)]">
                  <Droplets size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#c9ad7e] uppercase tracking-wider block">
                    Hydration Alarm
                  </span>
                  <h2 className="text-base font-bold text-white font-mono">
                    Drink Water Reminder
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestChime}
                className="px-2.5 py-1 bg-[#c9ad7e]/10 hover:bg-[#c9ad7e]/20 text-[#c9ad7e] border border-[#c9ad7e]/30 rounded-xl text-[11px] font-mono flex items-center gap-1 transition-all"
                title="Test Alarm Sound"
              >
                <Play size={11} />
                <span>Test</span>
              </button>
            </div>

            {/* Master Toggle */}
            <div className="flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/5">
              <div>
                <b className="text-xs text-white block">Hydration Reminders</b>
                <span className="text-[10px] font-mono text-[#8b9c8a]">Audio chime & instant alerts</span>
              </div>
              <button
                type="button"
                className={`w-10 h-6 rounded-full transition-all p-0.5 border ${
                  hydrationReminder.enabled 
                    ? "bg-[#c9ad7e] border-[#c9ad7e]" 
                    : "bg-white/10 border-white/10"
                }`}
                aria-pressed={hydrationReminder.enabled}
                onClick={() => saveHydration({ ...hydrationReminder, enabled: !hydrationReminder.enabled })}
              >
                <div 
                  className={`w-4 h-4 rounded-full bg-black transition-all ${
                    hydrationReminder.enabled ? "translate-x-4" : "translate-x-0"
                  }`} 
                />
              </button>
            </div>

            {/* Live Hydration Progress Strip */}
            <div className="bg-black/40 p-3.5 rounded-2xl border border-white/5 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#8b9c8a]">Today's Intake:</span>
                <span className="text-[#c9ad7e] font-bold">
                  {(todayWaterMl / 1000).toFixed(2)}L / {hydrationReminder.targetDailyLiters}L ({hydrationPct}%)
                </span>
              </div>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#c9ad7e] h-full rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(231,208,166,0.5)]"
                  style={{ width: `${hydrationPct}%` }}
                />
              </div>

              {/* Quick Water Log Buttons */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleAddWater(250)}
                  className="py-2 bg-white/5 hover:bg-[#c9ad7e]/20 text-white hover:text-[#c9ad7e] border border-white/10 hover:border-[#c9ad7e]/30 rounded-xl text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <Plus size={11} />
                  <span>250 ml</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWater(500)}
                  className="py-2 bg-white/5 hover:bg-[#c9ad7e]/20 text-white hover:text-[#c9ad7e] border border-white/10 hover:border-[#c9ad7e]/30 rounded-xl text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <Plus size={11} />
                  <span>500 ml</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddWater(1000)}
                  className="py-2 bg-white/5 hover:bg-[#c9ad7e]/20 text-white hover:text-[#c9ad7e] border border-white/10 hover:border-[#c9ad7e]/30 rounded-xl text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition-all"
                >
                  <Plus size={11} />
                  <span>1.0 L</span>
                </button>
              </div>
            </div>

            {/* Interval Setting */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-[#8b9c8a] block">
                <Clock3 size={13} className="inline mr-1 text-[#c9ad7e]" />
                Reminder Frequency
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {intervalOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={!hydrationReminder.enabled}
                    onClick={() => saveHydration({ ...hydrationReminder, intervalMinutes: opt.value })}
                    className={`py-2 px-2 rounded-xl text-[10px] font-mono text-center transition-all border ${
                      hydrationReminder.intervalMinutes === opt.value
                        ? "bg-[#c9ad7e] text-black font-bold border-[#c9ad7e] shadow-[0_0_10px_rgba(231,208,166,0.3)]"
                        : "bg-white/[0.03] border-white/10 text-[#8b9c8a] hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Window Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#8b9c8a] block">Active From</span>
                <input
                  type="time"
                  value={hydrationReminder.startTime}
                  disabled={!hydrationReminder.enabled}
                  onChange={(e) => saveHydration({ ...hydrationReminder, startTime: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-[#c9ad7e]/50"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#8b9c8a] block">Active Until</span>
                <input
                  type="time"
                  value={hydrationReminder.endTime}
                  disabled={!hydrationReminder.enabled}
                  onChange={(e) => saveHydration({ ...hydrationReminder, endTime: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-[#c9ad7e]/50"
                />
              </div>
            </div>

            {/* Sound Selector & Target Goal */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#8b9c8a] block">Alarm Sound</label>
                <select
                  value={hydrationReminder.soundType}
                  disabled={!hydrationReminder.enabled}
                  onChange={(e) => saveHydration({ ...hydrationReminder, soundType: e.target.value as any })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none font-mono focus:border-[#c9ad7e]/50"
                >
                  <option value="water_droplet">Water Droplet</option>
                  <option value="gentle_bell">Gentle Bell</option>
                  <option value="digital_beep">Digital Beep</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#8b9c8a] block">Daily Target (L)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="8.0"
                  value={hydrationReminder.targetDailyLiters}
                  disabled={!hydrationReminder.enabled}
                  onChange={(e) => saveHydration({ ...hydrationReminder, targetDailyLiters: Number(e.target.value) || 3.0 })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1 text-xs text-white font-mono outline-none focus:border-[#c9ad7e]/50"
                />
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 bg-[#c9ad7e] hover:bg-[#b0f028] text-black font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(231,208,166,0.3)]"
              onClick={() => toast.success("Hydration reminder settings saved locally!")}
            >
              Save Hydration Alarm
            </button>
          </div>

          {/* --- 2. WORKOUT REMINDER CONSOLE (CLEAN & NON-OVERLAPPING) --- */}
          <div className="bg-[#1c140c] border border-white/10 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-white/5 border border-white/10 text-[#c9ad7e] flex items-center justify-center">
                  <CalendarClock size={18} />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-[#8b9c8a] uppercase tracking-wider block">
                    Workout reminder
                  </span>
                  <h2 className="text-base font-bold text-white font-mono">
                    Set the window
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={handleTestWorkoutAlarm}
                className="px-2.5 py-1 bg-[#c9ad7e]/10 hover:bg-[#c9ad7e]/20 text-[#c9ad7e] border border-[#c9ad7e]/30 rounded-xl text-[11px] font-mono flex items-center gap-1 transition-all"
                title="Test Workout Alarm Sound"
              >
                <Play size={11} />
                <span>Test</span>
              </button>
            </div>

            <div className="flex items-center justify-between bg-black/30 p-3 rounded-2xl border border-white/5">
              <div>
                <b className="text-xs text-white block">Reminder active</b>
                <span className="text-[10px] font-mono text-[#8b9c8a]">Local device preference</span>
              </div>
              <button
                type="button"
                className={`w-10 h-6 rounded-full transition-all p-0.5 border ${
                  workoutReminder.enabled 
                    ? "bg-[#c9ad7e] border-[#c9ad7e]" 
                    : "bg-white/10 border-white/10"
                }`}
                aria-pressed={workoutReminder.enabled}
                onClick={() => saveWorkout({ ...workoutReminder, enabled: !workoutReminder.enabled })}
              >
                <div 
                  className={`w-4 h-4 rounded-full bg-black transition-all ${
                    workoutReminder.enabled ? "translate-x-4" : "translate-x-0"
                  }`} 
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#8b9c8a] block">
                  <Clock3 size={12} className="inline mr-1 text-[#c9ad7e]" />
                  Preferred time
                </span>
                <input
                  type="time"
                  value={workoutReminder.time}
                  disabled={!workoutReminder.enabled}
                  onChange={(event) => saveWorkout({ ...workoutReminder, time: event.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-[#c9ad7e]/50"
                />
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-[#8b9c8a] block">
                  Alarm Sound
                </span>
                <select
                  value={workoutReminder.soundType || "radar_pulse"}
                  disabled={!workoutReminder.enabled}
                  onChange={(e) => saveWorkout({ ...workoutReminder, soundType: e.target.value as WorkoutAlarmSound })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white outline-none font-mono focus:border-[#c9ad7e]/50"
                >
                  <option value="radar_pulse">Radar Pulse</option>
                  <option value="digital_alarm">Digital Alarm</option>
                  <option value="boxing_gong">Boxing Gong</option>
                  <option value="kinetic_chime">Kinetic Chime</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-[11px] font-mono text-[#8b9c8a] block">
                <CalendarClock size={13} className="inline mr-1 text-[#c9ad7e]" />
                Training days
              </span>
              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    disabled={!workoutReminder.enabled}
                    className={`py-1.5 rounded-lg text-[10px] font-mono transition-all border ${
                      workoutReminder.days.includes(day)
                        ? "bg-[#c9ad7e] text-black font-bold border-[#c9ad7e]"
                        : "bg-white/[0.03] border-white/10 text-[#8b9c8a] hover:text-white"
                    }`}
                    onClick={() => toggleDay(day)}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2.5 bg-white/5 hover:bg-[#c9ad7e]/15 text-white hover:text-[#c9ad7e] rounded-xl text-xs font-mono border border-white/10 hover:border-[#c9ad7e]/30 transition-all flex items-center justify-center gap-1.5 mt-2 font-bold uppercase tracking-wider"
              onClick={() => {
                playNotificationSound("success");
                toast.success("Workout reminder and alarm saved to this device");
              }}
            >
              <SlidersHorizontal size={14} />
              <span>Save workout protocol</span>
            </button>
          </div>
        </div>
      </div>
    </WorkflowLayout>
  );
}

function NotificationItem({ item, onRead }: { item: NotificationRecord; onRead?: () => void }) {
  const Icon = item.kind === "milestone" ? Medal : item.kind === "reminder" ? CalendarClock : Bell;
  return (
    <article 
      className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 relative ${
        item.read 
          ? "bg-[#1c140c]/60 border-white/5 opacity-70" 
          : "bg-[#1c140c] border-[#c9ad7e]/30 hover:border-[#c9ad7e]/60 cursor-pointer shadow-lg"
      }`} 
      onClick={onRead}
    >
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
        item.read 
          ? "bg-white/5 border-white/10 text-[#8b9c8a]" 
          : "bg-[#c9ad7e]/15 border-[#c9ad7e]/30 text-[#c9ad7e]"
      }`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-mono text-[#8b9c8a] block">
          {item.kind === "milestone"
            ? "Performance milestone"
            : item.kind === "reminder"
            ? "Workout reminder"
            : "System signal"}{" "}
          · {formatNotificationTime(item.createdAt)}
        </span>
        <h3 className="text-sm font-bold text-white mt-0.5 truncate">{item.title}</h3>
        <p className="text-xs text-[#a0aba0] mt-0.5 leading-relaxed">{item.detail}</p>
      </div>
      {!item.read && (
        <span className="w-2 h-2 rounded-full bg-[#c9ad7e] shadow-[0_0_8px_#c9ad7e] flex-shrink-0 mt-1" />
      )}
    </article>
  );
}
