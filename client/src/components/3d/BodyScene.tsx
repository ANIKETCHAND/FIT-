/**
 * Kinetic Anatomy Lab: 3D Body Scene & Anatomy Visualization
 * Consolidates BodyScene, HumanBody, Muscle, and BodyControls into an integrated Three.js module.
 */
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Sparkles, Edges, Html, useGLTF } from "@react-three/drei";
import { useMemo, useRef, useState, useEffect, Suspense } from "react";
import * as THREE from "three";
import { useReducedMotion } from "framer-motion";
import { Maximize2, RotateCcw, Rotate3D, ScanFace, ScanLine, ScanSearch } from "lucide-react";
import { type MuscleId, muscleLibrary, getRecoveryStatus } from "@/lib/fitness-data";
import { useIsMobile } from "@/hooks/useMobile";

// =============================================================================
// 1. BODY CONTROLS
// =============================================================================

export type BodyView = "front" | "back" | "side";

type BodyControlsProps = {
  view: BodyView;
  autoRotate: boolean;
  onView: (view: BodyView) => void;
  onReset: () => void;
  onToggleRotate: () => void;
};

export function BodyControls({ view, autoRotate, onView, onReset, onToggleRotate }: BodyControlsProps) {
  return (
    <div className="body-controls" aria-label="Body viewer controls">
      <div className="view-picker" role="group" aria-label="Camera view">
        <button className={view === "front" ? "active" : ""} onClick={() => onView("front")} aria-pressed={view === "front"}>
          <ScanFace size={15} /><span>Front</span>
        </button>
        <button className={view === "back" ? "active" : ""} onClick={() => onView("back")} aria-pressed={view === "back"}>
          <ScanLine size={15} /><span>Back</span>
        </button>
        <button className={view === "side" ? "active" : ""} onClick={() => onView("side")} aria-pressed={view === "side"}>
          <ScanSearch size={15} /><span>Side</span>
        </button>
      </div>
      <div className="view-actions">
        <button className={autoRotate ? "active-icon" : ""} onClick={onToggleRotate} aria-label="Toggle automatic rotation" aria-pressed={autoRotate}>
          <Rotate3D size={17} />
        </button>
        <button onClick={onReset} aria-label="Reset body rotation">
          <RotateCcw size={17} />
        </button>
        <button className="desktop-only" onClick={() => document.documentElement.requestFullscreen?.()} aria-label="Enter fullscreen">
          <Maximize2 size={16} />
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// 2. ANATOMICAL MUSCLE SHAPES & GEOMETRIES
// =============================================================================

export type MuscleShape = "sphere" | "capsule" | "box";

export type MuscleProps = {
  id: MuscleId;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale: [number, number, number];
  shape?: MuscleShape;
  hovered: boolean;
  selected: boolean;
  onHover: (id: MuscleId | null) => void;
  onSelect: (id: MuscleId) => void;
};

/// 3D Geometry Curvature Modifier
function curveGeometry(
  geom: THREE.BufferGeometry,
  curveFn: (x: number, y: number, z: number) => { x?: number; y?: number; z?: number }
): THREE.BufferGeometry {
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const m = curveFn(x, y, z);
    if (m.x !== undefined) pos.setX(i, m.x);
    if (m.y !== undefined) pos.setY(i, m.y);
    if (m.z !== undefined) pos.setZ(i, m.z);
  }
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

// 1. ATHLETIC HEAD WITH HAIR SILHOUETTE, JAWLINE & CHIN
function createAthleticHeadShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.50);
  s.bezierCurveTo(0.22, 0.50, 0.40, 0.42, 0.44, 0.24); // hair side
  s.bezierCurveTo(0.48, 0.18, 0.48, 0.04, 0.42, -0.02); // ear notch
  s.bezierCurveTo(0.38, -0.16, 0.26, -0.36, 0.14, -0.48); // jawline
  s.bezierCurveTo(0.08, -0.52, -0.08, -0.52, -0.14, -0.48); // chin
  s.bezierCurveTo(-0.26, -0.36, -0.38, -0.16, -0.42, -0.02); // left jawline
  s.bezierCurveTo(-0.48, 0.04, -0.48, 0.18, -0.44, 0.24); // left ear
  s.bezierCurveTo(-0.40, 0.42, -0.22, 0.50, 0, 0.50); // left hair
  return s;
}

// 2. ANATOMICAL FOREARM
function createForearmShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.16, 0.48); // elbow crease
  s.lineTo(0.16, 0.48);
  s.bezierCurveTo(0.24, 0.22, 0.22, -0.12, 0.11, -0.46); // lateral sweep (brachioradialis)
  s.lineTo(-0.09, -0.46); // wrist
  s.bezierCurveTo(-0.16, -0.12, -0.22, 0.22, -0.16, 0.48); // medial sweep
  return s;
}

// 3. ANATOMICAL RELAXED HAND
function createHandShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.08, 0.28);
  s.lineTo(0.08, 0.28);
  s.bezierCurveTo(0.12, 0.14, 0.14, -0.05, 0.12, -0.20);
  s.bezierCurveTo(0.10, -0.38, 0.04, -0.48, 0.0, -0.50); // fingertips
  s.bezierCurveTo(-0.04, -0.48, -0.08, -0.35, -0.09, -0.22);
  s.bezierCurveTo(-0.10, -0.12, -0.16, -0.05, -0.22, -0.08); // thumb
  s.bezierCurveTo(-0.25, -0.10, -0.24, -0.02, -0.18, 0.08);
  s.bezierCurveTo(-0.13, 0.16, -0.09, 0.22, -0.08, 0.28);
  return s;
}

// 4. PECTORALIS MAJOR (CHEST)
function createPecShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.04, 0.46); // sternum top
  s.bezierCurveTo(0.26, 0.48, 0.58, 0.42, 0.82, 0.26); // clavicular line to shoulder
  s.bezierCurveTo(0.88, 0.10, 0.84, -0.10, 0.74, -0.22); // deltopectoral groove
  s.bezierCurveTo(0.52, -0.34, 0.22, -0.32, 0.04, -0.22); // lower pectoral border
  s.lineTo(0.04, 0.46); // sternal border
  return s;
}

// 5. RECTUS ABDOMINIS SEGMENT (CORE 6-PACK)
function createAbBlockShape(w = 0.26, h = 0.21, r = 0.04): THREE.Shape {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// 6. LOWER ABDOMINAL V-PLATE (APOLLO'S / ADONIS BELT)
function createLowerAbShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.28, 0.14);
  s.lineTo(0.28, 0.14);
  s.bezierCurveTo(0.22, -0.08, 0.14, -0.28, 0.0, -0.46);
  s.bezierCurveTo(-0.14, -0.28, -0.22, -0.08, -0.28, 0.14);
  return s;
}

// 7. EXTERNAL OBLIQUE (CORE FLANK)
function createObliqueShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.02, 0.58);
  s.bezierCurveTo(0.22, 0.44, 0.28, 0.15, 0.24, -0.22);
  s.bezierCurveTo(0.18, -0.48, 0.06, -0.64, -0.08, -0.70);
  s.bezierCurveTo(-0.02, -0.40, 0.02, -0.08, -0.08, 0.26);
  s.bezierCurveTo(-0.06, 0.44, -0.02, 0.54, 0.02, 0.58);
  return s;
}

// 8. DELTOID SHOULDER CAP
function createDeltoidShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.48);
  s.bezierCurveTo(0.38, 0.42, 0.50, 0.15, 0.42, -0.16);
  s.bezierCurveTo(0.32, -0.40, 0.15, -0.54, 0, -0.62);
  s.bezierCurveTo(-0.15, -0.54, -0.32, -0.40, -0.42, -0.16);
  s.bezierCurveTo(-0.50, 0.15, -0.38, 0.42, 0, 0.48);
  return s;
}

// 9. BICEPS BRACHII
function createBicepShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.62);
  s.bezierCurveTo(0.20, 0.46, 0.24, 0.10, 0.19, -0.34);
  s.bezierCurveTo(0.14, -0.56, 0.05, -0.66, 0, -0.70);
  s.bezierCurveTo(-0.05, -0.66, -0.14, -0.56, -0.19, -0.34);
  s.bezierCurveTo(-0.24, 0.10, -0.20, 0.46, 0, 0.62);
  return s;
}

// 10. TRICEPS BRACHII (HORSESHOE)
function createTricepShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.62);
  s.bezierCurveTo(0.26, 0.48, 0.28, 0.12, 0.21, -0.28);
  s.bezierCurveTo(0.15, -0.56, 0.05, -0.68, 0, -0.72);
  s.bezierCurveTo(-0.05, -0.68, -0.15, -0.56, -0.21, -0.28);
  s.bezierCurveTo(-0.28, 0.12, -0.26, 0.48, 0, 0.62);
  return s;
}

// 11. TRAPEZIUS (BACK KITE)
function createTrapeziusShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.56);
  s.bezierCurveTo(0.32, 0.52, 0.68, 0.38, 0.85, 0.22);
  s.bezierCurveTo(0.56, -0.08, 0.30, -0.36, 0, -0.58);
  s.bezierCurveTo(-0.30, -0.36, -0.56, -0.08, -0.85, 0.22);
  s.bezierCurveTo(-0.68, 0.38, -0.32, 0.52, 0, 0.56);
  return s;
}

// 12. LATISSIMUS DORSI (V-TAPER WINGS)
function createLatissimusShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.05, 0.68);
  s.bezierCurveTo(0.35, 0.72, 0.70, 0.62, 0.88, 0.38); // underarm sweep
  s.bezierCurveTo(0.76, 0.05, 0.56, -0.36, 0.28, -0.66); // V-taper
  s.bezierCurveTo(0.15, -0.70, 0.08, -0.62, 0.05, -0.52);
  s.lineTo(0.05, 0.68);
  return s;
}

// 13. GLUTEUS MAXIMUS (CHEEKS)
function createGluteShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.04, 0.46);
  s.bezierCurveTo(0.32, 0.50, 0.62, 0.38, 0.64, 0.08);
  s.bezierCurveTo(0.66, -0.30, 0.44, -0.52, 0.16, -0.50);
  s.bezierCurveTo(0.04, -0.48, 0.03, -0.16, 0.04, 0.46);
  return s;
}

// 14. RECTUS FEMORIS (QUAD CENTER)
function createQuadRectusShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.75);
  s.bezierCurveTo(0.20, 0.56, 0.22, 0.12, 0.18, -0.36);
  s.bezierCurveTo(0.14, -0.62, 0.06, -0.76, 0, -0.80);
  s.bezierCurveTo(-0.06, -0.80, -0.14, -0.62, -0.18, -0.36);
  s.bezierCurveTo(-0.22, 0.12, -0.20, 0.56, 0, 0.75);
  return s;
}

// 15. VASTUS LATERALIS (QUAD OUTER FLARE)
function createVastusLateralisShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.02, 0.70);
  s.bezierCurveTo(0.30, 0.54, 0.38, 0.14, 0.32, -0.30);
  s.bezierCurveTo(0.26, -0.58, 0.08, -0.72, -0.05, -0.74);
  s.bezierCurveTo(0.02, -0.48, 0.05, 0.12, 0.02, 0.70);
  return s;
}

// 16. VASTUS MEDIALIS (QUAD INNER TEARDROP)
function createVastusMedialisShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0.0, 0.36);
  s.bezierCurveTo(0.22, 0.25, 0.26, -0.05, 0.17, -0.32);
  s.bezierCurveTo(0.09, -0.46, -0.02, -0.46, -0.10, -0.36);
  s.bezierCurveTo(-0.14, -0.18, -0.10, 0.20, 0.0, 0.36);
  return s;
}

// 17. HAMSTRINGS
function createHamstringShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-0.20, 0.72);
  s.bezierCurveTo(0.0, 0.76, 0.20, 0.72, 0.24, 0.68);
  s.bezierCurveTo(0.30, 0.28, 0.26, -0.30, 0.18, -0.70);
  s.bezierCurveTo(0.0, -0.76, -0.14, -0.74, -0.18, -0.70);
  s.bezierCurveTo(-0.26, -0.30, -0.28, 0.28, -0.20, 0.72);
  return s;
}

// 18. GASTROCNEMIUS (CALF REAR TWIN-HEADS)
function createGastrocnemiusShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.58);
  s.bezierCurveTo(0.32, 0.52, 0.40, 0.24, 0.32, -0.10);
  s.bezierCurveTo(0.22, -0.40, 0.10, -0.64, 0.03, -0.74);
  s.bezierCurveTo(-0.03, -0.74, -0.22, -0.40, -0.32, -0.10);
  s.bezierCurveTo(-0.40, 0.24, -0.32, 0.52, 0, 0.58);
  return s;
}

// 19. ANTERIOR TIBIALIS (CALF FRONT)
function createAnteriorCalfShape(): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(0, 0.56);
  s.bezierCurveTo(0.22, 0.48, 0.26, 0.12, 0.17, -0.28);
  s.bezierCurveTo(0.11, -0.54, 0.04, -0.70, 0, -0.74);
  s.bezierCurveTo(-0.04, -0.74, -0.11, -0.54, -0.17, -0.28);
  s.bezierCurveTo(-0.26, 0.12, -0.22, 0.48, 0, 0.56);
  return s;
}

// Extrusion Settings
const STANDARD_EXTRUDE: THREE.ExtrudeGeometryOptions = {
  depth: 0.08,
  bevelEnabled: true,
  bevelSegments: 4,
  steps: 1,
  bevelSize: 0.026,
  bevelThickness: 0.038,
};

const THICK_EXTRUDE: THREE.ExtrudeGeometryOptions = {
  depth: 0.12,
  bevelEnabled: true,
  bevelSegments: 4,
  steps: 1,
  bevelSize: 0.032,
  bevelThickness: 0.048,
};

function useAnatomyGeometries() {
  return useMemo(() => {
    // 1. Pec (curved around anterior ribcage)
    const pec = curveGeometry(
      new THREE.ExtrudeGeometry(createPecShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z + (0.10 - Math.pow(x * 1.05, 2) * 0.16),
      })
    );

    // 2. Ab block (curved around abdominal wall)
    const abBlock = curveGeometry(
      new THREE.ExtrudeGeometry(createAbBlockShape(0.26, 0.21, 0.04), STANDARD_EXTRUDE),
      (x, y, z) => ({
        z: z + (0.06 - Math.pow(x * 1.6, 2) * 0.12),
      })
    );

    // 3. Lower Ab (tapering down towards groin)
    const lowerAb = curveGeometry(
      new THREE.ExtrudeGeometry(createLowerAbShape(), STANDARD_EXTRUDE),
      (x, y, z) => ({
        z: z + (0.05 - Math.pow(x * 1.5, 2) * 0.10 - Math.pow(y * 1.2, 2) * 0.06),
      })
    );

    // 4. Oblique (flank wrapping around waist)
    const oblique = curveGeometry(
      new THREE.ExtrudeGeometry(createObliqueShape(), STANDARD_EXTRUDE),
      (x, y, z) => ({
        z: z - Math.pow(Math.abs(x) * 1.2, 1.8) * 0.22,
      })
    );

    // 5. Deltoid (wrapping over spherical shoulder joint)
    const deltoid = curveGeometry(
      new THREE.ExtrudeGeometry(createDeltoidShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z + (0.12 - Math.pow(x * 1.3, 2) * 0.16 - Math.pow(y * 1.0, 2) * 0.12),
      })
    );

    // 6. Bicep (anterior arm spindle volume)
    const bicep = curveGeometry(
      new THREE.ExtrudeGeometry(createBicepShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z + (0.08 - Math.pow(x * 1.6, 2) * 0.16),
      })
    );

    // 7. Tricep (posterior arm horseshoe volume)
    const tricep = curveGeometry(
      new THREE.ExtrudeGeometry(createTricepShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z - (0.08 - Math.pow(x * 1.6, 2) * 0.16),
      })
    );

    // 8. Trapezius (kite plate over upper spine & neck)
    const trapezius = curveGeometry(
      new THREE.ExtrudeGeometry(createTrapeziusShape(), STANDARD_EXTRUDE),
      (x, y, z) => ({
        z: z - (0.08 - Math.pow(x * 1.1, 2) * 0.14),
      })
    );

    // 9. Lats (sweeping V-wings wrapping into armpit)
    const lat = curveGeometry(
      new THREE.ExtrudeGeometry(createLatissimusShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z - (0.10 - Math.pow(x * 1.15, 2) * 0.18),
      })
    );

    // 10. Glute (rounded hemispherical buttock cheek)
    const glute = curveGeometry(
      new THREE.ExtrudeGeometry(createGluteShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z - (0.18 - Math.pow(x * 1.3, 2) * 0.16 - Math.pow(y * 1.3, 2) * 0.14),
      })
    );

    // 11. Quad Rectus (cylindrical anterior thigh bulge)
    const quadRectus = curveGeometry(
      new THREE.ExtrudeGeometry(createQuadRectusShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z + (0.10 - Math.pow(x * 1.5, 2) * 0.18),
      })
    );

    // 12. Vastus Lateralis (outer lateral quad flare)
    const vastusLat = curveGeometry(
      new THREE.ExtrudeGeometry(createVastusLateralisShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z + (0.08 - Math.pow(x * 1.4, 2) * 0.18),
      })
    );

    // 13. Vastus Medialis (teardrop head above knee)
    const vastusMed = curveGeometry(
      new THREE.ExtrudeGeometry(createVastusMedialisShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z + (0.10 - Math.pow(x * 1.6, 2) * 0.18),
      })
    );

    // 14. Hamstring (posterior thigh column)
    const hamstring = curveGeometry(
      new THREE.ExtrudeGeometry(createHamstringShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z - (0.10 - Math.pow(x * 1.4, 2) * 0.18),
      })
    );

    // 15. Gastrocnemius (twin-head calf belly)
    const gastrocnemius = curveGeometry(
      new THREE.ExtrudeGeometry(createGastrocnemiusShape(), THICK_EXTRUDE),
      (x, y, z) => ({
        z: z - (0.12 - Math.pow(x * 1.6, 2) * 0.20),
      })
    );

    // 16. Anterior Calf (shin profile)
    const anteriorCalf = curveGeometry(
      new THREE.ExtrudeGeometry(createAnteriorCalfShape(), STANDARD_EXTRUDE),
      (x, y, z) => ({
        z: z + (0.08 - Math.pow(x * 1.6, 2) * 0.16),
      })
    );

    // 17. Athletic Mannequin Head (hair silhouette, ears, jawline, chin)
    const head = curveGeometry(
      new THREE.ExtrudeGeometry(createAthleticHeadShape(), {
        depth: 0.52,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelThickness: 0.08,
        bevelSize: 0.04,
      }),
      (x, y, z) => ({
        z: z - 0.26 + (0.06 - Math.pow(x * 1.4, 2) * 0.08),
      })
    );

    // 18. Forearm
    const forearm = curveGeometry(
      new THREE.ExtrudeGeometry(createForearmShape(), {
        depth: 0.28,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelThickness: 0.05,
        bevelSize: 0.03,
      }),
      (x, y, z) => ({
        z: z - 0.14,
      })
    );

    // 19. Hand
    const hand = curveGeometry(
      new THREE.ExtrudeGeometry(createHandShape(), {
        depth: 0.14,
        bevelEnabled: true,
        bevelSegments: 3,
        bevelThickness: 0.03,
        bevelSize: 0.02,
      }),
      (x, y, z) => ({
        z: z - 0.07,
      })
    );

    return {
      pec,
      abBlock,
      lowerAb,
      oblique,
      deltoid,
      bicep,
      tricep,
      trapezius,
      lat,
      glute,
      quadRectus,
      vastusLat,
      vastusMed,
      hamstring,
      gastrocnemius,
      anteriorCalf,
      head,
      forearm,
      hand,
    };
  }, []);
}

type AnatomicalPlateProps = {
  id: MuscleId;
  geometry: THREE.BufferGeometry;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  active: boolean;
  baseColor: string;
  emissiveColor: string;
  onHover: (id: MuscleId | null) => void;
  onSelect: (id: MuscleId) => void;
};

function AnatomicalPlate({
  id,
  geometry,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1],
  active,
  baseColor,
  emissiveColor,
  onHover,
  onSelect,
}: AnatomicalPlateProps) {
  const enter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "pointer";
    onHover(id);
  };

  const leave = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = "auto";
    onHover(null);
  };

  const click = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(id);
  };

  return (
    <mesh
      geometry={geometry}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={enter}
      onPointerOut={leave}
      onClick={click}
      renderOrder={2}
      castShadow
    >
      <meshStandardMaterial
        color={baseColor}
        emissive={emissiveColor}
        emissiveIntensity={active ? 0.95 : 0.46}
        roughness={0.34}
        metalness={0.16}
        transparent
        opacity={active ? 0.98 : 0.88}
      />
      <Edges
        scale={1.012}
        color={active ? "#ffffff" : "#f4ecdd"}
        threshold={15}
        transparent
        opacity={active ? 0.96 : 0.60}
      />
    </mesh>
  );
}

type AnatomicalMuscleGroupProps = {
  id: MuscleId;
  hovered: boolean;
  selected: boolean;
  onHover: (id: MuscleId | null) => void;
  onSelect: (id: MuscleId) => void;
  children: (props: {
    active: boolean;
    baseColor: string;
    emissiveColor: string;
    plateProps: {
      id: MuscleId;
      active: boolean;
      baseColor: string;
      emissiveColor: string;
      onHover: (id: MuscleId | null) => void;
      onSelect: (id: MuscleId) => void;
    };
  }) => React.ReactNode;
};

function AnatomicalMuscleGroup({
  id,
  hovered,
  selected,
  onHover,
  onSelect,
  children,
}: AnatomicalMuscleGroupProps) {
  const active = hovered || selected;
  const groupRef = useRef<THREE.Group>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const muscleData = muscleLibrary[id];
  const score = muscleData?.score ?? 100;
  const recovery = getRecoveryStatus(score);

  useFrame(({ clock }) => {
    if (!groupRef.current || reduceMotion) return;
    const pulse = active ? 1 + Math.sin(clock.elapsedTime * 3.8) * 0.028 : 1;
    groupRef.current.scale.set(pulse, pulse, pulse);
  });

  const baseColor = recovery.color;
  const emissiveColor = active ? recovery.color : recovery.emissive;

  const plateProps = {
    id,
    active,
    baseColor,
    emissiveColor,
    onHover,
    onSelect,
  };

  return <group ref={groupRef}>{children({ active, baseColor, emissiveColor, plateProps })}</group>;
}

// Fallback generic Muscle component for backwards-compatibility
export function Muscle({
  id,
  position,
  rotation = [0, 0, 0],
  scale,
  shape = "sphere",
  hovered,
  selected,
  onHover,
  onSelect,
}: MuscleProps) {
  const active = hovered || selected;
  const mesh = useRef<THREE.Mesh>(null);
  const reduceMotion = useReducedMotion() ?? false;
  const muscleData = muscleLibrary[id];
  const score = muscleData?.score ?? 100;
  const recovery = getRecoveryStatus(score);

  useFrame(({ clock }) => {
    if (!mesh.current || reduceMotion) return;
    const pulse = active ? 1 + Math.sin(clock.elapsedTime * 3.8) * 0.035 : 1;
    mesh.current.scale.set(scale[0] * pulse, scale[1] * pulse, scale[2] * pulse);
  });

  const enter = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "pointer";
    onHover(id);
  };

  const leave = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    document.body.style.cursor = "auto";
    onHover(null);
  };

  const click = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    onSelect(id);
  };

  useEffect(() => {
    return () => {
      document.body.style.cursor = "auto";
    };
  }, []);

  const baseColor = recovery.color;
  const emissiveColor = active ? recovery.color : recovery.emissive;

  return (
    <mesh
      ref={mesh}
      position={position}
      rotation={rotation}
      scale={scale}
      onPointerOver={enter}
      onPointerOut={leave}
      onClick={click}
      renderOrder={2}
      castShadow
    >
      {shape === "sphere" && <sphereGeometry args={[1, 32, 24]} />}
      {shape === "capsule" && <capsuleGeometry args={[0.68, 1.45, 12, 24]} />}
      {shape === "box" && <boxGeometry args={[1, 1, 1, 8, 7, 7]} />}
      <meshStandardMaterial
        color={baseColor}
        emissive={emissiveColor}
        emissiveIntensity={active ? 0.9 : 0.45}
        roughness={0.4}
        metalness={0.18}
        transparent
        opacity={active ? 0.98 : 0.88}
      />
      <Edges
        scale={1.018}
        color={active ? "#ffffff" : baseColor}
        threshold={12}
        transparent
        opacity={active ? 0.95 : 0.45}
      />
    </mesh>
  );
}

// =============================================================================
// 3. HUMAN BODY ARCHITECTURE & ATHLETIC MANNEQUIN BASE
// =============================================================================

export const BODY_MODEL_PATH = "/models/body.glb";

type HumanBodyProps = {
  selected: MuscleId;
  hovered: MuscleId | null;
  onHover: (id: MuscleId | null) => void;
  onSelect: (id: MuscleId) => void;
  modelUrl?: string;
  useDetailedModel?: boolean;
};

function DetailedModel({ modelUrl }: { modelUrl: string }) {
  const { scene } = useGLTF(modelUrl);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clonedScene} position={[0, -2.72, 0]} scale={2.35} />;
}

function ContourRings() {
  return (
    <group>
      {[1.66, 1.32, 0.96, 0.58].map((y, index) => (
        <mesh key={y} position={[0, y, 0.505]} scale={[1.05 - index * 0.08, 0.7, 1]}>
          <torusGeometry args={[0.84 - index * 0.06, 0.012, 5, 48]} />
          <meshBasicMaterial color="#9bcf86" transparent opacity={0.08} />
        </mesh>
      ))}
      {[-0.65, -0.98, -1.33, -1.72, -2.13].map((y) => (
        <mesh key={y} position={[0, y, 0.46]} scale={[0.64, 0.72, 1]}>
          <torusGeometry args={[0.72, 0.01, 5, 36]} />
          <meshBasicMaterial color="#7dab70" transparent opacity={0.06} />
        </mesh>
      ))}
    </group>
  );
}

function MuscleFiberDetail({ selected }: { selected: MuscleId }) {
  const strip = (key: string, position: [number, number, number], scale: [number, number, number], rotation = 0, region: MuscleId = "chest", opacity = 0.2) => (
    <mesh key={key} position={position} rotation={[0, 0, rotation]} scale={scale}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color={selected === region ? "#dfffa8" : "#c9ad7e"} transparent opacity={selected === region ? Math.min(opacity + 0.16, 0.42) : opacity * 0.72} />
    </mesh>
  );
  return (
    <group>
      {[-0.64, -0.51, -0.38, -0.25].map((x, index) => strip(`l-pec-${x}`, [x, 1.44 + index * 0.035, 0.60], [0.38, 0.018, 0.014], -0.22 + index * 0.08, "chest", 0.25))}
      {[0.64, 0.51, 0.38, 0.25].map((x, index) => strip(`r-pec-${x}`, [x, 1.44 + index * 0.035, 0.60], [0.38, 0.018, 0.014], 0.22 - index * 0.08, "chest", 0.25))}
      {[-0.17, 0.17].map((x) => [0.72, 0.46, 0.20].map((y, index) => strip(`core-${x}-${y}`, [x, y, 0.60], [0.18, 0.014, 0.014], 0, "core", 0.22 - index * 0.025)))}
      {[-1, 1].map((side) => [-0.14, 0.05, 0.22].map((offset, index) => strip(`shoulder-${side}-${index}`, [side * 1.32, 1.62 + offset, 0.32], [0.22, 0.016, 0.014], side * (0.35 - index * 0.12), "shoulders", 0.2)))}
      {[-1, 1].map((side) => [-0.36, -0.05, 0.26].map((offset, index) => strip(`arm-${side}-${index}`, [side * 1.48, 0.88 + offset, 0.35], [0.018, 0.24, 0.014], side * 0.1, "biceps", 0.17)))}
      {[-0.48, 0.48].map((x) => [-1.28, -1.55, -1.82].map((y, index) => strip(`quad-${x}-${y}`, [x, y, 0.46], [0.045, 0.22, 0.014], x < 0 ? -0.12 : 0.12, "quads", 0.18 - index * 0.015)))}
      {[-0.46, 0.46].map((x) => [-2.70, -2.95].map((y, index) => strip(`calf-${x}-${y}`, [x, y, 0.32], [0.035, 0.18, 0.014], x < 0 ? -0.08 : 0.08, "calves", 0.14 - index * 0.01)))}
    </group>
  );
}

function MannequinMaterial() {
  return (
    <meshStandardMaterial
      color="#121714"
      emissive="#ece1cc"
      emissiveIntensity={0.35}
      roughness={0.62}
      metalness={0.22}
    />
  );
}

function BodyBase({ geoms }: { geoms: ReturnType<typeof useAnatomyGeometries> }) {
  return (
    <group>
      {/* Head: Authentic athletic cranium, hair volume, ear notches, jawline, and chin */}
      <mesh geometry={geoms.head} position={[0, 2.70, 0]} castShadow>
        <MannequinMaterial />
        <Edges scale={1.008} color="#1c251f" threshold={16} />
      </mesh>

      {/* Neck: athletic neck column widening down to clavicles */}
      <mesh position={[0, 2.05, 0]} scale={[0.34, 0.48, 0.34]} castShadow>
        <cylinderGeometry args={[0.88, 1.05, 1, 24]} />
        <MannequinMaterial />
        <Edges scale={1.008} color="#1c251f" threshold={20} />
      </mesh>

      {/* Torso core underlay (shows behind sternum groove, linea alba, and spine furrow) */}
      <mesh position={[0, 1.18, -0.01]} scale={[1.05, 1.18, 0.44]} castShadow>
        <cylinderGeometry args={[0.92, 0.76, 1, 32]} />
        <MannequinMaterial />
      </mesh>

      {/* Pelvic / athletic brief groin cutout (matches the dark V-cutout in reference image) */}
      <mesh position={[0, -0.32, 0.02]} scale={[0.74, 0.62, 0.42]} castShadow>
        <cylinderGeometry args={[0.84, 0.62, 1, 28]} />
        <MannequinMaterial />
        <Edges scale={1.008} color="#1c251f" threshold={18} />
      </mesh>

      {/* Bilateral limbs underlay */}
      {[-1, 1].map((side) => (
        <group key={side}>
          {/* Shoulder joint notch */}
          <mesh position={[side * 1.25, 1.62, 0]} scale={[0.26, 0.26, 0.26]}>
            <sphereGeometry args={[1, 18, 18]} />
            <MannequinMaterial />
          </mesh>

          {/* Upper arm bone core */}
          <mesh position={[side * 1.44, 0.88, 0]} rotation={[0, 0, -side * 0.20]} scale={[0.22, 0.74, 0.22]}>
            <cylinderGeometry args={[0.7, 0.65, 1, 20]} />
            <MannequinMaterial />
          </mesh>

          {/* Elbow joint notch */}
          <mesh position={[side * 1.58, 0.30, 0]} scale={[0.20, 0.20, 0.20]}>
            <sphereGeometry args={[1, 16, 16]} />
            <MannequinMaterial />
          </mesh>

          {/* Sculpted Forearm extending down */}
          <mesh
            geometry={geoms.forearm}
            position={[side * 1.74, 0.05, 0.02]}
            rotation={[0, 0, -side * 0.22]}
            scale={[side, 1, 1]}
            castShadow
          >
            <MannequinMaterial />
            <Edges scale={1.01} color="#1c251f" threshold={18} />
          </mesh>

          {/* Sculpted Hand with thumb and relaxed fingers */}
          <mesh
            geometry={geoms.hand}
            position={[side * 1.98, -0.65, 0.02]}
            rotation={[0, 0, -side * 0.24]}
            scale={[side, 1, 1]}
            castShadow
          >
            <MannequinMaterial />
            <Edges scale={1.01} color="#1c251f" threshold={18} />
          </mesh>

          {/* Femur / Thigh core */}
          <mesh position={[side * 0.48, -1.40, 0]} scale={[0.38, 1.15, 0.38]}>
            <cylinderGeometry args={[0.85, 0.68, 1, 24]} />
            <MannequinMaterial />
          </mesh>

          {/* Knee joint notch (Patellar notch in front, Popliteal fossa in rear) */}
          <mesh position={[side * 0.48, -2.06, 0.02]} scale={[0.32, 0.20, 0.34]}>
            <cylinderGeometry args={[0.82, 0.78, 1, 24]} />
            <MannequinMaterial />
            <Edges scale={1.01} color="#1c251f" threshold={15} />
          </mesh>

          {/* Shin & calf bone core */}
          <mesh position={[side * 0.46, -2.75, 0]} scale={[0.26, 1.05, 0.26]}>
            <cylinderGeometry args={[0.75, 0.58, 1, 20]} />
            <MannequinMaterial />
          </mesh>

          {/* Ankle joint */}
          <mesh position={[side * 0.46, -3.45, 0.02]} scale={[0.22, 0.14, 0.24]}>
            <cylinderGeometry args={[0.7, 0.65, 1, 16]} />
            <MannequinMaterial />
          </mesh>

          {/* Athletic foot extending forward */}
          <mesh position={[side * 0.48, -3.80, 0.22]} scale={[0.38, 0.16, 0.78]} castShadow>
            <boxGeometry args={[1, 1, 1]} />
            <MannequinMaterial />
            <Edges scale={1.01} color="#1c251f" threshold={20} />
          </mesh>
        </group>
      ))}
      <ContourRings />
    </group>
  );
}

function AnatomyFallback({ selected, hovered, onHover, onSelect }: Omit<HumanBodyProps, "modelUrl" | "useDetailedModel">) {
  const geoms = useAnatomyGeometries();

  return (
    <>
      <BodyBase geoms={geoms} />
      <MuscleFiberDetail selected={selected} />

      {/* 1. CHEST (Pectoralis Major - Left & Right Contoured Plates) */}
      <AnatomicalMuscleGroup id="chest" hovered={hovered === "chest"} selected={selected === "chest"} onHover={onHover} onSelect={onSelect}>
        {({ plateProps }) => (
          <>
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.pec}
              position={[0, 1.44, 0.44]}
              rotation={[0.05, 0.10, -0.02]}
              scale={[1.08, 1.05, 1.0]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.pec}
              position={[0, 1.44, 0.44]}
              rotation={[0.05, -0.10, 0.02]}
              scale={[-1.08, 1.05, 1.0]}
            />
          </>
        )}
      </AnatomicalMuscleGroup>

      {/* 2. CORE (Rectus Abdominis 6-Pack, Lower V-Plate & External Obliques) */}
      <AnatomicalMuscleGroup id="core" hovered={hovered === "core"} selected={selected === "core"} onHover={onHover} onSelect={onSelect}>
        {({ plateProps }) => (
          <>
            {/* 6-Pack Abs: Upper pair */}
            <AnatomicalPlate {...plateProps} geometry={geoms.abBlock} position={[-0.17, 0.72, 0.48]} />
            <AnatomicalPlate {...plateProps} geometry={geoms.abBlock} position={[0.17, 0.72, 0.48]} />
            {/* 6-Pack Abs: Mid pair */}
            <AnatomicalPlate {...plateProps} geometry={geoms.abBlock} position={[-0.17, 0.46, 0.47]} />
            <AnatomicalPlate {...plateProps} geometry={geoms.abBlock} position={[0.17, 0.46, 0.47]} />
            {/* 6-Pack Abs: Lower pair */}
            <AnatomicalPlate {...plateProps} geometry={geoms.abBlock} position={[-0.17, 0.20, 0.45]} />
            <AnatomicalPlate {...plateProps} geometry={geoms.abBlock} position={[0.17, 0.20, 0.45]} />
            {/* Lower Abdominal V-Plate (Apollo's / Adonis Belt) */}
            <AnatomicalPlate {...plateProps} geometry={geoms.lowerAb} position={[0, -0.04, 0.42]} />
            {/* External Obliques (Lateral Athletic Flanks) */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.oblique}
              position={[-0.55, 0.38, 0.32]}
              rotation={[0.05, -0.42, -0.06]}
              scale={[-1.05, 1.05, 1.0]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.oblique}
              position={[0.55, 0.38, 0.32]}
              rotation={[0.05, 0.42, 0.06]}
              scale={[1.05, 1.05, 1.0]}
            />
          </>
        )}
      </AnatomicalMuscleGroup>

      {/* 3. SHOULDERS (Deltoids - Anterior, Lateral & Posterior Heads) */}
      <AnatomicalMuscleGroup id="shoulders" hovered={hovered === "shoulders"} selected={selected === "shoulders"} onHover={onHover} onSelect={onSelect}>
        {({ plateProps }) => (
          <>
            {/* Left Anterior Deltoid */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.deltoid}
              position={[-1.32, 1.62, 0.04]}
              rotation={[0.08, -0.22, 0.24]}
              scale={[1.12, 1.12, 1.12]}
            />
            {/* Right Anterior Deltoid */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.deltoid}
              position={[1.32, 1.62, 0.04]}
              rotation={[0.08, 0.22, -0.24]}
              scale={[1.12, 1.12, 1.12]}
            />
            {/* Left Posterior Deltoid (Back View) */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.deltoid}
              position={[-1.30, 1.62, -0.12]}
              rotation={[-0.08, 0.22, 0.24]}
              scale={[1.10, 1.10, 1.10]}
            />
            {/* Right Posterior Deltoid (Back View) */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.deltoid}
              position={[1.30, 1.62, -0.12]}
              rotation={[-0.08, -0.22, -0.24]}
              scale={[1.10, 1.10, 1.10]}
            />
          </>
        )}
      </AnatomicalMuscleGroup>

      {/* 4. BICEPS (Biceps Brachii - Anterior Upper Arm Spindle) */}
      <AnatomicalMuscleGroup id="biceps" hovered={hovered === "biceps"} selected={selected === "biceps"} onHover={onHover} onSelect={onSelect}>
        {({ plateProps }) => (
          <>
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.bicep}
              position={[-1.48, 0.88, 0.14]}
              rotation={[-0.08, 0, -0.20]}
              scale={[0.92, 1.05, 0.92]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.bicep}
              position={[1.48, 0.88, 0.14]}
              rotation={[-0.08, 0, 0.20]}
              scale={[0.92, 1.05, 0.92]}
            />
          </>
        )}
      </AnatomicalMuscleGroup>

      {/* 5. TRICEPS (Triceps Brachii - Posterior Upper Arm Horseshoe) */}
      <AnatomicalMuscleGroup id="triceps" hovered={hovered === "triceps"} selected={selected === "triceps"} onHover={onHover} onSelect={onSelect}>
        {({ plateProps }) => (
          <>
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.tricep}
              position={[-1.48, 0.86, -0.14]}
              rotation={[0.08, 0, -0.20]}
              scale={[0.95, 1.05, 0.95]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.tricep}
              position={[1.48, 0.86, -0.14]}
              rotation={[0.08, 0, 0.20]}
              scale={[0.95, 1.05, 0.95]}
            />
          </>
        )}
      </AnatomicalMuscleGroup>

      {/* 6. BACK (Trapezius Kite & Latissimus Dorsi Sweeping V-Wings) */}
      <AnatomicalMuscleGroup id="back" hovered={hovered === "back"} selected={selected === "back"} onHover={onHover} onSelect={onSelect}>
        {({ plateProps }) => (
          <>
            {/* Trapezius Kite Plate */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.trapezius}
              position={[0, 1.74, -0.36]}
              rotation={[-0.06, 0, 0]}
              scale={[0.95, 0.95, 0.95]}
            />
            {/* Right Latissimus Dorsi Wing */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.lat}
              position={[0, 0.96, -0.34]}
              rotation={[-0.04, -0.10, 0]}
              scale={[1.08, 1.05, 1.0]}
            />
            {/* Left Latissimus Dorsi Wing (Mirrored) */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.lat}
              position={[0, 0.96, -0.34]}
              rotation={[-0.04, 0.10, 0]}
              scale={[-1.08, 1.05, 1.0]}
            />
          </>
        )}
      </AnatomicalMuscleGroup>

      {/* 7. GLUTES (Gluteus Maximus Butterfly Cheeks) */}
      <AnatomicalMuscleGroup id="glutes" hovered={hovered === "glutes"} selected={selected === "glutes"} onHover={onHover} onSelect={onSelect}>
        {({ plateProps }) => (
          <>
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.glute}
              position={[0, -0.36, -0.36]}
              rotation={[-0.08, 0.14, 0.04]}
              scale={[-1.05, 1.05, 1.0]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.glute}
              position={[0, -0.36, -0.36]}
              rotation={[-0.08, -0.14, -0.04]}
              scale={[1.05, 1.05, 1.0]}
            />
          </>
        )}
      </AnatomicalMuscleGroup>

      {/* 8. QUADS (Quadriceps Femoris - Rectus Femoris, Vastus Lateralis & Vastus Medialis Teardrop) */}
      <AnatomicalMuscleGroup id="quads" hovered={hovered === "quads"} selected={selected === "quads"} onHover={onHover} onSelect={onSelect}>
        {({ plateProps }) => (
          <>
            {/* Left Thigh */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.quadRectus}
              position={[-0.48, -1.40, 0.34]}
              rotation={[0.04, 0, 0.03]}
              scale={[0.95, 0.95, 0.95]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.vastusLat}
              position={[-0.48, -1.40, 0.31]}
              rotation={[0.04, -0.16, 0.03]}
              scale={[-0.95, 0.95, 0.95]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.vastusMed}
              position={[-0.34, -1.72, 0.35]}
              rotation={[0.04, 0.20, -0.04]}
              scale={[-0.95, 0.95, 0.95]}
            />
            {/* Right Thigh */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.quadRectus}
              position={[0.48, -1.40, 0.34]}
              rotation={[0.04, 0, -0.03]}
              scale={[0.95, 0.95, 0.95]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.vastusLat}
              position={[0.48, -1.40, 0.31]}
              rotation={[0.04, 0.16, -0.03]}
              scale={[0.95, 0.95, 0.95]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.vastusMed}
              position={[0.34, -1.72, 0.35]}
              rotation={[0.04, -0.20, 0.04]}
              scale={[0.95, 0.95, 0.95]}
            />
          </>
        )}
      </AnatomicalMuscleGroup>

      {/* 9. HAMSTRINGS (Biceps Femoris & Semitendinosus Columns) */}
      <AnatomicalMuscleGroup id="hamstrings" hovered={hovered === "hamstrings"} selected={selected === "hamstrings"} onHover={onHover} onSelect={onSelect}>
        {({ plateProps }) => (
          <>
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.hamstring}
              position={[-0.48, -1.40, -0.32]}
              rotation={[0.04, 0.06, 0.02]}
              scale={[0.96, 0.96, 0.96]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.hamstring}
              position={[0.48, -1.40, -0.32]}
              rotation={[0.04, -0.06, -0.02]}
              scale={[0.96, 0.96, 0.96]}
            />
          </>
        )}
      </AnatomicalMuscleGroup>

      {/* 10. CALVES (Gastrocnemius Twin-Heads Rear & Anterior Tibialis Front) */}
      <AnatomicalMuscleGroup id="calves" hovered={hovered === "calves"} selected={selected === "calves"} onHover={onHover} onSelect={onSelect}>
        {({ plateProps }) => (
          <>
            {/* Anterior Front Calves (Shin Profile) */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.anteriorCalf}
              position={[-0.46, -2.78, 0.18]}
              rotation={[0.04, 0, 0]}
              scale={[0.90, 0.90, 0.90]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.anteriorCalf}
              position={[0.46, -2.78, 0.18]}
              rotation={[0.04, 0, 0]}
              scale={[0.90, 0.90, 0.90]}
            />
            {/* Posterior Twin-Head Gastrocnemius (Diamond / Heart) */}
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.gastrocnemius}
              position={[-0.46, -2.70, -0.22]}
              rotation={[-0.04, 0.04, 0]}
              scale={[0.92, 0.92, 0.92]}
            />
            <AnatomicalPlate
              {...plateProps}
              geometry={geoms.gastrocnemius}
              position={[0.46, -2.70, -0.22]}
              rotation={[-0.04, -0.04, 0]}
              scale={[0.92, 0.92, 0.92]}
            />
          </>
        )}
      </AnatomicalMuscleGroup>
    </>
  );
}

export function HumanBody({ selected, hovered, onHover, onSelect, modelUrl = BODY_MODEL_PATH, useDetailedModel = false }: HumanBodyProps) {
  const label = hovered ?? selected;
  const root = useRef<THREE.Group>(null);
  const reduceMotion = useReducedMotion() ?? false;
  useFrame(({ clock }) => {
    if (!root.current || reduceMotion) return;
    const breath = Math.sin(clock.elapsedTime * 1.2);
    root.current.position.y = breath * 0.015;
    root.current.scale.setScalar(1 + breath * 0.005);
  });
  return (
    <group ref={root} position={[0, 0, 0]}>
      {useDetailedModel ? (
        <Suspense fallback={<AnatomyFallback selected={selected} hovered={hovered} onHover={onHover} onSelect={onSelect} />}>
          <DetailedModel modelUrl={modelUrl} />
        </Suspense>
      ) : (
        <AnatomyFallback selected={selected} hovered={hovered} onHover={onHover} onSelect={onSelect} />
      )}
      {label && (
        <Html position={[0, 3.25, 0]} center style={{ pointerEvents: "none" }}>
          <div className="body-float-label"><span className="pulse-dot" />{muscleLibrary[label].anatomicalName}</div>
        </Html>
      )}
    </group>
  );
}

// =============================================================================
// 4. MAIN BODY SCENE
// =============================================================================

type SceneInnerProps = {
  view: BodyView;
  autoRotate: boolean;
  reduceMotion: boolean;
  selected: MuscleId;
  onSelected: (id: MuscleId) => void;
  isMobile: boolean;
  recoveryTick?: number;
};

function SceneInner({ view, autoRotate, reduceMotion, selected, onSelected, isMobile, recoveryTick }: SceneInnerProps) {
  const controls = useRef<any>(null);
  const [hovered, setHovered] = useState<MuscleId | null>(null);
  const isTransitioning = useRef<boolean>(false);
  const prevView = useRef<BodyView>(view);

  const getTargetPosition = (v: BodyView) => {
    const distance = isMobile ? 12.0 : 8.8;
    if (v === "back") return new THREE.Vector3(0, -0.35, -distance);
    if (v === "side") return new THREE.Vector3(distance - 0.2, -0.35, 0.15);
    return new THREE.Vector3(0, -0.35, distance);
  };

  const targetLookAt = useMemo(() => new THREE.Vector3(0, -0.35, 0), []);

  useEffect(() => {
    if (prevView.current !== view) {
      prevView.current = view;
      isTransitioning.current = true;
    }
  }, [view]);

  useFrame(({ camera }, delta) => {
    if (isTransitioning.current) {
      const targetPos = getTargetPosition(view);
      const lerp = 1 - Math.exp(-delta * 6.5);
      camera.position.lerp(targetPos, lerp);
      controls.current?.target.lerp(targetLookAt, lerp);
      controls.current?.update();

      if (camera.position.distanceTo(targetPos) < 0.05) {
        camera.position.copy(targetPos);
        isTransitioning.current = false;
      }
    }
  });

  return (
    <>
      <color attach="background" args={["#1e130c"]} />
      <fog attach="fog" args={["#1e130c", 6.0, isMobile ? 18.0 : 12.0]} />
      <ambientLight intensity={1.8} color="#d5e8d8" />
      <directionalLight
        position={[3.8, 5.2, 4]}
        intensity={5.2}
        color="#e9ffd9"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 1.5, 3]} intensity={7.2} distance={8} color="#76c44e" />
      <pointLight position={[3, -2.4, 3]} intensity={3.2} distance={6} color="#8ec4dd" />
      <group>
        <HumanBody key={recoveryTick} selected={selected} hovered={hovered} onHover={setHovered} onSelect={onSelected} />
      </group>
      {!reduceMotion && (
        <Sparkles count={28} scale={[5.7, 8.7, 4.2]} size={1.2} speed={0.22} color="#c9ad7e" opacity={0.22} />
      )}
      <mesh position={[0, -3.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.38, 48]} />
        <meshBasicMaterial color="#baff57" transparent opacity={0.055} />
      </mesh>
      <OrbitControls
        ref={controls}
        enablePan={false}
        enableZoom
        minDistance={4.5}
        maxDistance={14.0}
        autoRotate={!reduceMotion && autoRotate}
        autoRotateSpeed={1.0}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={1.1}
        minPolarAngle={0.08}
        maxPolarAngle={Math.PI - 0.08}
        onStart={() => {
          isTransitioning.current = false;
        }}
      />
    </>
  );
}

type BodySceneProps = {
  selected: MuscleId;
  onSelected: (id: MuscleId) => void;
};

export function BodyScene({ selected, onSelected }: BodySceneProps) {
  const [view, setView] = useState<BodyView>("front");
  const [autoRotate, setAutoRotate] = useState(false);
  const [recoveryTick, setRecoveryTick] = useState(0);
  const reduceMotion = useReducedMotion() ?? false;
  const isMobile = useIsMobile();

  useEffect(() => {
    const handleUpdate = () => setRecoveryTick((t) => t + 1);
    window.addEventListener("fittrack:recovery-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("fittrack:recovery-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const reset = () => {
    setView("front");
    setAutoRotate(false);
  };

  const currentMuscle = muscleLibrary[selected] || muscleLibrary.chest;
  const recovery = getRecoveryStatus(currentMuscle.score);

  return (
    <section className="body-stage" aria-label="Interactive 3D anatomy explorer">
      <div className="stage-topline">
        <span>
          <i />
          3D Muscle Recovery Map
        </span>
        <span className="stage-coordinate font-mono text-[10px] text-[#8b9c8a]">
          360° Anatomical Simulation
        </span>
      </div>

      <div className="absolute top-12 left-4 z-10 pointer-events-none bg-[#ece1cc]/90 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1.5 flex items-center gap-2 shadow-lg">
        <span
          className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
          style={{ background: recovery.color, boxShadow: `0 0 8px ${recovery.color}` }}
        />
        <div className="flex flex-col">
          <span className="font-mono text-[10px] text-[#edf4e9] font-bold uppercase tracking-wider flex items-center gap-1.5">
            {currentMuscle.label}
            <span
              className="text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold"
              style={{ background: `${recovery.color}20`, color: recovery.color, border: `1px solid ${recovery.color}40` }}
            >
              {currentMuscle.score}% {recovery.label}
            </span>
          </span>
        </div>
      </div>

      <div className="absolute top-12 right-4 z-10 hidden sm:flex items-center gap-3 bg-[#ece1cc]/85 backdrop-blur-md border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-[#8b9c8a] shadow-lg">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#22c55e]" /> Ready
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" /> Recovering
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> Rest
        </span>
      </div>

      <div className="scan-grid" aria-hidden="true" />
      <div className={`anatomy-fiber-map focus-${selected}`} aria-hidden="true">
        <i /><i /><i /><i /><i /><i /><i /><i />
      </div>
      <Canvas
        dpr={[1, 1.45]}
        shadows
        camera={{ position: [0, 0.35, isMobile ? 12.5 : 8.8], fov: isMobile ? 45 : 36 }}
        gl={{ antialias: true, powerPreference: "high-performance" }}
      >
        <SceneInner
          view={view}
          autoRotate={autoRotate}
          reduceMotion={reduceMotion}
          selected={selected}
          onSelected={onSelected}
          isMobile={isMobile}
          recoveryTick={recoveryTick}
        />
      </Canvas>
      <BodyControls
        view={view}
        autoRotate={autoRotate}
        onView={setView}
        onReset={reset}
        onToggleRotate={() => setAutoRotate((state) => !state)}
      />
    </section>
  );
}
