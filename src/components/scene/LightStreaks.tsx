'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const STREAKS = [
  { pos: [-8, 3, -4] as [number, number, number], rot: [0, 0.3, 0.1] as [number, number, number], len: 14, color: '#00e5ff' },
  { pos: [9, 2.5, -3] as [number, number, number], rot: [0, -0.4, -0.05] as [number, number, number], len: 12, color: '#ff3366' },
  { pos: [0, 4.5, -6] as [number, number, number], rot: [0.2, 0, 0] as [number, number, number], len: 16, color: '#ffd700' },
  { pos: [-5, 1, 5] as [number, number, number], rot: [0, 1.2, 0.15] as [number, number, number], len: 10, color: '#00ff88' },
  { pos: [6, 0.5, 4] as [number, number, number], rot: [0, -0.8, 0.1] as [number, number, number], len: 11, color: '#a78bfa' },
];

export default function LightStreaks() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = t * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      {STREAKS.map((s, i) => (
        <Streak key={i} {...s} index={i} />
      ))}
    </group>
  );
}

function Streak({
  pos,
  rot,
  len,
  color,
  index,
}: {
  pos: [number, number, number];
  rot: [number, number, number];
  len: number;
  color: string;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + Math.sin(t * 2 + index) * 0.08;
      meshRef.current.position.x = pos[0] + Math.sin(t * 0.5 + index) * 0.3;
    }
  });

  return (
    <mesh ref={meshRef} position={pos} rotation={rot}>
      <boxGeometry args={[len, 0.02, 0.04]} />
      <meshBasicMaterial color={color} transparent opacity={0.18} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}
