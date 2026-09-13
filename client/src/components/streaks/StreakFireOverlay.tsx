/** Kinetic Pixel Fitness celebration: a short, accessible pixel-fire moment after a completed daily protocol advances the streak. */
import { useEffect, type CSSProperties } from "react";
import { Flame, Sparkles, ArrowRight } from "lucide-react";
import type { DailyStreak } from "@/lib/user-store";

export function StreakFireOverlay({ streak, onContinue }: { streak: DailyStreak; onContinue: () => void }) {
  useEffect(() => { const timer = window.setTimeout(onContinue, 3500); return () => window.clearTimeout(timer); }, [onContinue]);
  return <div className="streak-overlay" role="dialog" aria-modal="true" aria-labelledby="streak-title"><div className="streak-embers" aria-hidden="true">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ "--ember": index } as CSSProperties} />)}</div><section className="streak-console"><div className="streak-console-top"><span><i />Protocol complete</span><span>STR / ACTIVE</span></div><div className="hero-pixel-fire" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div><Flame size={27} className="streak-flame-mark" /><span className="eyebrow">Daily streak advanced</span><h2 id="streak-title">{streak.count} day flame</h2><p>You completed today’s training protocol and kept the signal alive. Return tomorrow to extend the sequence.</p><div className="streak-milestone-strip"><span><Sparkles size={15} />Continuity marker</span><b>Day {streak.count} secured</b><i><b style={{ width: `${Math.min(100, (streak.count / 7) * 100)}%` }} /></i></div><button onClick={onContinue}>Return to command center <ArrowRight size={16} /></button></section></div>;
}
