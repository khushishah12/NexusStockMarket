'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshReflectorMaterial, Grid } from '@react-three/drei';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';

export default function EnvironmentChamber() {
  const floorRef = useRef<THREE.Mesh>(null);
  const { rotateScene, scrollOffset } = useMarketStore();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (floorRef.current) {
      floorRef.current.position.y = -2.2 + Math.sin(t * 0.4) * 0.02;
    }
  });

  const heroBlend = Math.max(0, 1 - scrollOffset * 4);

  return (
    <group>
      <fog attach="fog" args={['#050508', 6, 28]} />

      {/* Cyber-financial chamber floor with soft reflections */}
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -2.2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          rotateScene();
        }}
      >
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          blur={[280, 120]}
          resolution={512}
          mixBlur={0.85}
          mixStrength={heroBlend * 0.65 + 0.15}
          roughness={0.92}
          depthScale={0.9}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0c18"
          metalness={0.35}
          mirror={0.45}
        />
      </mesh>

      <Grid
        position={[0, -2.19, 0]}
        args={[40, 40]}
        cellSize={0.55}
        cellThickness={0.45}
        cellColor="#1a2744"
        sectionSize={2.75}
        sectionThickness={0.9}
        sectionColor="#00e5ff"
        fadeDistance={22}
        fadeStrength={1.2}
        infiniteGrid
      />

      {/* Chamber walls (dim panels) */}
      <mesh position={[0, 2, -12]}>
        <planeGeometry args={[36, 10]} />
        <meshStandardMaterial color="#080a14" emissive="#12182a" emissiveIntensity={0.15} />
      </mesh>
      <mesh position={[-14, 1.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[28, 8]} />
        <meshStandardMaterial color="#060810" emissive="#0d1220" emissiveIntensity={0.1} />
      </mesh>
      <mesh position={[14, 1.5, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[28, 8]} />
        <meshStandardMaterial color="#060810" emissive="#140810" emissiveIntensity={0.12} />
      </mesh>
    </group>
  );
}
