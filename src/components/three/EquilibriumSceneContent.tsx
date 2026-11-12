"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Edges, Environment, Lightformer, useTexture } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import * as THREE from "three";
import {
  useEquilibriumScene,
  type StratumFocus,
} from "@/context/EquilibriumSceneContext";
import {
  conduitFragmentShader,
  conduitVertexShader,
  terrainFragmentShader,
  terrainVertexShader,
} from "./shaders/ledgerShaders";

interface StratumSpec {
  id: Exclude<StratumFocus, null>;
  restPos: [number, number, number];
  expandedPos: [number, number, number];
  restRot: [number, number, number];
  accent: string;
}

const STRATA_SPECS: StratumSpec[] = [
  {
    id: "pnl",
    restPos: [-0.42, 0.72, 0.42],
    expandedPos: [-2.25, 1.05, 0.35],
    restRot: [0.06, 0.25, -0.04],
    accent: "#60A5FA",
  },
  {
    id: "balance-sheet",
    restPos: [0.42, 0.36, -0.35],
    expandedPos: [2.25, 1.05, 0.35],
    restRot: [-0.04, -0.25, 0.05],
    accent: "#1E6BFF",
  },
  {
    id: "tax",
    restPos: [-0.38, -0.36, -0.35],
    expandedPos: [-2.25, -0.95, 0.35],
    restRot: [-0.05, 0.22, 0.04],
    accent: "#93C5FD",
  },
  {
    id: "treasury",
    restPos: [0.42, -0.72, 0.42],
    expandedPos: [2.25, -0.95, 0.35],
    restRot: [0.04, -0.22, -0.04],
    accent: "#10B981",
  },
];

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function SplineCameraRig() {
  const { scrollProgressRef, pointerRef } = useEquilibriumScene();

  const { posCurve, lookCurve } = useMemo(() => {
    const posCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.1, 0.85, 8.4),
      new THREE.Vector3(-2.8, 1.7, 6.4),
      new THREE.Vector3(0.0, 0.28, 5.5),
      new THREE.Vector3(3.0, 1.45, 6.2),
      new THREE.Vector3(0.0, 3.6, 9.0),
    ]);

    const lookCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.55, 0.08, 0.0),
      new THREE.Vector3(0.0, 0.2, 0.0),
      new THREE.Vector3(0.0, 0.0, 0.0),
      new THREE.Vector3(0.25, 0.0, 0.0),
      new THREE.Vector3(0.0, -0.35, -1.6),
    ]);

    return { posCurve, lookCurve };
  }, []);

  const targetPosRef = useRef(new THREE.Vector3());
  const targetLookRef = useRef(new THREE.Vector3());
  const smoothedLookRef = useRef(new THREE.Vector3(-1.55, 0.08, 0));

  useFrame((state, delta) => {
    const p = Math.min(1, Math.max(0, scrollProgressRef.current));
    const targetPos = targetPosRef.current;
    const targetLook = targetLookRef.current;
    const smoothedLook = smoothedLookRef.current;

    posCurve.getPointAt(p, targetPos);
    lookCurve.getPointAt(p, targetLook);

    const px = pointerRef.current.x * 0.42;
    const py = pointerRef.current.y * 0.24;

    state.camera.position.x = THREE.MathUtils.damp(
      state.camera.position.x,
      targetPos.x + px,
      4.2,
      delta
    );
    state.camera.position.y = THREE.MathUtils.damp(
      state.camera.position.y,
      targetPos.y + py,
      4.2,
      delta
    );
    state.camera.position.z = THREE.MathUtils.damp(
      state.camera.position.z,
      targetPos.z,
      4.2,
      delta
    );

    smoothedLook.x = THREE.MathUtils.damp(
      smoothedLook.x,
      targetLook.x + px * 0.25,
      4.8,
      delta
    );
    smoothedLook.y = THREE.MathUtils.damp(
      smoothedLook.y,
      targetLook.y + py * 0.2,
      4.8,
      delta
    );
    smoothedLook.z = THREE.MathUtils.damp(
      smoothedLook.z,
      targetLook.z,
      4.8,
      delta
    );

    state.camera.lookAt(smoothedLook);
  });

  return null;
}

function EquilibriumVaultAssembly({
  normalMap,
  strataAlbedo,
  reconcilePulseRef,
}: {
  normalMap: THREE.Texture;
  strataAlbedo: THREE.Texture;
  reconcilePulseRef: React.MutableRefObject<number>;
}) {
  const {
    scrollProgressRef,
    pointerRef,
    hoveredStratumRef,
    activeScenario,
    activeScenarioId,
  } = useEquilibriumScene();

  const assemblyRef = useRef<THREE.Group>(null);
  const coreMeshRef = useRef<THREE.Mesh>(null);
  const prismRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const strataRefs = useRef<(THREE.Group | null)[]>([]);
  const conduitMatsRef = useRef<(THREE.ShaderMaterial | null)[]>([]);

  const tiltImpulseRef = useRef(0);
  const prevScenarioRef = useRef(activeScenarioId);

  useEffect(() => {
    if (prevScenarioRef.current !== activeScenarioId) {
      prevScenarioRef.current = activeScenarioId;
      tiltImpulseRef.current = THREE.MathUtils.degToRad(
        activeScenario.monolithTiltDeg || 3.2
      );
      reconcilePulseRef.current = 1.0;
    }
  }, [activeScenarioId, activeScenario.monolithTiltDeg, reconcilePulseRef]);

  const conduitGeometries = useMemo(() => {
    return STRATA_SPECS.map((spec) => {
      const start = new THREE.Vector3(...spec.expandedPos);
      const mid = new THREE.Vector3(
        spec.expandedPos[0] * 0.45,
        spec.expandedPos[1] * 0.25,
        0.55
      );
      const end = new THREE.Vector3(0, 0, 0);
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      return new THREE.TubeGeometry(curve, 32, 0.016, 8, false);
    });
  }, []);

  const conduitMaterials = useMemo(() => {
    return STRATA_SPECS.map(
      () =>
        new THREE.ShaderMaterial({
          vertexShader: conduitVertexShader,
          fragmentShader: conduitFragmentShader,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          uniforms: {
            uTime: { value: 0 },
            uSpeed: { value: 1 },
            uHighlighted: { value: 0 },
            uReconciledPulse: { value: 0 },
            uOpacity: { value: 0 },
          },
        })
    );
  }, []);

  useEffect(() => {
    return () => {
      conduitGeometries.forEach((g) => g.dispose());
      conduitMaterials.forEach((m) => m.dispose());
    };
  }, [conduitGeometries, conduitMaterials]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const p = scrollProgressRef.current;

    // 0 -> 1 expansion around Chapters 2-3, gentle re-convergence at Chapter 5
    const open = smoothstep(0.12, 0.44, p);
    const close = smoothstep(0.76, 0.98, p);
    const expansion = Math.max(0, open - close * 0.72);

    reconcilePulseRef.current = THREE.MathUtils.damp(
      reconcilePulseRef.current,
      0,
      2.1,
      delta
    );
    tiltImpulseRef.current = THREE.MathUtils.damp(
      tiltImpulseRef.current,
      0,
      3.4,
      delta
    );

    if (assemblyRef.current) {
      const targetRotY =
        Math.sin(t * 0.22) * 0.14 +
        p * Math.PI * 0.45 +
        pointerRef.current.x * 0.14;
      assemblyRef.current.rotation.y = THREE.MathUtils.damp(
        assemblyRef.current.rotation.y,
        targetRotY,
        4,
        delta
      );
      assemblyRef.current.rotation.z = tiltImpulseRef.current;
      assemblyRef.current.position.y = Math.sin(t * 0.7) * 0.08;
    }

    if (coreMeshRef.current) {
      const coreScale = 1 - expansion * 0.42;
      coreMeshRef.current.scale.setScalar(
        THREE.MathUtils.damp(coreMeshRef.current.scale.x, coreScale, 5, delta)
      );
      coreMeshRef.current.rotation.y += delta * 0.12;
    }

    if (prismRef.current) {
      prismRef.current.rotation.y -= delta * 0.48;
      prismRef.current.rotation.x = Math.sin(t * 0.6) * 0.18;
      const pulseScale = 1 + reconcilePulseRef.current * 0.28;
      prismRef.current.scale.setScalar(
        THREE.MathUtils.damp(prismRef.current.scale.x, pulseScale, 6, delta)
      );
    }

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.24;
      ringRef.current.scale.setScalar(0.85 + expansion * 0.65);
    }

    STRATA_SPECS.forEach((spec, idx) => {
      const group = strataRefs.current[idx];
      if (!group) return;

      const isHovered = hoveredStratumRef.current === spec.id;
      const hoverBoost = isHovered ? 0.35 : 0;

      const tx = THREE.MathUtils.lerp(
        spec.restPos[0],
        spec.expandedPos[0],
        expansion
      );
      const ty =
        THREE.MathUtils.lerp(spec.restPos[1], spec.expandedPos[1], expansion) +
        Math.sin(t * 0.9 + idx * 1.4) * 0.05;
      const tz =
        THREE.MathUtils.lerp(spec.restPos[2], spec.expandedPos[2], expansion) +
        hoverBoost;

      group.position.x = THREE.MathUtils.damp(group.position.x, tx, 5, delta);
      group.position.y = THREE.MathUtils.damp(group.position.y, ty, 5, delta);
      group.position.z = THREE.MathUtils.damp(group.position.z, tz, 5, delta);

      const rx = THREE.MathUtils.lerp(spec.restRot[0], 0, expansion);
      const ry = THREE.MathUtils.lerp(
        spec.restRot[1],
        spec.expandedPos[0] > 0 ? -0.14 : 0.14,
        expansion
      );
      const rz = THREE.MathUtils.lerp(spec.restRot[2], 0, expansion);

      group.rotation.x = THREE.MathUtils.damp(group.rotation.x, rx, 5, delta);
      group.rotation.y = THREE.MathUtils.damp(group.rotation.y, ry, 5, delta);
      group.rotation.z = THREE.MathUtils.damp(group.rotation.z, rz, 5, delta);

      const mat = conduitMatsRef.current[idx];
      if (mat) {
        mat.uniforms.uTime.value = t;
        mat.uniforms.uSpeed.value = activeScenario.particleVelocity;
        mat.uniforms.uHighlighted.value = THREE.MathUtils.damp(
          mat.uniforms.uHighlighted.value,
          isHovered ? 1 : 0,
          6,
          delta
        );
        mat.uniforms.uReconciledPulse.value = reconcilePulseRef.current;
        mat.uniforms.uOpacity.value = expansion;
      }
    });
  });

  return (
    <group ref={assemblyRef}>
      {/* Central Machined Obsidian Core */}
      <mesh ref={coreMeshRef} castShadow receiveShadow>
        <cylinderGeometry args={[0.68, 0.86, 3.25, 8, 1]} />
        <meshStandardMaterial
          color="#07112B"
          metalness={0.86}
          roughness={0.28}
          bumpMap={normalMap}
          bumpScale={0.045}
          envMapIntensity={1.25}
        />
        <Edges color="#1E6BFF" threshold={18} />
      </mesh>

      {/* Inner Equilibrium Core Prism (pulses emerald on Δ=0.00 lock) */}
      <mesh ref={prismRef}>
        <octahedronGeometry args={[0.42, 0]} />
        <meshStandardMaterial
          color="#1E6BFF"
          emissive="#10B981"
          emissiveIntensity={1.35}
          metalness={0.4}
          roughness={0.15}
          wireframe={false}
        />
        <Edges color="#F4F7FB" threshold={12} />
      </mesh>

      {/* Precision Equilibrium Ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[1.65, 0.012, 12, 96]} />
        <meshBasicMaterial color="#1E6BFF" transparent opacity={0.45} />
      </mesh>

      {/* 4 Refractive Financial Strata Slabs */}
      {STRATA_SPECS.map((spec, idx) => (
        <group
          key={spec.id}
          ref={(el) => {
            strataRefs.current[idx] = el;
          }}
        >
          <mesh>
            <boxGeometry args={[1.65, 0.96, 0.14]} />
            <meshPhysicalMaterial
              color="#0B1736"
              map={strataAlbedo}
              bumpMap={normalMap}
              bumpScale={0.015}
              metalness={0.18}
              roughness={0.14}
              transmission={0.68}
              thickness={0.75}
              ior={1.48}
              clearcoat={0.9}
              clearcoatRoughness={0.1}
              envMapIntensity={1.45}
            />
            <Edges color={spec.accent} threshold={15} />
          </mesh>
        </group>
      ))}

      {/* Glowing Ledger Vector Conduits connecting Strata -> Equilibrium Prism */}
      {conduitGeometries.map((geometry, idx) => (
        <mesh
          key={STRATA_SPECS[idx].id}
          geometry={geometry}
          material={conduitMaterials[idx]}
          ref={(mesh) => {
            if (mesh) {
              conduitMatsRef.current[idx] =
                mesh.material as THREE.ShaderMaterial;
            }
          }}
        />
      ))}
    </group>
  );
}

function TopographicLedgerTerrain({
  heightMap,
  reconcilePulseRef,
}: {
  heightMap: THREE.Texture;
  reconcilePulseRef: React.MutableRefObject<number>;
}) {
  const { scrollProgressRef, scrollVelocityRef, activeScenarioId } =
    useEquilibriumScene();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uVelocity: { value: 0 },
      uStress: { value: 0 },
      uReconciledPulse: { value: 0 },
      uHeightMap: { value: heightMap },
    }),
    [heightMap]
  );

  useFrame((state, delta) => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uProgress.value = scrollProgressRef.current;
    mat.uniforms.uVelocity.value = THREE.MathUtils.damp(
      mat.uniforms.uVelocity.value,
      scrollVelocityRef.current,
      6,
      delta
    );
    const targetStress = activeScenarioId === "base" ? 0 : 1;
    mat.uniforms.uStress.value = THREE.MathUtils.damp(
      mat.uniforms.uStress.value,
      targetStress,
      4,
      delta
    );
    mat.uniforms.uReconciledPulse.value = reconcilePulseRef.current;
  });

  return (
    <mesh position={[0, -3.55, -2]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[56, 56, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={terrainVertexShader}
        fragmentShader={terrainFragmentShader}
        transparent
        depthWrite={false}
        uniforms={uniforms}
      />
    </mesh>
  );
}

function InstancedLedgerField() {
  const { activeScenario, scrollVelocityRef } = useEquilibriumScene();
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 900;

  const particles = useMemo(() => {
    const items: Array<{
      x: number;
      y: number;
      z: number;
      speed: number;
      scale: number;
      phase: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      const angle = (i * 137.508 * Math.PI) / 180;
      const radius = 2.4 + ((i * 73) % 100) * 0.13;
      items.push({
        x: Math.cos(angle) * radius,
        y: (((i * 29) % 100) / 100 - 0.5) * 9.5,
        z: Math.sin(angle) * radius - 1.5,
        speed: 0.15 + ((i * 17) % 100) * 0.004,
        scale: 0.018 + ((i * 41) % 100) * 0.00035,
        phase: i * 0.37,
      });
    }
    return items;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;
    const velBoost =
      activeScenario.particleVelocity +
      Math.min(1.5, Math.abs(scrollVelocityRef.current) * 0.08);

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const yOffset = ((t * p.speed * velBoost + p.phase) % 9.5) - 4.75;
      dummy.position.set(
        p.x + Math.sin(t * 0.3 + p.phase) * 0.12,
        yOffset,
        p.z + Math.cos(t * 0.25 + p.phase) * 0.12
      );
      dummy.rotation.set(t * 0.4 + p.phase, t * 0.25, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#7FB0FF" transparent opacity={0.55} />
    </instancedMesh>
  );
}

export function EquilibriumSceneContent() {
  const reconcilePulseRef = useRef(0);

  const [normalMap, strataAlbedo, heightMap, envTex] = useTexture(
    [
      "/images/textures/obsidian-monolith-normal.jpg",
      "/images/textures/strata-grid-albedo.jpg",
      "/images/textures/ledger-horizon-height.jpg",
      "/images/textures/cobalt-caustics-env.jpg",
    ],
    (loaded) => {
      const list = Array.isArray(loaded) ? loaded : [loaded];
      list.slice(0, 3).forEach((tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
      });
      const env = list[3];
      if (env) {
        env.mapping = THREE.EquirectangularReflectionMapping;
        env.colorSpace = THREE.SRGBColorSpace;
      }
    }
  );

  return (
    <>
      <color attach="background" args={["#030816"]} />
      <fog attach="fog" args={["#030816", 9, 28]} />

      <ambientLight intensity={0.35} color="#7FB0FF" />
      <directionalLight position={[6, 8, 5]} intensity={1.85} color="#F4F7FB" />
      <pointLight position={[-4, 2, 4]} intensity={2.4} color="#1E6BFF" distance={14} />
      <pointLight position={[3, -2, -2]} intensity={1.4} color="#10B981" distance={12} />

      {/* Local Nano Banana studio softbox reflections (zero external HDRI CDN fetches) */}
      <Environment resolution={256} frames={1}>
        <mesh scale={30}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial map={envTex} side={THREE.BackSide} />
        </mesh>
        <Lightformer
          form="rect"
          intensity={3.0}
          color="#F4F7FB"
          scale={[1.2, 8, 1]}
          position={[4, 2, 4]}
          target={[0, 0, 0]}
        />
        <Lightformer
          form="rect"
          intensity={2.6}
          color="#1E6BFF"
          scale={[2.5, 8, 1]}
          position={[-5, 1, 2]}
          target={[0, 0, 0]}
        />
      </Environment>

      <SplineCameraRig />
      <EquilibriumVaultAssembly
        normalMap={normalMap}
        strataAlbedo={strataAlbedo}
        reconcilePulseRef={reconcilePulseRef}
      />
      <TopographicLedgerTerrain
        heightMap={heightMap}
        reconcilePulseRef={reconcilePulseRef}
      />
      <InstancedLedgerField />

      <EffectComposer multisampling={0}>
        <Bloom
          mipmapBlur
          luminanceThreshold={0.85}
          luminanceSmoothing={0.2}
          intensity={0.48}
        />
        <Vignette eskil={false} offset={0.18} darkness={0.55} />
      </EffectComposer>
    </>
  );
}
