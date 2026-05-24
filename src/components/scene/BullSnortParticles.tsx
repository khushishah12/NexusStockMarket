'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 24;

interface BullSnortParticlesProps {
  active: boolean;
  origin?: [number, number, number];
}

export default function BullSnortParticles({
  active,
  origin = [-1.75, 0.35, 0],
}: BullSnortParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const ageRef = useRef(0);

  const { positions, velocities } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const vel = new Float32Array(COUNT * 3);
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = origin[0];
      pos[i * 3 + 1] = origin[1];
      pos[i * 3 + 2] = origin[2];
      vel[i * 3] = -0.8 - Math.random() * 0.6;
      vel[i * 3 + 1] = (Math.random() - 0.3) * 0.4;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }
    return { positions: pos, velocities: vel };
  }, [origin]);

  useFrame((state, delta) => {
    if (!pointsRef.current) return;
    const mat = pointsRef.current.material as THREE.PointsMaterial;

    if (active) {
      ageRef.current += delta;
      pointsRef.current.visible = true;
      mat.opacity = Math.max(0, 1 - ageRef.current * 0.9);
    } else {
      ageRef.current = 0;
      pointsRef.current.visible = false;
      mat.opacity = 0;
      return;
    }

    const geo = pointsRef.current.geometry;
    const attr = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < COUNT; i++) {
      attr.setX(i, attr.getX(i) + velocities[i * 3] * delta * 2.2);
      attr.setY(i, attr.getY(i) + velocities[i * 3 + 1] * delta * 2.2);
      attr.setZ(i, attr.getZ(i) + velocities[i * 3 + 2] * delta * 2.2);
    }
    attr.needsUpdate = true;

    // Periodic snort bursts while hovered/active
    if (Math.sin(state.clock.getElapsedTime() * 8) > 0.92) {
      for (let i = 0; i < COUNT; i++) {
        attr.setXYZ(i, origin[0], origin[1], origin[2]);
      }
      attr.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} visible={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#00e5ff"
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
