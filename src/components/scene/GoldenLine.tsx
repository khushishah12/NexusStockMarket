'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';
import { CHART_CONFIG } from '../../lib/constants';

interface GoldenLineProps {
  mouseRef?: React.MutableRefObject<{ x: number; y: number }>;
}

export default function GoldenLine({ mouseRef }: GoldenLineProps) {
  const { candles, triggerAISignal, aiSignal, setPulseIndex, heroScrollProgress } = useMarketStore();
  const lineRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const pulseGlowRef = useRef<THREE.PointLight>(null);
  const pulseTimer = useRef(0);

  const { curve } = useMemo(() => {
    const prices = candles.flatMap((c) => [c.low, c.high]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;
    const targetHeight = 4.2;
    const scaleY = targetHeight / priceRange;

    const pts: THREE.Vector3[] = [];
    candles.forEach((candle, i) => {
      const x = (i - (candles.length - 1) / 2) * CHART_CONFIG.spacing;
      const y = (candle.close - minPrice) * scaleY - targetHeight / 2 + 0.5;
      const z = Math.sin(i * 0.85) * 0.35 + Math.cos(i * 0.4) * 0.15;
      pts.push(new THREE.Vector3(x, y, z));
    });

    return { curve: new THREE.CatmullRomCurve3(pts) };
  }, [candles]);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();
    const mouseX = mouseRef?.current.x ?? 0;
    const mouseY = mouseRef?.current.y ?? 0;

    if (lineRef.current) {
      lineRef.current.position.y = Math.sin(elapsed * 1.2) * 0.06;
      lineRef.current.position.x = mouseX * 0.08;
      lineRef.current.rotation.z = mouseY * 0.04;
      const scale = 1 + heroScrollProgress * 0.06;
      lineRef.current.scale.setScalar(scale);
    }

    if (glowRef.current) {
      glowRef.current.position.copy(lineRef.current?.position ?? new THREE.Vector3());
      const mat = glowRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + Math.sin(elapsed * 3) * 0.04;
    }

    pulseTimer.current += delta * (0.22 + heroScrollProgress * 0.08);
    if (pulseTimer.current > 1.0) {
      pulseTimer.current = 0;
      triggerAISignal(aiSignal.type);
    }

    const t = pulseTimer.current;
    const currentCandleIdx = Math.floor(t * candles.length);
    setPulseIndex(currentCandleIdx);

    if (pulseRef.current && curve) {
      const point = curve.getPointAt(t);
      pulseRef.current.position.copy(point);
      const pulseMat = pulseRef.current.material as THREE.MeshStandardMaterial;
      const color = aiSignal.type === 'bullish' ? '#ffd700' : '#ff3366';
      pulseMat.color.set(color);
      pulseMat.emissive.set(color);
      if (pulseGlowRef.current) {
        pulseGlowRef.current.color.set(color);
        pulseGlowRef.current.intensity = 4 + Math.sin(elapsed * 18) * 2;
      }
    }
  });

  const tubeRadius = 0.045 + heroScrollProgress * 0.015;

  return (
    <group>
      <mesh ref={glowRef}>
        <tubeGeometry args={[curve, 80, tubeRadius * 2.2, 8, false]} />
        <meshBasicMaterial color="#ffd700" transparent opacity={0.12} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={lineRef}>
        <tubeGeometry args={[curve, 100, tubeRadius, 10, false]} />
        <meshPhysicalMaterial
          color="#ffd700"
          emissive="#ffcc00"
          emissiveIntensity={1.1}
          roughness={0.05}
          metalness={0.95}
          clearcoat={1}
        />
      </mesh>

      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.14, 20, 20]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={4} roughness={0.05} />
        <pointLight ref={pulseGlowRef} distance={5} decay={2} intensity={3} />
      </mesh>
    </group>
  );
}
