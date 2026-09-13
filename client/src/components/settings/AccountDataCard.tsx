/* FitTrack — Account & Data management card.
   Gives the athlete real control over their local account: sign out, and a
   confirmed "delete account & wipe data" flow. All FitTrack data lives in this
   browser's localStorage (scoped per user email), so deletion clears every key
   belonging to the signed-in athlete and returns them to the landing page. */
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { LogOut, Trash2, ShieldAlert, AlertTriangle } from "lucide-react";
import { getActiveUserEmail } from "@/lib/user-store";

function scopeOf(email: string): string {
  return email.replace(/[^a-z0-9]/gi, "_");
}

// Remove every localStorage entry that belongs to the signed-in athlete, plus
// the global auth flags. Session storage is cleared too so no stale flags remain.
function wipeCurrentUserData(): void {
  try {
    const email = getActiveUserEmail();
    const scope = scopeOf(email);
    const globalKeys = [
      "fittrack_auth_state",
      "fittrack_auth_provider",
      "fittrack_user_email",
      "fittrack_user_name",
      "fittrack_user_avatar",
      "fittrack_profile_configured",
      "fittrack_trigger_rexi_welcome",
      "fittrack-runtime-user-info",
      "manus-runtime-user-info",
    ];
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Anything scoped to this athlete, or the global auth/session flags.
      if (key.includes(`__${scope}`) || globalKeys.includes(key)) {
        toRemove.push(key);
      }
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
    globalKeys.forEach((k) => localStorage.removeItem(k));
    try {
      sessionStorage.clear();
    } catch {}
  } catch {}
}

export function AccountDataCard() {
  const [, setLocation] = useLocation();
  const [confirming, setConfirming] = useState(false);
  const email = getActiveUserEmail();

  const handleSignOut = () => {
    try {
      localStorage.removeItem("fittrack_auth_state");
      localStorage.removeItem("fittrack_user_email");
      localStorage.removeItem("fittrack_user_name");
      localStorage.removeItem("fittrack_user_avatar");
      localStorage.removeItem("fittrack-runtime-user-info");
      localStorage.removeItem("manus-runtime-user-info");
      localStorage.removeItem("fittrack_trigger_rexi_welcome");
      sessionStorage.removeItem("fittrack_rexi_welcomed");
      sessionStorage.removeItem("fittrack_beginner_tour_active");
    } catch {}
    toast.success("Signed out. Your data stays saved on this device.");
    setLocation("/");
  };

  const handleDelete = () => {
    wipeCurrentUserData();
    toast.success("Account and all local data deleted.");
    setLocation("/");
  };

  return (
    <div className="mt-8 mb-6 rounded-3xl border border-[rgba(220,120,120,0.28)] bg-[#1c140c] p-5 shadow-xl">
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-white/10">
        <ShieldAlert size={16} className="text-rose-400" />
        <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#f0e6d3]">
          Account &amp; Data
        </span>
      </div>

      <p className="text-[12px] leading-relaxed text-[#b3a48f] mb-4">
        Signed in as <strong className="text-[#f0e6d3]">{email}</strong>. All your
        FitTrack data is stored privately on this device. Sign out to switch
        accounts, or permanently delete this account and wipe its data.
      </p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#f0e6d3] text-xs font-mono uppercase tracking-wider transition-colors"
        >
          <LogOut size={14} />
          <span>Sign Out</span>
        </button>

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-mono uppercase tracking-wider transition-colors"
          >
            <Trash2 size={14} />
            <span>Delete Account &amp; Data</span>
          </button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] text-rose-300 font-mono">
              <AlertTriangle size={13} /> This cannot be undone.
            </span>
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono uppercase tracking-wider font-bold transition-colors"
            >
              <Trash2 size={14} />
              <span>Yes, delete everything</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-[#f0e6d3] text-xs font-mono uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
