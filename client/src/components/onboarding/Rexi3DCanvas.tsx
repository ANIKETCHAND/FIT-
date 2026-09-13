/* FitTrack: 3D Animated Rexi Mascot in Three.js */
import { useEffect, useRef } from "react";
import * as THREE from "three";

interface Rexi3DCanvasProps {
  isCelebrating?: boolean;
  step?: "greeting" | "ask_level";
}

export function Rexi3DCanvas({ isCelebrating = false, step = "greeting" }: Rexi3DCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = container.clientHeight || (step === "greeting" ? 280 : 180);

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    // Center camera on Rexi's body center (y=1.1) and slightly back (z=4.2) so full horn is never clipped
    camera.position.set(0, 1.1, 4.2);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    container.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x1a331a, 2.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xc6ff3d, 3.5);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x38bdf8, 4.0, 10);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    const bottomGlow = new THREE.PointLight(0xbaff57, 3.2, 8);
    bottomGlow.position.set(0, -1.0, 1.5);
    scene.add(bottomGlow);

    // 3. Materials
    const bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xa8f53a,
      emissive: 0x225511,
      emissiveIntensity: 0.3,
      roughness: 0.15,
      metalness: 0.05,
      clearcoat: 0.9,
      clearcoatRoughness: 0.1,
      sheen: 0.7,
      sheenColor: new THREE.Color(0xd9f99d),
    });

    const eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x050a06,
      roughness: 0.1,
      metalness: 0.8,
    });

    const eyeHighlightMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    });

    const cheekMaterial = new THREE.MeshStandardMaterial({
      color: 0x4d7c0f,
      roughness: 0.3,
      transparent: true,
      opacity: 0.6,
    });

    // 4. Construct Rexi Character Hierarchy
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Character container
    const character = new THREE.Group();
    rootGroup.add(character);

    // Cute Pear-shaped Body
    const bodyGeometry = new THREE.SphereGeometry(0.85, 36, 36);
    const posAttr = bodyGeometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      let y = posAttr.getY(i);
      let factor = y < 0 ? 1.08 - y * 0.12 : 0.96 + y * 0.04;
      posAttr.setX(i, posAttr.getX(i) * factor);
      posAttr.setZ(i, posAttr.getZ(i) * factor);
    }
    bodyGeometry.computeVertexNormals();

    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.position.y = 0.8;
    character.add(bodyMesh);

    // Curled Horn / Cap on Head
    const hornCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 1.5, 0),
      new THREE.Vector3(-0.15, 1.75, -0.05),
      new THREE.Vector3(-0.35, 1.95, -0.1),
      new THREE.Vector3(-0.25, 2.1, -0.05),
      new THREE.Vector3(-0.05, 2.15, 0),
    ]);
    const hornGeometry = new THREE.TubeGeometry(hornCurve, 24, 0.12, 12, false);
    const hornMesh = new THREE.Mesh(hornGeometry, bodyMaterial);
    character.add(hornMesh);

    // Horn Glowing Tip
    const tipGeometry = new THREE.SphereGeometry(0.12, 16, 16);
    const tipMaterial = new THREE.MeshBasicMaterial({ color: 0xc6ff3d });
    const tipMesh = new THREE.Mesh(tipGeometry, tipMaterial);
    tipMesh.position.set(-0.05, 2.15, 0);
    character.add(tipMesh);

    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.13, 20, 20);
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.28, 0.92, 0.72);
    character.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.28, 0.92, 0.72);
    character.add(rightEye);

    // Eye Highlights (Sparkles)
    const highlightGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const leftSparkle = new THREE.Mesh(highlightGeo, eyeHighlightMaterial);
    leftSparkle.position.set(-0.25, 0.96, 0.82);
    character.add(leftSparkle);

    const rightSparkle = new THREE.Mesh(highlightGeo, eyeHighlightMaterial);
    rightSparkle.position.set(0.31, 0.96, 0.82);
    character.add(rightSparkle);

    // Cheeks (Rosy Green Blush)
    const cheekGeo = new THREE.CircleGeometry(0.1, 16);
    const leftCheek = new THREE.Mesh(cheekGeo, cheekMaterial);
    leftCheek.position.set(-0.45, 0.76, 0.68);
    leftCheek.rotation.y = -0.3;
    character.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, cheekMaterial);
    rightCheek.position.set(0.45, 0.76, 0.68);
    rightCheek.rotation.y = 0.3;
    character.add(rightCheek);

    // Smiling Mouth
    const mouthCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, 0.72, 0.78),
      new THREE.Vector3(0, 0.67, 0.8),
      new THREE.Vector3(0.12, 0.72, 0.78),
    ]);
    const mouthGeo = new THREE.TubeGeometry(mouthCurve, 16, 0.025, 8, false);
    const mouthMesh = new THREE.Mesh(mouthGeo, eyeMaterial);
    character.add(mouthMesh);

    // Cute Paws / Hands
    const handGeo = new THREE.SphereGeometry(0.18, 16, 16);
    const leftHand = new THREE.Mesh(handGeo, bodyMaterial);
    leftHand.position.set(-0.85, 0.65, 0.1);
    character.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, bodyMaterial);
    rightHand.position.set(0.85, 0.65, 0.1);
    character.add(rightHand);

    // Little Stumpy Feet
    const footGeo = new THREE.SphereGeometry(0.2, 16, 16);
    const leftFoot = new THREE.Mesh(footGeo, bodyMaterial);
    leftFoot.position.set(-0.35, 0.05, 0.15);
    leftFoot.scale.set(1, 0.6, 1.4);
    character.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeo, bodyMaterial);
    rightFoot.position.set(0.35, 0.05, 0.15);
    rightFoot.scale.set(1, 0.6, 1.4);
    character.add(rightFoot);

    // Interactive Ground Shadow
    const shadowGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.05;
    rootGroup.add(shadowMesh);

    // Futuristic Holographic Energy Ring on ground
    const ringGeo = new THREE.RingGeometry(0.85, 0.95, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xc6ff3d,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -0.04;
    rootGroup.add(ringMesh);

    // 5. Mouse Interaction
    const mouse = { x: 0, y: 0 };
    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      mouse.x = x * 2;
      mouse.y = y * 2;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // 6. Animation Loop (Squash, Stretch, Bobbing & Jumping)
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Bouncy Jump physics
      const jumpCycle = time * 2.8;
      const rawJump = Math.max(0, Math.sin(jumpCycle));
      const jumpY = rawJump * 0.45;

      // Squash and stretch
      const squashStretch = 1 + (rawJump > 0.05 ? 0.12 * rawJump : -0.08 * Math.cos(jumpCycle * 2));
      const inverseStretch = 1 / Math.sqrt(squashStretch);

      character.position.y = jumpY;
      character.scale.set(inverseStretch, squashStretch, inverseStretch);

      // Shadow scaling
      const shadowScale = Math.max(0.4, 1 - rawJump * 0.55);
      shadowMesh.scale.set(shadowScale, shadowScale, 1);
      shadowMat.opacity = Math.max(0.15, 0.5 - rawJump * 0.35);

      // Energy Ring
      ringMesh.rotation.z = time * 1.5;
      ringMat.opacity = 0.25 + Math.sin(time * 3) * 0.15;

      // Waving Paws
      leftHand.position.y = 0.65 + Math.sin(time * 6) * 0.12;
      leftHand.position.x = -0.85 + Math.cos(time * 3) * 0.05;
      rightHand.position.y = 0.65 + Math.cos(time * 6) * 0.12;
      rightHand.position.x = 0.85 - Math.cos(time * 3) * 0.05;

      // Horn Wiggle
      hornMesh.rotation.z = Math.sin(time * 5) * 0.08;

      // If Celebrating: Joyful Backflip
      if (isCelebrating) {
        character.rotation.x = time * 8;
        character.rotation.y = time * 4;
      } else {
        character.rotation.y = mouse.x * 0.45;
        character.rotation.x = -mouse.y * 0.25;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isCelebrating, step]);

  return (
    <div
      ref={mountRef}
      className={`w-full flex items-center justify-center relative cursor-grab active:cursor-grabbing ${
        step === "greeting" ? "h-[280px]" : "h-[180px]"
      }`}
    />
  );
}
