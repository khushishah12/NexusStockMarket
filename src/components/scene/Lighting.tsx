'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';

export default function Lighting() {
  const { bullReacting, bearReacting, heroScrollProgress } = useMarketStore();
  const bullLightRef = useRef<THREE.PointLight>(null);
  const bearLightRef = useRef<THREE.PointLight>(null);
  const chartLightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();

    if (bullLightRef.current) {
      const pulse = Math.sin(elapsed * 4) * 0.25;
      const reactionGlow = bullReacting ? 6 : 0;
      bullLightRef.current.intensity = 1.2 + pulse + reactionGlow + heroScrollProgress * 0.4;
      bullLightRef.current.color.set('#00e5ff');
    }

    if (bearLightRef.current) {
      const pulse = Math.cos(elapsed * 4) * 0.25;
      const reactionGlow = bearReacting ? 6 : 0;
      bearLightRef.current.intensity = 1.2 + pulse + reactionGlow;
      bearLightRef.current.color.set('#ff0044');
    }

    if (chartLightRef.current) {
      chartLightRef.current.intensity = 0.7 + heroScrollProgress * 0.5 + Math.sin(elapsed * 2) * 0.15;
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} color="#080a14" />
      <hemisphereLight intensity={0.35} color="#1e3a5f" groundColor="#0a0510" />

      <directionalLight
        position={[5, 10, 3]}
        intensity={1.35}
        color="#c7d2fe"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />

      <directionalLight position={[-8, 5, -5]} intensity={1.6} color="#312e81" />
      <directionalLight position={[0, 8, -8]} intensity={0.5} color="#00e5ff" />

      <pointLight ref={bullLightRef} position={[-5, 1, 1]} color="#00e5ff" distance={10} decay={2} />
      <pointLight ref={bearLightRef} position={[5, 1, 1]} color="#ff0044" distance={10} decay={2} />
      <pointLight ref={chartLightRef} position={[0, 2.5, 2]} color="#ffd700" distance={14} decay={1.5} />
      <spotLight
        position={[0, 6, 4]}
        angle={0.45}
        penumbra={0.8}
        intensity={0.55}
        color="#a78bfa"
        distance={20}
      />
    </>
  );
}
