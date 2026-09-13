import { useEffect, useRef } from "react";
import * as THREE from "three";

interface OrbitalReadinessSceneProps {
  score?: number;
}

export function OrbitalReadinessScene({ score = 50 }: OrbitalReadinessSceneProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = container.offsetWidth || 400;
    let height = container.offsetHeight || 380;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 9.5);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);

    // Warm daylight ambient lighting
    const ambientLight = new THREE.AmbientLight(0xf5f2eb, 2.8);
    scene.add(ambientLight);

    const topLight = new THREE.DirectionalLight(0xffffff, 3.2);
    topLight.position.set(4, 8, 6);
    scene.add(topLight);

    const backLight = new THREE.DirectionalLight(0xcca052, 2.0);
    backLight.position.set(-4, -6, -4);
    scene.add(backLight);

    const pointLight = new THREE.PointLight(0xcca052, 2.5, 20);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);

    // Main Group
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Central Frosted Capsule / Organic Shield
    const capsuleGeo = new THREE.CapsuleGeometry(1.6, 2.0, 32, 48);
    const capsuleMat = new THREE.MeshPhysicalMaterial({
      color: 0xfaf8f4,
      transmission: 0.88,
      opacity: 0.92,
      transparent: true,
      roughness: 0.18,
      ior: 1.45,
      thickness: 1.8,
      specularIntensity: 1.0,
      specularColor: new THREE.Color(0xffffff),
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      attenuationColor: new THREE.Color(0xe8dcc0),
      attenuationDistance: 2.5,
    });
    const capsuleMesh = new THREE.Mesh(capsuleGeo, capsuleMat);
    rootGroup.add(capsuleMesh);

    // Inner subtle glow core
    const innerGeo = new THREE.CapsuleGeometry(1.3, 1.6, 16, 24);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xeaf2eb,
      transparent: true,
      opacity: 0.55,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    rootGroup.add(innerMesh);

    // 2. Primary Green Orbital Ring
    const greenRingMat = new THREE.MeshStandardMaterial({
      color: 0xcca052,
      emissive: 0x8f6a29,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.4,
    });
    const ring1Geo = new THREE.TorusGeometry(3.1, 0.038, 16, 100);
    const ring1 = new THREE.Mesh(ring1Geo, greenRingMat);
    ring1.rotation.x = Math.PI / 2.3;
    ring1.rotation.y = 0.12;
    rootGroup.add(ring1);

    // 3. Tilted Sky Blue Orbital Ring
    const blueRingMat = new THREE.MeshStandardMaterial({
      color: 0xb89a67,
      emissive: 0x8f6a29,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.5,
    });
    const ring2Geo = new THREE.TorusGeometry(2.7, 0.024, 16, 100);
    const ring2 = new THREE.Mesh(ring2Geo, blueRingMat);
    ring2.rotation.x = -Math.PI / 3.2;
    ring2.rotation.y = Math.PI / 5;
    rootGroup.add(ring2);

    // 4. Tilted Amber Orbital Ring
    const amberRingMat = new THREE.MeshStandardMaterial({
      color: 0xcca052,
      emissive: 0x8f6a29,
      emissiveIntensity: 0.25,
      roughness: 0.35,
      metalness: 0.4,
    });
    const ring3Geo = new THREE.TorusGeometry(3.4, 0.02, 16, 100);
    const ring3 = new THREE.Mesh(ring3Geo, amberRingMat);
    ring3.rotation.x = Math.PI / 4.2;
    ring3.rotation.z = -Math.PI / 3.5;
    rootGroup.add(ring3);

    // 5. Orbiting Nodes/Satellites on Rings
    const nodesGroup = new THREE.Group();
    rootGroup.add(nodesGroup);

    const nodeData = [
      { r: 0.12, dist: 3.1, color: 0xcca052, speed: 0.6, ring: ring1 },
      { r: 0.10, dist: 3.1, color: 0xdfb466, speed: -0.4, ring: ring1 },
      { r: 0.09, dist: 2.7, color: 0xb89a67, speed: 0.8, ring: ring2 },
      { r: 0.11, dist: 3.4, color: 0xcca052, speed: -0.5, ring: ring3 },
      { r: 0.08, dist: 3.4, color: 0xdfb466, speed: 0.7, ring: ring3 },
    ];

    const nodeMeshes: { mesh: THREE.Mesh; dist: number; speed: number; ring: THREE.Mesh; phase: number }[] = [];

    nodeData.forEach((d, i) => {
      const geo = new THREE.SphereGeometry(d.r, 16, 16);
      const mat = new THREE.MeshStandardMaterial({
        color: d.color,
        emissive: d.color,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.6,
      });
      const mesh = new THREE.Mesh(geo, mat);
      d.ring.add(mesh);
      nodeMeshes.push({
        mesh,
        dist: d.dist,
        speed: d.speed,
        ring: d.ring,
        phase: (i * Math.PI * 2) / nodeData.length,
      });
    });

    // Mouse Interaction
    const mouse = new THREE.Vector2(0, 0);
    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / width - 0.5) * 2;
      mouse.y = -((e.clientY - rect.top) / height - 0.5) * 2;
    };
    window.addEventListener("mousemove", onMouseMove);

    const onResize = () => {
      if (!container) return;
      width = container.offsetWidth || 400;
      height = container.offsetHeight || 380;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", onResize);

    let animId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Gentle interactive tilt
      rootGroup.rotation.y += (mouse.x * 0.25 - rootGroup.rotation.y) * 0.04;
      rootGroup.rotation.x += (-mouse.y * 0.2 - rootGroup.rotation.x) * 0.04;

      // Soft breathing scale on capsule
      const breath = 1 + Math.sin(t * 1.2) * 0.025;
      capsuleMesh.scale.set(breath, breath, breath);

      // Continuous subtle ring rotations
      ring1.rotation.z = t * 0.15;
      ring2.rotation.z = -t * 0.18;
      ring3.rotation.z = t * 0.12;

      // Orbit nodes along the ring perimeter
      nodeMeshes.forEach(({ mesh, dist, speed, phase }) => {
        const angle = t * speed + phase;
        mesh.position.x = Math.cos(angle) * dist;
        mesh.position.y = Math.sin(angle) * dist;
        mesh.position.z = 0;
      });

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "340px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "auto",
          cursor: "grab",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 10,
          pointerEvents: "none",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          className="readiness-orb-digit"
          style={{
            fontFamily: '"Space Grotesk", "Space Mono", sans-serif',
            fontSize: "clamp(64px, 7vw, 84px)",
            fontWeight: 700,
            lineHeight: 1,
            opacity: 0.88,
            letterSpacing: "-0.04em",
          }}
        >
          {score}
        </span>
      </div>

      <div
        className="readiness-orb-label"
        style={{
          position: "absolute",
          right: "12px",
          bottom: "12px",
          zIndex: 10,
          pointerEvents: "none",
          fontSize: "9px",
          fontFamily: '"Space Mono", monospace',
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        READINESS FORM
      </div>
    </div>
  );
}
