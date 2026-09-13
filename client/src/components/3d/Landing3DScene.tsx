import { useEffect, useRef } from "react";
import * as THREE from "three";

export function Landing3DScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let width = window.innerWidth || 1;
    let height = window.innerHeight || 1;

    // 1. Three.js Scene, Camera & Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x080a09, 0.022);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup (warm espresso/beige palette)
    const ambientLight = new THREE.AmbientLight(0x2a2018, 2.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xe7d0a6, 3.2);
    dirLight.position.set(4, 7, 8);
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0xd9a86a, 3.8, 40);
    blueLight.position.set(-8, -2, 6);
    scene.add(blueLight);

    const limeLight = new THREE.PointLight(0xe7d0a6, 4.5, 35);
    limeLight.position.set(7, 3, 7);
    scene.add(limeLight);

    // 3. Fullscreen 3D Translucent Muscular Back Anatomy Plane
    const group = new THREE.Group();
    scene.add(group);

    const textureLoader = new THREE.TextureLoader();
    const backTexture = textureLoader.load("/assets/muscular-back-anatomy.png");
    backTexture.colorSpace = THREE.SRGBColorSpace;

    // Function to calculate exact plane dimensions to cover full viewport
    const calcDimensions = () => {
      const vFOV = (camera.fov * Math.PI) / 180;
      const visibleH = 2 * Math.tan(vFOV / 2) * camera.position.z;
      const visibleW = visibleH * camera.aspect;
      // Generously cover entire screen with bleed. Guard against NaN/Infinity
      // (e.g. a 0x0 viewport at mount makes camera.aspect NaN, and Math.max
      // propagates NaN into the geometry -> "Computed radius is NaN").
      const planeW = Number.isFinite(visibleW) ? Math.max(visibleW * 1.15, 24) : 24;
      const planeH = Number.isFinite(visibleH) ? Math.max(visibleH * 1.15, 14.5) : 14.5;
      return { planeW, planeH };
    };

    let { planeW, planeH } = calcDimensions();
    const planeGeo = new THREE.PlaneGeometry(planeW, planeH, 32, 32);

    // Translucent Material (tuned to ~0.54 for clearer silhouette and muscle visibility)
    const planeMat = new THREE.MeshStandardMaterial({
      map: backTexture,
      transparent: true,
      opacity: 0.54,
      roughness: 0.3,
      metalness: 0.15,
      emissive: 0x0d2214,
      emissiveIntensity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const backMesh = new THREE.Mesh(planeGeo, planeMat);
    backMesh.position.set(0, 0, -0.4);
    group.add(backMesh);

    // 4. Large Concentric Holographic HUD Target Rings
    const createHudRing = (radius: number, color: number, opacity: number, dashSegments = 64) => {
      const ringGeo = new THREE.RingGeometry(radius - 0.03, radius, dashSegments);
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
      });
      return new THREE.Mesh(ringGeo, ringMat);
    };

    const ring1 = createHudRing(8.5, 0xc6ff3d, 0.14, 64);
    const ring2 = createHudRing(11.2, 0xa6d9ff, 0.10, 80);
    const ring3 = createHudRing(13.8, 0x1f4427, 0.22, 48);
    ring1.position.set(0, 0, -1);
    ring2.position.set(0, 0, -1.2);
    ring3.position.set(0, 0, -1.4);
    group.add(ring1);
    group.add(ring2);
    group.add(ring3);

    // 5. 3D Floating Particle Constellation (850 particles)
    const particleCount = 850;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    const cLime = new THREE.Color(0xc6ff3d);
    const cCyan = new THREE.Color(0xa6d9ff);
    const cMint = new THREE.Color(0x73c280);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      particlePositions[i3] = (Math.random() - 0.5) * 44;
      particlePositions[i3 + 1] = (Math.random() - 0.5) * 28;
      particlePositions[i3 + 2] = (Math.random() - 0.5) * 24;

      const pick = Math.random();
      const col = pick > 0.55 ? cLime : pick > 0.3 ? cCyan : cMint;
      particleColors[i3] = col.r;
      particleColors[i3 + 1] = col.g;
      particleColors[i3 + 2] = col.b;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 0.14,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 6. Perspective Ground Coordinate Grid
    const gridHelper = new THREE.GridHelper(48, 48, 0xc6ff3d, 0x14281a);
    gridHelper.position.set(0, -6.5, 0);
    if (Array.isArray(gridHelper.material)) {
      gridHelper.material.forEach((m) => {
        m.transparent = true;
        m.opacity = 0.16;
      });
    } else {
      gridHelper.material.transparent = true;
      gridHelper.material.opacity = 0.16;
    }
    scene.add(gridHelper);

    // 7. Mouse Interactivity / Parallax Tracking
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Window resize handler
    const handleResize = () => {
      width = window.innerWidth || 1;
      height = window.innerHeight || 1;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);

      const sz = calcDimensions();
      backMesh.geometry.dispose();
      backMesh.geometry = new THREE.PlaneGeometry(sz.planeW, sz.planeH, 32, 32);
    };
    window.addEventListener("resize", handleResize);

    // 8. 60 FPS Render Loop
    let clock = new THREE.Clock();
    let animId: number;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Smooth camera / object parallax lerp
      targetX += (mouseX * 0.35 - targetX) * 0.035;
      targetY += (mouseY * 0.25 - targetY) * 0.035;

      group.rotation.y = targetX * 0.4 + Math.sin(elapsed * 0.25) * 0.025;
      group.rotation.x = -targetY * 0.25 + Math.cos(elapsed * 0.2) * 0.02;

      // Subtle breathing pulsation
      const breath = 1 + Math.sin(elapsed * 0.8) * 0.012;
      backMesh.scale.set(breath, breath, 1);

      // HUD Ring dynamic rotation
      ring1.rotation.z = elapsed * 0.12;
      ring2.rotation.z = -elapsed * 0.08;
      ring3.rotation.z = elapsed * 0.05;

      // Pulse lighting orbits
      limeLight.position.x = Math.sin(elapsed * 0.6) * 8;
      limeLight.position.y = Math.cos(elapsed * 0.5) * 4 + 1;
      blueLight.position.x = -Math.sin(elapsed * 0.5) * 9;
      blueLight.position.y = -Math.cos(elapsed * 0.4) * 4;

      // Particle subtle drift
      particles.rotation.y = elapsed * 0.015;
      particles.rotation.x = Math.sin(elapsed * 0.008) * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="landing-canvas-wrapper" ref={mountRef} aria-hidden="true" />
  );
}
