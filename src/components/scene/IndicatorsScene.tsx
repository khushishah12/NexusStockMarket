'use client';

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';

export default function IndicatorsScene() {
  const { indicators } = useMarketStore();
  const groupRef = useRef<THREE.Group>(null);

  // Construct coordinates for the three charts
  const charts = useMemo(() => {
    const rsiPts: [number, number, number][] = [];
    const macdPts: [number, number, number][] = [];
    const emaPts1: [number, number, number][] = [];
    const emaPts2: [number, number, number][] = [];

    const length = indicators.macd.macdLine.length;
    const spacing = 0.45;

    for (let i = 0; i < length; i++) {
      const x = (i - (length - 1) / 2) * spacing;
      
      // RSI ranges 0-100, normalize around 0. Y-height from -1 to 1
      const rsiY = ((indicators.rsi - 50) / 25) + Math.sin(i * 0.5) * 0.2;
      rsiPts.push([x, rsiY - 1, 0]);

      // MACD Line
      const macdY = indicators.macd.macdLine[i] * 0.4;
      macdPts.push([x, macdY + 1, 0]);

      // EMA Lines
      const emaY1 = (indicators.ema.ema9[i] - 155) * 0.2;
      const emaY2 = (indicators.ema.ema21[i] - 155) * 0.2;
      emaPts1.push([x, emaY1, 0.2]);
      emaPts2.push([x, emaY2, -0.2]);
    }

    return { rsiPts, macdPts, emaPts1, emaPts2 };
  }, [indicators]);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (groupRef.current) {
      // Subtle float
      groupRef.current.position.y = Math.sin(elapsed * 2) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* MACD Waves (Cyan) */}
      <group position={[0, 1.2, 0]}>
        <Line
          points={charts.macdPts}
          color="#00ffff"
          lineWidth={2.5}
        />
        {/* Draw a soft reference dashed grid line */}
        <Line
          points={[[-5, 0, 0], [5, 0, 0]]}
          color="#ffffff"
          lineWidth={0.5}
          dashed
          dashSize={0.2}
          gapSize={0.1}
        />
      </group>

      {/* EMA Ribbon (Gold & Orange) */}
      <group position={[0, 0, 0]}>
        <Line
          points={charts.emaPts1}
          color="#ffd700"
          lineWidth={3.0}
        />
        <Line
          points={charts.emaPts2}
          color="#ff7a00"
          lineWidth={2.0}
        />
      </group>

      {/* RSI Curve (Yellow) */}
      <group position={[0, -1.2, 0]}>
        <Line
          points={charts.rsiPts}
          color="#fbbf24"
          lineWidth={2.5}
        />
        <Line
          points={[[-5, 0.4, 0], [5, 0.4, 0]]} // Overbought 70 line
          color="#ff3366"
          lineWidth={0.5}
          dashed
        />
        <Line
          points={[[-5, -0.4, 0], [5, -0.4, 0]]} // Oversold 30 line
          color="#00ff88"
          lineWidth={0.5}
          dashed
        />
      </group>
    </group>
  );
}
