"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

function NeuralStructure({ density = 1 }: { density?: number }) {
  const group = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  const { points, lines } = useMemo(() => {
    const count = Math.round(360 * density);
    const positions = new Float32Array(count * 3);
    const vectors: THREE.Vector3[] = [];
    // Deterministic golden-angle distribution: stable across renders, no
    // impure randomness during render, and still organic at this density.
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i += 1) {
      const t = (i + 0.5) / count;
      const radius = 1.15 + ((i * 37) % 100) / 100 * 1.15;
      const theta = i * goldenAngle;
      const phi = Math.acos(1 - 2 * t);
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta) * 0.62;
      const z = radius * Math.cos(phi) * 0.72;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      vectors.push(new THREE.Vector3(x, y, z));
    }

    const linePositions: number[] = [];
    const maxSegments = Math.round(520 * density);
    let segments = 0;
    for (let i = 0; i < vectors.length && segments < maxSegments; i += 1) {
      for (let j = i + 1; j < vectors.length && segments < maxSegments; j += 1) {
        if (vectors[i].distanceTo(vectors[j]) < 0.56) {
          linePositions.push(vectors[i].x, vectors[i].y, vectors[i].z);
          linePositions.push(vectors[j].x, vectors[j].y, vectors[j].z);
          segments += 1;
        }
      }
    }

    return {
      points: positions,
      lines: new Float32Array(linePositions),
    };
  }, [density]);

  useFrame((state, delta) => {
    if (document.visibilityState === "hidden") return;
    const groupNode = group.current;
    if (!groupNode) return;
    groupNode.rotation.y += delta * 0.035;
    groupNode.rotation.x = THREE.MathUtils.lerp(
      groupNode.rotation.x,
      pointer.current.y * 0.16,
      0.025,
    );
    const target = pointer.current.x * 0.22;
    groupNode.rotation.z = THREE.MathUtils.lerp(groupNode.rotation.z, target * 0.4, 0.025);
    groupNode.position.x = THREE.MathUtils.lerp(groupNode.position.x, pointer.current.x * 0.18, 0.03);
    groupNode.position.y = THREE.MathUtils.lerp(groupNode.position.y, pointer.current.y * -0.12, 0.03);
    const t = state.clock.elapsedTime;
    groupNode.scale.setScalar(1 + Math.sin(t * 0.35) * 0.012);
  });

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      pointer.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (event.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <group ref={group} rotation={[0.12, -0.4, 0.08]}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#63f4ff"
          size={0.016}
          sizeAttenuation
          transparent
          opacity={0.72}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[lines, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#1f7f96"
          transparent
          opacity={0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#8957ff"
          size={0.055}
          sizeAttenuation
          transparent
          opacity={0.18}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

export default function NeuralScene({ density = 1 }: { density?: number }) {
  return (
    <Canvas
      camera={{ position: [0, 0, 4.2], fov: 55 }}
      dpr={[1, 1.6]}
      gl={{ antialias: false, alpha: true, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
      frameloop="always"
      aria-hidden
    >
      <NeuralStructure density={density} />
    </Canvas>
  );
}
