'use client';

import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';
import { CHART_CONFIG } from '../../lib/constants';

interface CandlesticksProps {
  mouseRef?: React.MutableRefObject<{ x: number; y: number }>;
}

export default function Candlesticks({ mouseRef }: CandlesticksProps) {
  const groupRef = useRef<THREE.Group>(null);
  const {
    candles,
    setHoveredCandle,
    selectedCandle,
    setSelectedCandle,
    pulseIndex,
    heroScrollProgress,
    patternHighlight,
  } = useMarketStore();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const prices = candles.flatMap((c) => [c.low, c.high]);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;
  const targetHeight = 4.2;
  const scaleY = targetHeight / priceRange;

  const get3DCoords = (open: number, close: number, high: number, low: number, index: number) => {
    const x = (index - (candles.length - 1) / 2) * CHART_CONFIG.spacing;
    const yBody = ((open + close) / 2 - minPrice) * scaleY - targetHeight / 2 + 0.5;
    const bodyHeight = Math.max(0.08, Math.abs(close - open) * scaleY);
    const yWick = ((high + low) / 2 - minPrice) * scaleY - targetHeight / 2 + 0.5;
    const wickHeight = Math.max(0.1, (high - low) * scaleY);
    return { x, yBody, bodyHeight, yWick, wickHeight };
  };

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!groupRef.current) return;

    // Giant chart: slow rotation + scroll-driven tilt + mouse parallax
    const scrollTilt = heroScrollProgress * 0.35;
    const mouseX = mouseRef?.current.x ?? 0;
    const mouseY = mouseRef?.current.y ?? 0;

    groupRef.current.rotation.y = t * 0.08 + scrollTilt * 0.5 + mouseX * 0.12;
    groupRef.current.rotation.x = -0.08 + scrollTilt * 0.15 + mouseY * 0.06;
    groupRef.current.position.z = Math.sin(t * 0.5) * 0.08 + heroScrollProgress * 0.4;
    groupRef.current.scale.setScalar(1 + heroScrollProgress * 0.08);
  });

  return (
    <group ref={groupRef} position={[0, 0.5, 0]}>
      {patternHighlight && (
        <mesh position={[0, 0, -0.5]}>
          <planeGeometry args={[12, 5]} />
          <meshBasicMaterial
            color="#ffd700"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {candles.map((candle, i) => {
        const { x, yBody, bodyHeight, yWick, wickHeight } = get3DCoords(
          candle.open,
          candle.close,
          candle.high,
          candle.low,
          i
        );

        const isHovered = hoveredIdx === i;
        const isPulsing = pulseIndex === i;
        const isSelected = selectedCandle?.time === candle.time;
        const color = candle.isBullish ? '#00ff88' : '#ff3366';
        const edgeColor = candle.isBullish ? '#00e5ff' : '#ff0044';
        const floatOffset = !isSelected ? Math.sin(i * 0.5 + heroScrollProgress * 4) * 0.06 : 0;
        const scrollPop = 1 + Math.sin(i * 0.4 + heroScrollProgress * Math.PI * 2) * 0.04;

        return (
          <group
            key={i}
            position={[x, floatOffset, isPulsing ? 0.15 : 0]}
            scale={isHovered ? [1.25, 1.08, 1.25] : [scrollPop, scrollPop, scrollPop]}
            onPointerOver={(e) => {
              e.stopPropagation();
              setHoveredIdx(i);
              setHoveredCandle(candle);
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoveredIdx(null);
              setHoveredCandle(null);
              document.body.style.cursor = 'default';
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedCandle(isSelected ? null : candle);
            }}
          >
            <mesh position={[0, yWick, 0]}>
              <cylinderGeometry args={[0.018, 0.018, wickHeight, 6]} />
              <meshStandardMaterial
                color={color}
                emissive={edgeColor}
                emissiveIntensity={isHovered || isPulsing ? 2.2 : 0.55}
                transparent
                opacity={0.9}
              />
            </mesh>

            <mesh position={[0, yBody, 0]} castShadow>
              <boxGeometry args={[0.32, bodyHeight, 0.32]} />
              <meshPhysicalMaterial
                color={color}
                emissive={color}
                emissiveIntensity={isHovered || isPulsing ? 2.8 : isSelected ? 1.4 : 0.5}
                roughness={0.05}
                metalness={0.15}
                transmission={0.82}
                thickness={1.2}
                ior={1.45}
                transparent
                opacity={0.72}
                clearcoat={1}
                clearcoatRoughness={0.05}
              />
              <Edges
                threshold={12}
                color={edgeColor}
                scale={isHovered ? 1.05 : 1}
              />
            </mesh>

            {(isSelected || isPulsing) && (
              <mesh position={[0, yBody - bodyHeight / 2 - 0.12, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.22, 0.34, 24]} />
                <meshBasicMaterial
                  color={edgeColor}
                  transparent
                  opacity={isPulsing ? 0.9 : 0.55}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
