/* FitTrack — lightweight online/offline indicator.
   FitTrack is local-first (data lives in localStorage), so the app keeps working
   offline; this banner just tells the athlete that AI ("Rexi") and cloud sync are
   paused until the connection returns. Purely informational — no data is blocked. */
import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function NetworkStatusBanner() {
  const [offline, setOffline] = useState(
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "7px 14px",
        background: "linear-gradient(90deg, #3a2519 0%, #2a1c13 100%)",
        color: "#f4ebdb",
        borderBottom: "1px solid rgba(201,173,126,0.30)",
        fontFamily: '"Space Mono", monospace',
        fontSize: 12,
        letterSpacing: "0.02em",
        boxShadow: "0 4px 14px rgba(0,0,0,0.35)",
      }}
    >
      <WifiOff size={13} style={{ color: "#c9ad7e", flexShrink: 0 }} />
      <span>You're offline — your data is safe on this device. AI &amp; sync resume when you reconnect.</span>
    </div>
  );
}
