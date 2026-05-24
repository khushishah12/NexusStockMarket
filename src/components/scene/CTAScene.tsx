'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

export default function CTAScene() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.rotation.y = elapsed * 0.05;
      groupRef.current.rotation.x = Math.sin(elapsed * 0.2) * 0.02;
    }
  });

  return (
    <group ref={groupRef} scale={[0.9, 0.9, 0.9]} position={[0, -0.5, 0]}>
      {/* 1. Matrix Grid Floor */}
      <gridHelper args={[40, 40, '#6366f1', '#1e1b4b']} position={[0, -2, 0]} />

      {/* 2. Holographic Dashboard Layout (Outline Panels) */}
      
      {/* Main Center Panel (Chart outline) */}
      <group position={[0, 0.5, -2]}>
        <Line
          points={[
            [-4, -2, 0], [4, -2, 0], [4, 2, 0], [-4, 2, 0], [-4, -2, 0]
          ]}
          color="#3b82f6"
          lineWidth={2.0}
        />
        {/* Mock Chart inside panel */}
        <Line
          points={[
            [-3.5, -1.5, 0], [-2.5, -0.5, 0], [-1.5, -1.0, 0], 
            [-0.5, 0.8, 0], [0.5, 0.2, 0], [1.5, 1.5, 0], 
            [2.5, 0.8, 0], [3.5, 1.8, 0]
          ]}
          color="#60a5fa"
          lineWidth={1.5}
        />
      </group>

      {/* Left Sidebar Panel */}
      <group position={[-5.5, 0.5, -1]} rotation={[0, 0.4, 0]}>
        <Line
          points={[
            [-1, -2, 0], [1, -2, 0], [1, 2, 0], [-1, 2, 0], [-1, -2, 0]
          ]}
          color="#818cf8"
          lineWidth={1.5}
        />
        {/* Mock Menu Items */}
        <Line points={[[-0.6, 1.2, 0], [0.6, 1.2, 0]]} color="#818cf8" lineWidth={1.0} />
        <Line points={[[-0.6, 0.6, 0], [0.6, 0.6, 0]]} color="#818cf8" lineWidth={1.0} />
        <Line points={[[-0.6, 0.0, 0], [0.6, 0.0, 0]]} color="#818cf8" lineWidth={1.0} />
        <Line points={[[-0.6, -0.6, 0], [0.6, -0.6, 0]]} color="#818cf8" lineWidth={1.0} />
      </group>

      {/* Right Stats Panel */}
      <group position={[5.5, 0.5, -1]} rotation={[0, -0.4, 0]}>
        <Line
          points={[
            [-1, -2, 0], [1, -2, 0], [1, 2, 0], [-1, 2, 0], [-1, -2, 0]
          ]}
          color="#818cf8"
          lineWidth={1.5}
        />
        {/* Mock Ring graph */}
        <mesh position={[0, 0.8, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <Line points={[[-0.6, -0.2, 0], [0.6, -0.2, 0]]} color="#ffd700" lineWidth={1.0} />
        <Line points={[[-0.6, -0.8, 0], [0.6, -0.8, 0]]} color="#00ff88" lineWidth={1.0} />
      </group>

      {/* Top Header Panel */}
      <group position={[0, 3.0, -2.5]}>
        <Line
          points={[
            [-6, -0.3, 0], [6, -0.3, 0], [6, 0.3, 0], [-6, 0.3, 0], [-6, -0.3, 0]
          ]}
          color="#6366f1"
          lineWidth={1.8}
        />
      </group>

      {/* Floating digital particles around wireframes */}
      <pointLight distance={15} intensity={1.5} color="#4f46e5" />
    </group>
  );
}
