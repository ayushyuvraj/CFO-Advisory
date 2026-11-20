"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useEquilibriumScene } from "@/context/EquilibriumSceneContext";
import {
  currencyNoteFragmentShader,
  currencyNoteVertexShader,
} from "./shaders/currencyShaders";

interface CurrencyPlateSpec {
  id: "inr" | "usd" | "eur";
  texturePath: string;
  triadPos: [number, number, number];
  triadRot: [number, number, number];
  divePos: [number, number, number];
  diveRot: [number, number, number];
  size: [number, number];
  accentA: string;
  accentB: string;
  peakProgress: number;
}

const CURRENCY_PLATES: CurrencyPlateSpec[] = [
  {
    id: "inr",
    texturePath: "/images/currencies/inr-macro.jpg",
    triadPos: [1.72, 0.68, 0.45],
    triadRot: [-0.08, -0.26, 0.06],
    divePos: [1.35, 0.02, 2.25],
    diveRot: [0.02, -0.14, -0.02],
    size: [4.2, 2.38],
    accentA: "#1E49E2",
    accentB: "#009A44",
    peakProgress: 0.25,
  },
  {
    id: "usd",
    texturePath: "/images/currencies/usd-macro.jpg",
    triadPos: [2.25, -0.02, -0.35],
    triadRot: [0.02, -0.22, -0.02],
    divePos: [-1.35, 0.02, 2.25],
    diveRot: [0.02, 0.14, 0.02],
    size: [4.2, 2.38],
    accentA: "#009A44",
    accentB: "#00B8F5",
    peakProgress: 0.5,
  },
  {
    id: "eur",
    texturePath: "/images/currencies/eur-gbp-macro.jpg",
    triadPos: [1.68, -0.72, -1.05],
    triadRot: [0.08, -0.18, -0.06],
    divePos: [1.25, 0.28, 2.05],
    diveRot: [0.02, -0.12, -0.01],
    size: [4.3, 2.42],
    accentA: "#7213EA",
    accentB: "#00B8F5",
    peakProgress: 0.75,
  },
];

function circularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 1 - diff);
}

function CircularCameraRig() {
  const { scrollProgressRef, pointerRef } = useEquilibriumScene();

  const { posCurve, lookCurve } = useMemo(() => {
    const posCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(-0.35, 0.12, 5.4),
        new THREE.Vector3(-0.1, 0.08, 4.7),
        new THREE.Vector3(0.15, 0.06, 4.7),
        new THREE.Vector3(-0.1, 0.08, 4.75),
        new THREE.Vector3(-0.25, 0.35, 5.8),
      ],
      true,
      "catmullrom",
      0.5
    );

    const lookCurve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0.25, 0.02, 0.0),
        new THREE.Vector3(0.45, 0.02, 1.4),
        new THREE.Vector3(-0.45, 0.02, 1.4),
        new THREE.Vector3(0.4, 0.04, 1.4),
        new THREE.Vector3(0.1, 0.05, 0.0),
      ],
      true,
      "catmullrom",
      0.5
    );

    return { posCurve, lookCurve };
  }, []);

  const targetPosRef = useRef(new THREE.Vector3());
  const targetLookRef = useRef(new THREE.Vector3());
  const smoothedLookRef = useRef(new THREE.Vector3(0.25, 0.02, 0.0));

  useFrame((state, delta) => {
    const p = ((scrollProgressRef.current % 1) + 1) % 1;
    const targetPos = targetPosRef.current;
    const targetLook = targetLookRef.current;
    const smoothedLook = smoothedLookRef.current;

    posCurve.getPointAt(p, targetPos);
    lookCurve.getPointAt(p, targetLook);

    const isCompact = state.size.width < 1024;
    const px = pointerRef.current.x * 0.24;
    const py = pointerRef.current.y * 0.16;
    const camTargetX = isCompact ? targetPos.x * 0.15 : targetPos.x;
    const lookTargetX = isCompact ? targetLook.x * 0.15 : targetLook.x;

    state.camera.position.x = THREE.MathUtils.damp(
      state.camera.position.x,
      camTargetX + px,
      4.5,
      delta
    );
    state.camera.position.y = THREE.MathUtils.damp(
      state.camera.position.y,
      targetPos.y + py,
      4.5,
      delta
    );
    state.camera.position.z = THREE.MathUtils.damp(
      state.camera.position.z,
      targetPos.z,
      4.5,
      delta
    );

    smoothedLook.x = THREE.MathUtils.damp(
      smoothedLook.x,
      lookTargetX + px * 0.35,
      5.0,
      delta
    );
    smoothedLook.y = THREE.MathUtils.damp(
      smoothedLook.y,
      targetLook.y + py * 0.25,
      5.0,
      delta
    );
    smoothedLook.z = THREE.MathUtils.damp(
      smoothedLook.z,
      targetLook.z,
      5.0,
      delta
    );

    state.camera.lookAt(smoothedLook);
  });

  return null;
}

function CurrencyNotePlane({
  spec,
  texture,
}: {
  spec: CurrencyPlateSpec;
  texture: THREE.Texture;
}) {
  const { scrollProgressRef, pointerRef } = useEquilibriumScene();
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uTime: { value: 0 },
      uCurl: { value: 0.28 },
      uHover: { value: 0.4 },
      uFocus: { value: 0.2 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uAccentA: { value: new THREE.Color(spec.accentA) },
      uAccentB: { value: new THREE.Color(spec.accentB) },
    }),
    [texture, spec.accentA, spec.accentB]
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const p = ((scrollProgressRef.current % 1) + 1) % 1;

    // Horizon factor is 1 near p = 0 or p = 1, 0 across the middle chapters
    const horizonDist = circularDistance(p, 0);
    const horizonBlend = Math.max(0, 1 - horizonDist / 0.16);

    // Chapter focus factor peaks at this currency's own chapter
    const dist = circularDistance(p, spec.peakProgress);
    const focus = Math.max(0, 1 - dist / 0.19);
    const easedFocus = focus * focus * (3 - 2 * focus);

    // Non-active currency notes recede gently backward so the active note owns the macro dive
    const recessZ =
      horizonBlend > 0.1
        ? 0
        : (1 - easedFocus) * -4.2;

    const isCompact = state.size.width < 1024;
    const txRaw = THREE.MathUtils.lerp(
      spec.triadPos[0],
      spec.divePos[0],
      easedFocus
    );
    const tyRaw =
      THREE.MathUtils.lerp(spec.triadPos[1], spec.divePos[1], easedFocus) +
      Math.sin(t * 0.8 + spec.peakProgress * 12) * 0.05;
    const tz =
      THREE.MathUtils.lerp(spec.triadPos[2], spec.divePos[2], easedFocus) +
      recessZ;

    const tx = isCompact ? txRaw * 0.14 : txRaw;
    const ty = isCompact ? tyRaw * 0.68 + 0.92 : tyRaw;

    const rx = THREE.MathUtils.lerp(
      spec.triadRot[0],
      spec.diveRot[0],
      easedFocus
    );
    const ry = THREE.MathUtils.lerp(
      spec.triadRot[1],
      spec.diveRot[1],
      easedFocus
    );
    const rz = THREE.MathUtils.lerp(
      spec.triadRot[2],
      spec.diveRot[2],
      easedFocus
    );

    const baseScale = THREE.MathUtils.lerp(
      horizonBlend > 0.15 ? 0.72 : 0.48,
      1.04,
      easedFocus
    );
    const targetScale = isCompact ? baseScale * 0.62 : baseScale;

    if (groupRef.current) {
      groupRef.current.position.x = THREE.MathUtils.damp(
        groupRef.current.position.x,
        tx,
        4.6,
        delta
      );
      groupRef.current.position.y = THREE.MathUtils.damp(
        groupRef.current.position.y,
        ty,
        4.6,
        delta
      );
      groupRef.current.position.z = THREE.MathUtils.damp(
        groupRef.current.position.z,
        tz,
        4.6,
        delta
      );

      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x,
        rx,
        4.6,
        delta
      );
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y,
        ry,
        4.6,
        delta
      );
      groupRef.current.rotation.z = THREE.MathUtils.damp(
        groupRef.current.rotation.z,
        rz,
        4.6,
        delta
      );

      groupRef.current.scale.setScalar(
        THREE.MathUtils.damp(groupRef.current.scale.x, targetScale, 4.8, delta)
      );
    }

    if (matRef.current) {
      matRef.current.uniforms.uTime.value = t;
      matRef.current.uniforms.uFocus.value = THREE.MathUtils.damp(
        matRef.current.uniforms.uFocus.value,
        easedFocus,
        5,
        delta
      );
      matRef.current.uniforms.uCurl.value = THREE.MathUtils.damp(
        matRef.current.uniforms.uCurl.value,
        0.07 + (1 - easedFocus) * 0.3,
        4.2,
        delta
      );
      matRef.current.uniforms.uPointer.value.set(
        pointerRef.current.x,
        pointerRef.current.y
      );
    }
  });

  return (
    <group ref={groupRef} position={spec.triadPos} rotation={spec.triadRot}>
      <mesh>
        <planeGeometry args={[spec.size[0], spec.size[1], 48, 24]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={currencyNoteVertexShader}
          fragmentShader={currencyNoteFragmentShader}
          uniforms={uniforms}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function StudioKpmgGridAndMotes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 260;

  const motes = useMemo(() => {
    const list: Array<{
      x: number;
      y: number;
      z: number;
      scale: number;
      phase: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: (((i * 73) % 100) / 100 - 0.5) * 14,
        y: (((i * 37) % 100) / 100 - 0.5) * 5.5,
        z: 2.5 - ((i * 53) % 100) * 0.14,
        scale: 0.018 + ((i * 19) % 100) * 0.0003,
        phase: i * 0.31,
      });
    }
    return list;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = state.clock.elapsedTime;

    for (let i = 0; i < count; i++) {
      const m = motes[i];
      dummy.position.set(
        m.x + Math.sin(t * 0.35 + m.phase) * 0.14,
        m.y + Math.cos(t * 0.28 + m.phase) * 0.1,
        m.z
      );
      dummy.rotation.set(t * 0.3 + m.phase, t * 0.2, 0);
      dummy.scale.setScalar(m.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <gridHelper
        args={[52, 44, "#CBD5E1", "#E2E8F0"]}
        position={[0, -2.05, -3]}
      />
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color="#1E49E2" transparent opacity={0.28} />
      </instancedMesh>
    </>
  );
}

export function CurrencyOdysseyScene() {
  const textures = useTexture(
    CURRENCY_PLATES.map((p) => p.texturePath),
    (loaded) => {
      const list = Array.isArray(loaded) ? loaded : [loaded];
      list.forEach((tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
      });
    }
  );

  return (
    <>
      <color attach="background" args={["#F8FAFC"]} />
      <fog attach="fog" args={["#F8FAFC", 7.5, 19]} />

      <ambientLight intensity={1.15} color="#FFFFFF" />
      <directionalLight position={[4, 6, 5]} intensity={1.1} color="#FFFFFF" />
      <pointLight position={[-4, 2, 2]} intensity={0.9} color="#00B8F5" />

      <CircularCameraRig />
      <StudioKpmgGridAndMotes />

      {CURRENCY_PLATES.map((spec, idx) => (
        <CurrencyNotePlane key={spec.id} spec={spec} texture={textures[idx]} />
      ))}
    </>
  );
}
