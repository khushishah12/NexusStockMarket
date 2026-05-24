'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';

export default function InteractionRipples() {
  const bullRingRef = useRef<THREE.Mesh>(null);
  const bearRingRef = useRef<THREE.Mesh>(null);
  const chartWaveRef = useRef<THREE.Mesh>(null);
  const { bullReacting, bearReacting, bullishWaveActive } = useMarketStore();

  const bullAge = useRef(0);
  const bearAge = useRef(0);
  const waveAge = useRef(0);

  useFrame((_, delta) => {
    if (bullReacting) bullAge.current += delta * 1.8;
    else bullAge.current = 0;

    if (bearReacting) bearAge.current += delta * 1.8;
    else bearAge.current = 0;

    if (bullishWaveActive) waveAge.current += delta * 1.4;
    else waveAge.current = 0;

    animateRing(bullRingRef, bullAge.current, -4.5, '#00e5ff');
    animateRing(bearRingRef, bearAge.current, 4.5, '#ff3366');
    animateRing(chartWaveRef, waveAge.current, 0, '#ffd700', true);
  });

  const animateRing = (
    ref: React.RefObject<THREE.Mesh | null>,
    age: number,
    x: number,
    color: string,
    center = false
  ) => {
    if (!ref.current) return;
    if (age <= 0 || age > 1.2) {
      ref.current.visible = false;
      return;
    }
    ref.current.visible = true;
    const scale = 0.5 + age * (center ? 8 : 6);
    ref.current.scale.set(scale, scale, 1);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = Math.max(0, 0.7 - age * 0.65);
    mat.color.set(color);
    ref.current.position.set(x, center ? 0.2 : -1.85, center ? 0 : 0.1);
  };

  return (
    <group>
      <mesh ref={bullRingRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.8, 1, 48]} />
        <meshBasicMaterial color="#00e5ff" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={bearRingRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.8, 1, 48]} />
        <meshBasicMaterial color="#ff3366" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={chartWaveRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.5, 0.65, 48]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
