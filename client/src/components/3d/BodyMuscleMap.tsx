/* FitTrack — Interactive human muscle map for the Anatomy & Recovery Map.
   Renders a clean, professional front/back anatomical body (SVG muscle paths from
   react-native-body-highlighter, MIT © 2022 ELABBASSI Hicham) as a skin-toned
   figure. Trackable muscles tint by their recovery status and are clickable —
   tapping one selects it and drives the exercise panel, exactly like the old 3D
   scene. Props match <BodyScene/> so BodyMap needs no other change. */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { getDynamicMuscleLibrary, getRecoveryStatus, type MuscleId } from "@/lib/fitness-data";
import { FRONT_OUTLINE, BACK_OUTLINE, FRONT_PARTS, BACK_PARTS, type MusclePart } from "@/lib/body-muscle-map";

const SKIN = "#dca57a";
const SKIN_LINE = "#a4693c";
const HAIR = "#2c211a";

// Map the muscle-map slugs to FitTrack's tracked MuscleIds.
const SLUG_TO_MUSCLE: Record<string, MuscleId> = {
  chest: "chest",
  deltoids: "shoulders",
  biceps: "biceps",
  triceps: "triceps",
  abs: "core",
  obliques: "core",
  "upper-back": "back",
  "lower-back": "back",
  gluteal: "glutes",
  quadriceps: "quads",
  hamstring: "hamstrings",
  calves: "calves",
  tibialis: "calves",
};

const FRONT_MUSCLES: MuscleId[] = ["shoulders", "chest", "biceps", "triceps", "core", "quads", "calves"];
const BACK_MUSCLES: MuscleId[] = ["shoulders", "back", "triceps", "glutes", "hamstrings", "calves"];

type View = "front" | "back";

export function BodyMuscleMap({
  selected,
  onSelected,
}: {
  selected: MuscleId;
  onSelected: (id: MuscleId) => void;
}) {
  const library = getDynamicMuscleLibrary();
  const [hovered, setHovered] = useState<MuscleId | null>(null);
  const [view, setView] = useState<View>(() =>
    BACK_MUSCLES.includes(selected) && !FRONT_MUSCLES.includes(selected) ? "back" : "front",
  );

  const active = library[selected];
  const activeRecovery = getRecoveryStatus(active?.score ?? 100);

  const outline = view === "front" ? FRONT_OUTLINE : BACK_OUTLINE;
  const parts = view === "front" ? FRONT_PARTS : BACK_PARTS;
  const viewBox = view === "front" ? "0 0 724 1448" : "724 0 724 1448";

  const renderPart = (part: MusclePart) => {
    const muscleId = SLUG_TO_MUSCLE[part.slug];
    const isHair = part.slug === "hair";
    const isTracked = Boolean(muscleId);
    const isActive = isTracked && (muscleId === selected || muscleId === hovered);
    const recovery = isTracked ? getRecoveryStatus(library[muscleId]?.score ?? 100) : null;

    let fill = SKIN;
    let fillOpacity = 1;
    let stroke = SKIN_LINE;
    let strokeWidth = 1.1;

    if (isHair) {
      fill = HAIR;
      stroke = HAIR;
    } else if (isTracked && recovery) {
      // Whole muscle tints faintly by recovery; the focused muscle lights up.
      fill = recovery.color;
      fillOpacity = isActive ? 0.95 : 0.34;
      stroke = isActive ? recovery.color : SKIN_LINE;
      strokeWidth = isActive ? 2.4 : 1.1;
    }

    return part.paths.map((d, i) => (
      <path
        key={`${part.slug}-${i}`}
        d={d}
        fill={fill}
        fillOpacity={fillOpacity}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        onClick={isTracked ? () => onSelected(muscleId) : undefined}
        onMouseEnter={isTracked ? () => setHovered(muscleId) : undefined}
        onMouseLeave={isTracked ? () => setHovered(null) : undefined}
        style={{ cursor: isTracked ? "pointer" : "default", transition: "fill-opacity 0.25s ease, fill 0.25s ease" }}
      >
        {isTracked && <title>{library[muscleId]?.label ?? muscleId}</title>}
      </path>
    ));
  };

  const viewMuscles = view === "front" ? FRONT_MUSCLES : BACK_MUSCLES;
  const selectMuscle = (id: MuscleId) => {
    if (FRONT_MUSCLES.includes(id) && !BACK_MUSCLES.includes(id)) setView("front");
    if (BACK_MUSCLES.includes(id) && !FRONT_MUSCLES.includes(id)) setView("back");
    onSelected(id);
  };

  const partNodes = useMemo(() => parts.map(renderPart), [parts, selected, hovered, library]);

  return (
    <div className="flex-1 w-full flex flex-col p-4 gap-3">
      {/* Header: selected muscle + live recovery status */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#8b9c8a]">
          {active?.label ?? "Muscle"} · {view === "front" ? "Front" : "Back"}
        </span>
        <span
          className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1"
          style={{ background: `${activeRecovery.color}18`, color: activeRecovery.color, borderColor: `${activeRecovery.color}44` }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: activeRecovery.color }} />
          {activeRecovery.label}
        </span>
      </div>

      {/* Figure stage */}
      <div
        className="relative flex items-center justify-center overflow-hidden rounded-xl min-h-0"
        style={{ height: "clamp(340px, 56vh, 560px)" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 40%, ${activeRecovery.color}14 0%, transparent 62%)` }}
        />
        <motion.svg
          key={view}
          viewBox={viewBox}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid meet"
          style={{ filter: "drop-shadow(0 18px 26px rgba(0,0,0,0.5))" }}
          role="img"
          aria-label={`${view} view muscle map`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: [0, -6, 0] }}
          transition={{ opacity: { duration: 0.35 }, y: { duration: 6, repeat: Infinity, ease: "easeInOut" } }}
        >
          {/* Body silhouette base */}
          <path d={outline} fill={SKIN} stroke={SKIN_LINE} strokeWidth={2} strokeLinejoin="round" />
          {/* Muscle regions */}
          {partNodes}
        </motion.svg>

        {/* Front / Back toggle */}
        <div className="absolute top-2 right-2 flex bg-black/40 rounded-lg p-0.5 backdrop-blur-sm border border-white/10">
          {(["front", "back"] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider transition-colors ${
                view === v ? "bg-[#c9ad7e] text-[#1c140c] font-bold" : "text-[#cbb9a1] hover:text-white"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Accessible muscle selector for the current view */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {viewMuscles.map((id) => {
          const m = library[id];
          const st = getRecoveryStatus(m?.score ?? 100);
          const isSel = id === selected;
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectMuscle(id)}
              aria-pressed={isSel}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono uppercase tracking-wide border transition-all flex items-center gap-1.5 ${
                isSel
                  ? "bg-[#c9ad7e] text-[#1c140c] border-[#c9ad7e] font-bold"
                  : "bg-white/5 text-[#cbb9a1] border-white/10 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />
              {m?.label ?? id}
            </button>
          );
        })}
      </div>
    </div>
  );
}
