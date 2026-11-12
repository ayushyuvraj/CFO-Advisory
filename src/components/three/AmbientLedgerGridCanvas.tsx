"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import * as THREE from "three";
import {
  WebGLErrorBoundary,
  detectWebGLSupport,
  noopSubscribe,
} from "./WebGLErrorBoundary";

function SubtleWorkflowField() {
  const pointsRef = useRef<THREE.Points>(null);
  const gridRef = useRef<THREE.GridHelper>(null);

  const positions = useMemo(() => {
    const count = 280;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (((i * 73) % 100) / 100 - 0.5) * 26;
      arr[i * 3 + 1] = (((i * 29) % 100) / 100 - 0.5) * 10;
      arr[i * 3 + 2] = -2 - ((i * 41) % 100) * 0.14;
    }
    return arr;
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(t * 0.08) * 0.08;
    }
    if (gridRef.current) {
      gridRef.current.position.z = ((t * 0.35) % 1) - 1;
    }
  });

  return (
    <>
      <color attach="background" args={["#F8FAFC"]} />
      <fog attach="fog" args={["#F8FAFC", 6, 22]} />
      <gridHelper
        ref={gridRef}
        args={[40, 40, "#CBD5E1", "#E2E8F0"]}
        position={[0, -3.2, 0]}
      />
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#1E49E2"
          size={0.045}
          transparent
          opacity={0.35}
          sizeAttenuation
        />
      </points>
    </>
  );
}

export function AmbientLedgerGridCanvas() {
  const prefersReducedMotion = useReducedMotion();
  const webglReady = useSyncExternalStore(
    noopSubscribe,
    detectWebGLSupport,
    () => false
  );

  if (prefersReducedMotion || !webglReady) {
    return null;
  }

  return (
    <WebGLErrorBoundary fallback={null}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 opacity-65"
      >
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 1.2, 7.5], fov: 45 }}
          gl={{ antialias: true, powerPreference: "low-power" }}
        >
          <SubtleWorkflowField />
        </Canvas>
      </div>
    </WebGLErrorBoundary>
  );
}
