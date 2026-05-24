'use client';

import React, { useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';
import BearSteam from './BearSteam';
import { COLORS } from '../../lib/constants';

interface BearProps {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
}

export default function Bear({ mouseRef }: BearProps) {
  const { bearReacting, triggerAISignal, heroScrollProgress } = useMarketStore();
  const [hovered, setHovered] = useState(false);
  const [swipeTime, setSwipeTime] = useState(-1);

  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const neonEyesMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const crackMatRef = useRef<THREE.LineBasicMaterial>(null);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setSwipeTime(0);
    triggerAISignal('bearish');
  };

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();

    if (groupRef.current && !bearReacting && swipeTime < 0) {
      groupRef.current.position.y = -1 + Math.sin(elapsed * 1.5) * 0.04 + heroScrollProgress * 0.08;
      groupRef.current.rotation.y = -0.5 + Math.cos(elapsed * 1.0) * 0.03 - heroScrollProgress * 0.08;
      groupRef.current.rotation.x = heroScrollProgress * 0.05;
      groupRef.current.scale.setScalar(1.0 + Math.sin(elapsed * 3.0) * 0.018);
    }

    if (headRef.current) {
      const targetRotY = mouseRef.current.x * 0.35;
      const targetRotX = mouseRef.current.y * 0.25;
      headRef.current.rotation.y += (targetRotY - headRef.current.rotation.y) * 0.12;
      headRef.current.rotation.x += (targetRotX - headRef.current.rotation.x) * 0.12;
    }

    if (neonEyesMatRef.current) {
      const baseIntensity = hovered ? 3.2 : 1.3;
      const pulse = Math.sin(elapsed * 5) * 0.3;
      const signalBoost = bearReacting ? 6.5 : 0;
      neonEyesMatRef.current.emissiveIntensity = baseIntensity + pulse + signalBoost;
    }

    if (bearReacting && rightArmRef.current && groupRef.current) {
      groupRef.current.position.z = Math.sin(elapsed * 6) * 0.25;
      groupRef.current.rotation.x = 0.22;
      const armSwing = Math.sin(elapsed * 10) * 0.9 - 0.45;
      rightArmRef.current.rotation.x = -Math.PI / 4 + armSwing;
    } else if (groupRef.current && rightArmRef.current) {
      groupRef.current.rotation.x = THREE.MathUtils.lerp(groupRef.current.rotation.x, 0, 0.08);
      groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, 0, 0.08);
      rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.1);
    }

    if (swipeTime >= 0 && rightArmRef.current && groupRef.current) {
      const newTime = swipeTime + delta * 2.2;
      setSwipeTime(newTime);
      if (newTime < 1.0) {
        rightArmRef.current.rotation.x = -Math.PI / 3 - newTime * 0.55;
        groupRef.current.position.z = -newTime * 0.12;
      } else if (newTime < 2.0) {
        const swipeProgress = newTime - 1.0;
        rightArmRef.current.rotation.x = -Math.PI / 3 + Math.sin(swipeProgress * Math.PI) * 1.6;
        groupRef.current.position.z = 0.25 * Math.sin(swipeProgress * Math.PI);
      } else {
        rightArmRef.current.rotation.x += (-rightArmRef.current.rotation.x) * 0.15;
        groupRef.current.position.z += (-groupRef.current.position.z) * 0.15;
        if (Math.abs(rightArmRef.current.rotation.x) < 0.05) {
          rightArmRef.current.rotation.x = 0;
          groupRef.current.position.z = 0;
          setSwipeTime(-1);
        }
      }
    }

    if (crackMatRef.current) {
      crackMatRef.current.opacity = 0.35 + (hovered || bearReacting ? 0.55 : 0) + Math.sin(elapsed * 8) * 0.1;
    }
  });

  const crackPoints = useRef(
    new Float32Array([
      -0.3, 0.4, 0.55, 0.1, -0.2, 0.55, 0.4, 0.1, 0.55, 0.2, 0.5, 0.55,
      -0.5, 0.1, -0.55, -0.1, -0.4, -0.55, 0.2, -0.1, -0.55, 0.5, 0.3, -0.55,
      0, 0.6, 0, 0.15, 0.2, 0, -0.2, -0.3, 0,
    ])
  ).current;

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0]}
      rotation={[0, -0.5, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[1.1, 12, 12]} />
        <meshStandardMaterial color="#120818" metalness={0.75} roughness={0.35} emissive="#1a0510" emissiveIntensity={0.25} />
        <Edges threshold={12} color={COLORS.bearCrack} />
      </mesh>

      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[crackPoints, 3]} />
        </bufferGeometry>
        <lineBasicMaterial ref={crackMatRef} color={COLORS.bearCrack} transparent opacity={0.5} />
      </lineSegments>

      <group ref={headRef} position={[0.7, 0.7, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.55, 10, 10]} />
          <meshStandardMaterial color="#1a0a14" metalness={0.7} roughness={0.4} />
          <Edges threshold={12} color="#ff3366" />
        </mesh>

        <mesh position={[0.4, -0.15, 0]} castShadow>
          <boxGeometry args={[0.35, 0.25, 0.35]} />
          <meshStandardMaterial color="#0a0508" metalness={0.6} roughness={0.7} />
        </mesh>

        <mesh position={[-0.2, 0.5, 0.35]}>
          <sphereGeometry args={[0.15, 6, 6]} />
          <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.6} />
        </mesh>
        <mesh position={[-0.2, 0.5, -0.35]}>
          <sphereGeometry args={[0.15, 6, 6]} />
          <meshStandardMaterial color="#111827" metalness={0.5} roughness={0.6} />
        </mesh>

        <mesh position={[0.3, 0.05, 0.2]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial ref={neonEyesMatRef} color="#ff0044" emissive="#ff0044" emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[0.3, 0.05, -0.2]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#ff3366" emissive="#ff3366" emissiveIntensity={1.5} />
        </mesh>

        <BearSteam active={hovered || bearReacting} origin={[0.55, 0.05, 0]} />
      </group>

      <mesh position={[0.6, -0.8, 0.55]} castShadow>
        <cylinderGeometry args={[0.18, 0.14, 0.8, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.65} roughness={0.45} />
      </mesh>

      <group ref={rightArmRef} position={[0.6, -0.2, -0.55]}>
        <mesh position={[0, -0.3, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.14, 0.8, 8]} />
          <meshStandardMaterial color="#0f172a" metalness={0.65} roughness={0.45} />
        </mesh>
        <group position={[0.05, -0.7, 0]}>
          {[0.1, 0, -0.1].map((z, i) => (
            <mesh key={i} position={[0, 0, z]} rotation={[0, 0, i === 0 ? -0.5 : i === 2 ? 0.5 : 0]}>
              <coneGeometry args={[0.03, 0.15, 4]} />
              <meshStandardMaterial color="#ff0044" emissive="#ff0044" emissiveIntensity={1.2} />
            </mesh>
          ))}
        </group>
      </group>

      <mesh position={[-0.6, -0.9, 0.5]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.7, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.65} roughness={0.45} />
      </mesh>
      <mesh position={[-0.6, -0.9, -0.5]} castShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.7, 8]} />
        <meshStandardMaterial color="#0f172a" metalness={0.65} roughness={0.45} />
      </mesh>

      <mesh position={[-0.2, 0.5, 0]}>
        <boxGeometry args={[0.08, 0.05, 1.25]} />
        <meshBasicMaterial color="#ff0044" transparent opacity={0.7} />
      </mesh>
      <mesh position={[-0.55, 0.15, 0.55]} rotation={[0, 0.4, 0.3]}>
        <boxGeometry args={[0.06, 0.04, 0.5]} />
        <meshBasicMaterial color="#ff3366" transparent opacity={0.55} />
      </mesh>
    </group>
  );
}
