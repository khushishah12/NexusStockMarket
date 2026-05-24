'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 36;

interface BearSteamProps {
  active: boolean;
  origin?: [number, number, number];
}

export default function BearSteam({
  active,
  origin = [0.95, 0.15, 0],
}: BearSteamProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const basePositions = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = origin[0] + (Math.random() - 0.5) * 0.25;
      pos[i * 3 + 1] = origin[1];
      pos[i * 3 + 2] = origin[2] + (Math.random() - 0.5) * 0.25;
    }
    return pos;
  }, [origin]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const geo = pointsRef.current.geometry;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    const mat = pointsRef.current.material as THREE.PointsMaterial;
    const t = state.clock.getElapsedTime();

    pointsRef.current.visible = active || mat.opacity > 0.05;
    const intensity = active ? 1 : 0.35;
    mat.opacity = Math.min(0.55, (active ? 0.35 : 0.15) + Math.sin(t * 3) * 0.08) * intensity;

    for (let i = 0; i < COUNT; i++) {
      let y = attr.getY(i) + delta * (0.35 + (i % 5) * 0.04);
      let x = attr.getX(i) + Math.sin(t * 2 + i) * 0.003;
      let z = attr.getZ(i) + Math.cos(t * 1.5 + i) * 0.003;

      if (y > origin[1] + 2.2) {
        y = origin[1];
        x = origin[0] + (Math.random() - 0.5) * 0.3;
        z = origin[2] + (Math.random() - 0.5) * 0.3;
      }

      attr.setXYZ(i, x, y, z);
    }
    attr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[basePositions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#ff6688"
        transparent
        opacity={0.2}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
