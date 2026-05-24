'use client';

import React, { useRef, useState } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';
import BullSnortParticles from './BullSnortParticles';
import { COLORS } from '../../lib/constants';

interface BullProps {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
}

export default function Bull({ mouseRef }: BullProps) {
  const { bullReacting, triggerAISignal, heroScrollProgress } = useMarketStore();
  const [hovered, setHovered] = useState(false);
  const [clickTime, setClickTime] = useState(-1);

  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const frontLeftLegRef = useRef<THREE.Group>(null);
  const neonEyesMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const neonStreaksMatRef = useRef<THREE.MeshBasicMaterial>(null);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setClickTime(0);
    triggerAISignal('bullish');
  };

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();

    if (groupRef.current && !bullReacting && clickTime < 0) {
      const breathe = Math.sin(elapsed * 2.0) * 0.05;
      groupRef.current.position.y = -1 + breathe + heroScrollProgress * 0.12;
      groupRef.current.rotation.y = 0.5 + Math.sin(elapsed * 1.0) * 0.03 + heroScrollProgress * 0.1;
      groupRef.current.rotation.x = -heroScrollProgress * 0.06;
    }

    if (headRef.current) {
      const targetRotY = mouseRef.current.x * 0.35;
      const targetRotX = mouseRef.current.y * 0.25;
      headRef.current.rotation.y += (targetRotY - headRef.current.rotation.y) * 0.12;
      headRef.current.rotation.x += (targetRotX - headRef.current.rotation.x) * 0.12;
    }

    if (neonEyesMatRef.current) {
      const baseIntensity = hovered ? 3 : 1.4;
      const pulse = Math.sin(elapsed * 6) * 0.35;
      const signalBoost = bullReacting ? 6 : 0;
      neonEyesMatRef.current.emissiveIntensity = baseIntensity + pulse + signalBoost;
    }
    if (neonStreaksMatRef.current) {
      neonStreaksMatRef.current.opacity = hovered || bullReacting ? 1 : 0.75;
    }

    if (bullReacting && frontLeftLegRef.current && groupRef.current) {
      const cycle = (elapsed * 6) % Math.PI;
      frontLeftLegRef.current.rotation.z = Math.sin(cycle) * 0.85;
      if (cycle > Math.PI * 0.75) {
        groupRef.current.position.y = -1 + Math.sin(elapsed * 60) * 0.05;
      }
    } else if (frontLeftLegRef.current) {
      frontLeftLegRef.current.rotation.z = THREE.MathUtils.lerp(frontLeftLegRef.current.rotation.z, 0, 0.1);
    }

    if (clickTime >= 0 && groupRef.current) {
      const newTime = clickTime + delta * 2.2;
      setClickTime(newTime);
      if (newTime < 1.0) {
        groupRef.current.position.x = -Math.sin(newTime * Math.PI) * 0.55;
        groupRef.current.position.z = -Math.sin(newTime * Math.PI) * 0.25;
      } else if (newTime < 2.0) {
        const chargeProgress = newTime - 1.0;
        groupRef.current.position.x = -0.5 + Math.sin(chargeProgress * Math.PI) * 2.8;
      } else {
        groupRef.current.position.x += (0 - groupRef.current.position.x) * 0.12;
        if (Math.abs(groupRef.current.position.x) < 0.05) {
          groupRef.current.position.x = 0;
          setClickTime(-1);
        }
      }
    }
  });

  return (
    <group
      ref={groupRef}
      position={[0, 0, 0]}
      rotation={[0, 0.5, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={handleClick}
    >
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.5, 1.4, 1.3]} />
        <meshPhysicalMaterial
          color="#1a2332"
          metalness={0.95}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.05}
          envMapIntensity={1.2}
        />
        <Edges threshold={15} color={COLORS.cyan} />
      </mesh>

      <mesh position={[-0.4, 0.9, 0]} castShadow>
        <boxGeometry args={[1.2, 0.8, 1.2]} />
        <meshPhysicalMaterial color="#0f172a" metalness={0.92} roughness={0.12} clearcoat={0.9} />
        <Edges threshold={15} color="#00ff88" />
      </mesh>

      <group ref={headRef} position={[-1.3, 0.7, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[0.65, 12, 12]} />
          <meshPhysicalMaterial color="#243044" metalness={0.95} roughness={0.08} clearcoat={1} />
          <Edges threshold={15} color={COLORS.cyan} />
        </mesh>

        <mesh position={[-0.5, -0.2, 0]} castShadow>
          <boxGeometry args={[0.5, 0.4, 0.5]} />
          <meshPhysicalMaterial color="#111827" metalness={0.88} roughness={0.15} />
        </mesh>

        <mesh position={[-0.4, 0.1, 0.28]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial ref={neonEyesMatRef} color={COLORS.cyan} emissive={COLORS.cyan} emissiveIntensity={1.5} />
        </mesh>
        <mesh position={[-0.4, 0.1, -0.28]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color={COLORS.cyan} emissive={COLORS.cyan} emissiveIntensity={1.5} />
        </mesh>

        <mesh position={[0.1, 0.6, 0.45]} rotation={[0.4, 0.2, -0.6]}>
          <coneGeometry args={[0.1, 0.9, 8]} />
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.2} metalness={0.8} roughness={0.1} />
        </mesh>
        <mesh position={[0.1, 0.6, -0.45]} rotation={[-0.4, -0.2, -0.6]}>
          <coneGeometry args={[0.1, 0.9, 8]} />
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1.2} metalness={0.8} roughness={0.1} />
        </mesh>

        <BullSnortParticles active={hovered || bullReacting} origin={[-0.55, -0.05, 0]} />
      </group>

      <group ref={frontLeftLegRef} position={[-0.9, -1.0, 0.4]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.16, 0.12, 1.0, 8]} />
          <meshPhysicalMaterial color="#0f172a" metalness={0.92} roughness={0.12} />
        </mesh>
      </group>

      <mesh position={[-0.9, -1.0, -0.4]} castShadow>
        <cylinderGeometry args={[0.16, 0.12, 1.0, 8]} />
        <meshPhysicalMaterial color="#0f172a" metalness={0.92} roughness={0.12} />
      </mesh>
      <mesh position={[0.9, -1.0, 0.4]} castShadow>
        <cylinderGeometry args={[0.14, 0.1, 1.0, 8]} />
        <meshPhysicalMaterial color="#0f172a" metalness={0.92} roughness={0.12} />
      </mesh>
      <mesh position={[0.9, -1.0, -0.4]} castShadow>
        <cylinderGeometry args={[0.14, 0.1, 1.0, 8]} />
        <meshPhysicalMaterial color="#0f172a" metalness={0.92} roughness={0.12} />
      </mesh>

      <mesh position={[0, 0.15, 0.66]}>
        <boxGeometry args={[1.9, 0.04, 0.04]} />
        <meshBasicMaterial ref={neonStreaksMatRef} color={COLORS.cyan} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, -0.15, -0.66]}>
        <boxGeometry args={[1.6, 0.03, 0.03]} />
        <meshBasicMaterial color="#00ff88" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0.3, 0.55, 0]} rotation={[0, 0, Math.PI / 2]}>
        <boxGeometry args={[1.2, 0.025, 0.025]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}
