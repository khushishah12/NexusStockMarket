'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function NeuralSphere() {
  const sphereRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  // Generate 80 nodes on the sphere for neural connections
  const nodeCount = 80;
  const nodes = useMemo(() => {
    const pts = [];
    const radius = 1.5;
    for (let i = 0; i < nodeCount; i++) {
      // Fibonacci sphere distribution for uniform nodes
      const y = 1 - (i / (nodeCount - 1)) * 2; 
      const radiusAtY = Math.sqrt(1 - y * y);
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const theta = goldenAngle * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;
      pts.push(new THREE.Vector3(x * radius, y * radius, z * radius));
    }
    return pts;
  }, []);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();

    // Rotate core neural network sphere
    if (sphereRef.current) {
      sphereRef.current.rotation.y = elapsed * 0.15;
      sphereRef.current.rotation.x = elapsed * 0.08;
    }

    // Rotate intersecting orbits
    if (ring1Ref.current) {
      ring1Ref.current.rotation.x = elapsed * 0.4;
      ring1Ref.current.rotation.y = elapsed * 0.2;
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.y = -elapsed * 0.5;
      ring2Ref.current.rotation.z = elapsed * 0.3;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Core Glowing Solid Sphere */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[1.5, 20, 20]} />
        <meshPhysicalMaterial
          color="#3b82f6"
          emissive="#6366f1"
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.1}
          transmission={0.6}
          thickness={0.8}
          wireframe
        />
        {/* Render Neural Nodes */}
        {nodes.map((pos, idx) => (
          <mesh key={idx} position={pos}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshStandardMaterial
              color="#60a5fa"
              emissive="#3b82f6"
              emissiveIntensity={2.0}
            />
          </mesh>
        ))}
      </mesh>

      {/* 2. Concentric Orbiting Particle Rings */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2.2, 0.015, 8, 64]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.6} />
      </mesh>
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2.5, 0.015, 8, 64]} />
        <meshBasicMaterial color="#a78bfa" transparent opacity={0.4} />
      </mesh>

      {/* Inner Point Light to expand glowing volume */}
      <pointLight distance={6} intensity={2.5} color="#8b5cf6" />
    </group>
  );
}
