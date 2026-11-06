import * as THREE from 'three';
import type { AgentVisualState } from './AgentStatusBadge';

export interface Agent3DInstance {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  updateStatus: (status: AgentVisualState) => void;
  updateMousePosition: (x: number, y: number) => void;
  triggerPulse: () => void;
  dispose: () => void;
}

export function createCampusFlowAgent3D(container: HTMLElement, initialStatus: AgentVisualState = 'IDLE'): Agent3DInstance {
  // 1. Scene Setup with Atmospheric Deep-Slate Fog
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020617, 0.045);

  const width = container.clientWidth || 400;
  const height = container.clientHeight || 400;

  // 2. Camera Setup with Cinematic Field of View
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0.35, 5.2);

  // 3. Renderer Setup with High-Performance Antialiasing
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = false; // Shadows disabled — avoids PCFSoftShadowMap deprecation warning in Three.js r186+
  container.appendChild(renderer.domElement);

  // 4. Cinematic Dynamic Lighting Rig
  const ambientLight = new THREE.AmbientLight(0x0f172a, 1.4);
  scene.add(ambientLight);

  const mainLight = new THREE.DirectionalLight(0xffffff, 2.2);
  mainLight.position.set(5, 8, 6);
  mainLight.castShadow = false;
  scene.add(mainLight);

  // Dynamic Central Core Point Light (Reacts directly to AI Cognitive States)
  const coreLight = new THREE.PointLight(0x6366f1, 4.0, 14);
  coreLight.position.set(0, 0.4, 0);
  scene.add(coreLight);

  // Warm Amber University Gold Accent Light
  const goldAccentLight = new THREE.PointLight(0xf59e0b, 2.8, 12);
  goldAccentLight.position.set(-3.5, 3, 2);
  scene.add(goldAccentLight);

  // Cyan Cybernetic Fill Rim Light
  const cyanRimLight = new THREE.PointLight(0x06b6d4, 2.8, 12);
  cyanRimLight.position.set(3.5, -2, -2);
  scene.add(cyanRimLight);

  // 5. Construct Autonomous AI Agent Assembly
  const masterGroup = new THREE.Group();
  scene.add(masterGroup);

  // ── Central Neural Core ──
  const coreGroup = new THREE.Group();
  masterGroup.add(coreGroup);
  coreGroup.position.y = 0.3;

  // Inner Geometric Crystal (Pulsing Energy Nucleus)
  const innerCoreGeo = new THREE.IcosahedronGeometry(0.5, 1);
  const innerCoreMat = new THREE.MeshStandardMaterial({
    color: 0x6366f1,
    emissive: 0x6366f1,
    emissiveIntensity: 1.4,
    metalness: 0.92,
    roughness: 0.08,
  });
  const innerCoreMesh = new THREE.Mesh(innerCoreGeo, innerCoreMat);
  coreGroup.add(innerCoreMesh);

  // Outer Crystalline Lattice Cage
  const latticeGeo = new THREE.IcosahedronGeometry(0.6, 1);
  const latticeMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.7,
    metalness: 0.95,
    roughness: 0.1,
    wireframe: true,
  });
  const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
  coreGroup.add(latticeMesh);

  // Holographic Eye Visor (Directional Cursor Tracking Lens)
  const eyeRingGeo = new THREE.TorusGeometry(0.25, 0.035, 16, 32);
  const eyeRingMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.0,
    metalness: 0.85,
    roughness: 0.1,
  });
  const eyeRingMesh = new THREE.Mesh(eyeRingGeo, eyeRingMat);
  eyeRingMesh.position.set(0, 0.05, 0.54);
  coreGroup.add(eyeRingMesh);

  const eyePupilGeo = new THREE.SphereGeometry(0.085, 16, 16);
  const eyePupilMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 2.8,
  });
  const eyePupilMesh = new THREE.Mesh(eyePupilGeo, eyePupilMat);
  eyePupilMesh.position.set(0, 0.05, 0.54);
  coreGroup.add(eyePupilMesh);

  // ── Triple Concentric Quantum Gyroscope Rings ──
  // Ring 1 (Inner X/Z axis)
  const ring1Geo = new THREE.TorusGeometry(1.0, 0.022, 16, 80);
  const ring1Mat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.8,
    metalness: 0.9,
    roughness: 0.15,
  });
  const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
  coreGroup.add(ring1);

  // Ring 2 (Middle Y/Z axis - Counter-rotating)
  const ring2Geo = new THREE.TorusGeometry(1.28, 0.018, 16, 80);
  const ring2Mat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.9,
    metalness: 0.9,
    roughness: 0.15,
  });
  const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
  coreGroup.add(ring2);

  // Ring 3 (Outer Horizon Ring with Satellite Circuit Nodes)
  const ring3Geo = new THREE.TorusGeometry(1.55, 0.015, 16, 80);
  const ring3Mat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    emissive: 0x8b5cf6,
    emissiveIntensity: 0.7,
    metalness: 0.9,
    roughness: 0.15,
  });
  const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
  coreGroup.add(ring3);

  // 4 Orbiting Satellite Node Spheres attached to Ring 3
  const nodeBeadGeo = new THREE.SphereGeometry(0.05, 16, 16);
  const nodeBeadMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.2,
  });
  const satelliteNodes: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const bead = new THREE.Mesh(nodeBeadGeo, nodeBeadMat);
    const ang = (i * Math.PI) / 2;
    bead.position.set(Math.cos(ang) * 1.55, Math.sin(ang) * 1.55, 0);
    ring3.add(bead);
    satelliteNodes.push(bead);
  }

  // Floating Academic Halo Crown (Honorary Mortarboard Ring)
  const haloGeo = new THREE.TorusGeometry(0.76, 0.024, 16, 64);
  const haloMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.1,
    metalness: 0.9,
    roughness: 0.1,
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.position.y = 1.4;
  haloMesh.rotation.x = Math.PI / 2.3;
  coreGroup.add(haloMesh);

  // ── Orbiting Holographic Knowledge Shards (Documents & Policies) ──
  const shardsGroup = new THREE.Group();
  coreGroup.add(shardsGroup);

  const shardGeo = new THREE.BoxGeometry(0.26, 0.36, 0.018);
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x06b6d4,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.8,
  });

  const shardBorderGeo = new THREE.BoxGeometry(0.265, 0.365, 0.019);
  const shardBorderMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
  });

  const shardMeshes: THREE.Group[] = [];
  const shardCount = 4;
  for (let i = 0; i < shardCount; i++) {
    const singleShard = new THREE.Group();
    const faceMesh = new THREE.Mesh(shardGeo, shardMat);
    const lineMesh = new THREE.Mesh(shardBorderGeo, shardBorderMat);
    singleShard.add(faceMesh);
    singleShard.add(lineMesh);

    const angle = (i * Math.PI * 2) / shardCount;
    singleShard.position.set(Math.cos(angle) * 2.05, 0, Math.sin(angle) * 2.05);
    shardsGroup.add(singleShard);
    shardMeshes.push(singleShard);
  }

  // ── Interactive Shockwave Pulse Ring (Triggered on Click) ──
  const shockwaveGeo = new THREE.RingGeometry(0.1, 0.18, 48);
  const shockwaveMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
  });
  const shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
  shockwaveMesh.rotation.x = Math.PI / 2;
  coreGroup.add(shockwaveMesh);

  // ── Quantum Neural Particle Vortex (350 Glowing Star Points) ──
  const particleCount = 350;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);
  const particleSpeeds = new Float32Array(particleCount);

  for (let i = 0; i < particleCount * 3; i += 3) {
    const rad = 1.3 + Math.random() * 2.6;
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI;

    particlePositions[i] = rad * Math.cos(phi) * Math.sin(theta);
    particlePositions[i + 1] = rad * Math.sin(phi);
    particlePositions[i + 2] = rad * Math.cos(phi) * Math.cos(theta);
    particleSpeeds[i / 3] = 0.5 + Math.random() * 1.5;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    size: 0.048,
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
  });
  const particleCloud = new THREE.Points(particleGeo, particleMat);
  scene.add(particleCloud);

  // ── Double Helix Neural DNA Stream (Swirling Data Flow) ──
  const helixCount = 60;
  const helixGeo = new THREE.BufferGeometry();
  const helixPositions = new Float32Array(helixCount * 2 * 3);

  for (let i = 0; i < helixCount; i++) {
    const t = (i / helixCount) * Math.PI * 4;
    const y = (i / helixCount) * 3.0 - 1.5;
    const r = 1.1;

    // Strand A
    helixPositions[i * 6] = Math.cos(t) * r;
    helixPositions[i * 6 + 1] = y;
    helixPositions[i * 6 + 2] = Math.sin(t) * r;

    // Strand B (180 deg out of phase)
    helixPositions[i * 6 + 3] = Math.cos(t + Math.PI) * r;
    helixPositions[i * 6 + 4] = y;
    helixPositions[i * 6 + 5] = Math.sin(t + Math.PI) * r;
  }

  helixGeo.setAttribute('position', new THREE.BufferAttribute(helixPositions, 3));
  const helixMat = new THREE.PointsMaterial({
    size: 0.05,
    color: 0x06b6d4,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  });
  const helixPoints = new THREE.Points(helixGeo, helixMat);
  coreGroup.add(helixPoints);

  // ── Holographic Ground Grid (Cinematic Infinite Matrix) ──
  const gridHelper = new THREE.GridHelper(18, 28, 0xf59e0b, 0x1e293b);
  gridHelper.position.y = -1.7;
  (gridHelper.material as THREE.Material).transparent = true;
  (gridHelper.material as THREE.Material).opacity = 0.38;
  scene.add(gridHelper);

  // ── State Management & Interaction ──
  let mouseX = 0;
  let mouseY = 0;
  let targetRotY = 0;
  let targetRotX = 0;
  let currentStatus = initialStatus;
  let animFrameId: number;
  let pulseIntensity = 0;
  let shockwaveScale = 0.1;
  const startTime = performance.now();

  function applyStatusColor(status: AgentVisualState) {
    currentStatus = status;

    if (status === 'THINKING') {
      innerCoreMat.color.setHex(0xa855f7);
      innerCoreMat.emissive.setHex(0xa855f7);
      coreLight.color.setHex(0xa855f7);
      eyeRingMat.emissive.setHex(0xa855f7);
      particleMat.color.setHex(0xc084fc);
      shockwaveMat.color.setHex(0xa855f7);
      helixMat.color.setHex(0xc084fc);
    } else if (status === 'SEARCHING') {
      innerCoreMat.color.setHex(0xf59e0b);
      innerCoreMat.emissive.setHex(0xf59e0b);
      coreLight.color.setHex(0xf59e0b);
      eyeRingMat.emissive.setHex(0xf59e0b);
      particleMat.color.setHex(0xfcd34d);
      shockwaveMat.color.setHex(0xf59e0b);
      helixMat.color.setHex(0xf59e0b);
    } else if (status === 'PLANNING') {
      innerCoreMat.color.setHex(0x06b6d4);
      innerCoreMat.emissive.setHex(0x06b6d4);
      coreLight.color.setHex(0x06b6d4);
      eyeRingMat.emissive.setHex(0x06b6d4);
      particleMat.color.setHex(0x67e8f9);
      shockwaveMat.color.setHex(0x06b6d4);
      helixMat.color.setHex(0x38bdf8);
    } else if (status === 'VERIFYING') {
      innerCoreMat.color.setHex(0x10b981);
      innerCoreMat.emissive.setHex(0x10b981);
      coreLight.color.setHex(0x10b981);
      eyeRingMat.emissive.setHex(0x10b981);
      particleMat.color.setHex(0x6ee7b7);
      shockwaveMat.color.setHex(0x10b981);
      helixMat.color.setHex(0x34d399);
    } else if (status === 'WAITING_APPROVAL') {
      innerCoreMat.color.setHex(0xd97706);
      innerCoreMat.emissive.setHex(0xd97706);
      coreLight.color.setHex(0xd97706);
      eyeRingMat.emissive.setHex(0xf59e0b);
      particleMat.color.setHex(0xfde68a);
      shockwaveMat.color.setHex(0xf59e0b);
      helixMat.color.setHex(0xfbbf24);
    } else if (status === 'SUCCESS') {
      innerCoreMat.color.setHex(0x10b981);
      innerCoreMat.emissive.setHex(0x10b981);
      coreLight.color.setHex(0x10b981);
      eyeRingMat.emissive.setHex(0x34d399);
      particleMat.color.setHex(0xa7f3d0);
      shockwaveMat.color.setHex(0x10b981);
      helixMat.color.setHex(0x6ee7b7);
    } else if (status === 'ERROR') {
      innerCoreMat.color.setHex(0xef4444);
      innerCoreMat.emissive.setHex(0xef4444);
      coreLight.color.setHex(0xef4444);
      eyeRingMat.emissive.setHex(0xf87171);
      particleMat.color.setHex(0xfca5a5);
      shockwaveMat.color.setHex(0xef4444);
      helixMat.color.setHex(0xf87171);
    } else {
      // IDLE (Indigo / Amber / Cyan)
      innerCoreMat.color.setHex(0x6366f1);
      innerCoreMat.emissive.setHex(0x6366f1);
      coreLight.color.setHex(0x6366f1);
      eyeRingMat.emissive.setHex(0x06b6d4);
      particleMat.color.setHex(0x38bdf8);
      shockwaveMat.color.setHex(0x38bdf8);
      helixMat.color.setHex(0x06b6d4);
    }
  }

  applyStatusColor(initialStatus);

  // 6. Next-Gen 3D Animation Loop
  function animate() {
    animFrameId = requestAnimationFrame(animate);
    const elapsedTime = (performance.now() - startTime) * 0.001;

    // Pulse decay & shockwave animation
    if (pulseIntensity > 0) {
      pulseIntensity *= 0.94;
      shockwaveScale += 0.12;
      shockwaveMesh.scale.set(shockwaveScale, shockwaveScale, shockwaveScale);
      shockwaveMat.opacity = Math.max(0, pulseIntensity * 0.8);
      if (pulseIntensity < 0.02) {
        pulseIntensity = 0;
        shockwaveMat.opacity = 0;
      }
    }

    // Dynamic speeds based on Agent cognitive state
    const speedMultiplier = 
      currentStatus === 'SEARCHING' ? 2.5 :
      currentStatus === 'THINKING' ? 2.0 :
      currentStatus === 'VERIFYING' ? 1.6 : 1.0;

    // Organic Breathing Levitation
    const levitateY = Math.sin(elapsedTime * 1.8) * 0.13;
    coreGroup.position.y = 0.3 + levitateY;

    // Breathing Scale on Inner Core
    const breathScale = 1.0 + Math.sin(elapsedTime * 3.0) * 0.07 + pulseIntensity * 0.25;
    innerCoreMesh.scale.set(breathScale, breathScale, breathScale);

    // Inner Core & Lattice Dual-Axis Counter-Rotation
    innerCoreMesh.rotation.y = elapsedTime * 0.65 * speedMultiplier;
    innerCoreMesh.rotation.x = elapsedTime * 0.45 * speedMultiplier;

    latticeMesh.rotation.y = -elapsedTime * 0.55 * speedMultiplier;
    latticeMesh.rotation.z = elapsedTime * 0.35 * speedMultiplier;

    // Concentric Gyroscope Rings Rotation with Orbital Harmonic Precession
    ring1.rotation.x = elapsedTime * 0.85 * speedMultiplier;
    ring1.rotation.z = Math.sin(elapsedTime * 0.5) * 0.45;

    ring2.rotation.y = -elapsedTime * 0.95 * speedMultiplier;
    ring2.rotation.x = Math.cos(elapsedTime * 0.6) * 0.45;

    ring3.rotation.z = elapsedTime * 0.75 * speedMultiplier;
    ring3.rotation.y = Math.sin(elapsedTime * 0.4) * 0.35;

    // Double Helix Stream Rotation
    helixPoints.rotation.y = -elapsedTime * 0.8 * speedMultiplier;

    // Halo Undulation
    haloMesh.rotation.z = elapsedTime * 0.65;
    haloMesh.position.y = 1.4 + Math.sin(elapsedTime * 2.2) * 0.06;

    // Orbiting Knowledge Shards
    shardsGroup.rotation.y = elapsedTime * 0.55 * speedMultiplier;
    for (let i = 0; i < shardMeshes.length; i++) {
      const shard = shardMeshes[i];
      shard.position.y = Math.sin(elapsedTime * 2.0 + i) * 0.16;
      shard.rotation.y = elapsedTime * 0.85 + i;
      shard.rotation.x = Math.sin(elapsedTime + i) * 0.22;
    }

    // Dynamic Starfield Particle Vortex Swirl
    particleCloud.rotation.y = elapsedTime * 0.07 * speedMultiplier;
    particleCloud.rotation.x = Math.sin(elapsedTime * 0.035) * 0.09;

    // Core Light Pulsation with Audio-reactive Style Glow
    coreLight.intensity = 3.2 + Math.sin(elapsedTime * 4.2) * 1.3 + pulseIntensity * 4.5;

    // Specular Light Tracking with Mouse
    goldAccentLight.position.x = -3.5 + mouseX * 1.5;
    cyanRimLight.position.x = 3.5 - mouseX * 1.5;

    // Smooth Mouse Gaze & Orientation Lerp
    targetRotY = mouseX * 0.65;
    targetRotX = -mouseY * 0.45;
    masterGroup.rotation.y = THREE.MathUtils.lerp(masterGroup.rotation.y, targetRotY, 0.07);
    masterGroup.rotation.x = THREE.MathUtils.lerp(masterGroup.rotation.x, targetRotX, 0.07);

    // Subtle Ground Grid Drift
    gridHelper.position.z = (elapsedTime * 0.22) % 0.64;

    renderer.render(scene, camera);
  }

  animate();

  // Responsive Container Resize Handler
  function handleResize() {
    if (!container) return;
    const w = container.clientWidth || 400;
    const h = container.clientHeight || 400;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener('resize', handleResize);

  return {
    scene,
    camera,
    renderer,
    updateStatus: applyStatusColor,
    updateMousePosition: (x: number, y: number) => {
      mouseX = x;
      mouseY = y;
    },
    triggerPulse: () => {
      pulseIntensity = 1.0;
      shockwaveScale = 0.2;
      shockwaveMesh.scale.set(0.2, 0.2, 0.2);
    },
    dispose: () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    }
  };
}

