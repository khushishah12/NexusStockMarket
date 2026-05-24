'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';

interface ParticleSystemProps {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
}

export default function Particles({ mouseRef }: ParticleSystemProps) {
  const { bullReacting, bearReacting } = useMarketStore();
  
  const pointsRef = useRef<THREE.Points>(null);
  const bullBurstRef = useRef<THREE.Points>(null);
  const bearBurstRef = useRef<THREE.Points>(null);

  // Generate coordinates for 400 ambient dust particles
  const count = 550;
  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Box volume [-12, 12] width, [-5, 8] height, [-10, 10] depth
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 13 + 1.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;

      spd[i] = 0.02 + Math.random() * 0.03;
    }
    return [pos, spd];
  }, []);

  // Generate 80 shockwave particles for Bull & Bear react bursts
  const burstCount = 80;
  const [bullBurstData, bearBurstData] = useMemo(() => {
    const bullPos = new Float32Array(burstCount * 3);
    const bullDirs = new Float32Array(burstCount * 3);
    const bearPos = new Float32Array(burstCount * 3);
    const bearDirs = new Float32Array(burstCount * 3);

    for (let i = 0; i < burstCount; i++) {
      // Random directions on a hemisphere/sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      
      const dx = Math.sin(phi) * Math.cos(theta);
      const dy = Math.cos(phi); // Y axis
      const dz = Math.sin(phi) * Math.sin(theta);

      // Bull center (world ~ -4.5 from MainScene bullGroup)
      bullPos[i * 3] = -4.5;
      bullPos[i * 3 + 1] = -1;
      bullPos[i * 3 + 2] = 0;

      bullDirs[i * 3] = dx;
      bullDirs[i * 3 + 1] = Math.abs(dy); // Stomp shockwave spreads upwards/outwards
      bullDirs[i * 3 + 2] = dz;

      // Bear center (world ~ 4.5 from MainScene bearGroup)
      bearPos[i * 3] = 4.5;
      bearPos[i * 3 + 1] = -1;
      bearPos[i * 3 + 2] = 0;

      bearDirs[i * 3] = dx;
      bearDirs[i * 3 + 1] = dy;
      bearDirs[i * 3 + 2] = dz;
    }
    return [
      { pos: bullPos, dirs: bullDirs, age: 0 },
      { pos: bearPos, dirs: bearDirs, age: 0 }
    ];
  }, []);

  const bullBurstRefData = useRef(bullBurstData);
  const bearBurstRefData = useRef(bearBurstData);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();

    // 1. Animate ambient dust
    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;

      for (let i = 0; i < count; i++) {
        // Slow float up
        posAttr.setY(i, posAttr.getY(i) + speeds[i] * 0.2);

        // Slow horizontal weave
        posAttr.setX(i, posAttr.getX(i) + Math.sin(elapsed + i) * 0.002);

        // Wrap around bounds
        if (posAttr.getY(i) > 8) posAttr.setY(i, -5);
      }

      // Parallax effect using mouse
      pointsRef.current.position.x = -mouseRef.current.x * 1.5;
      pointsRef.current.position.y = -mouseRef.current.y * 1.5;
      posAttr.needsUpdate = true;
    }

    // 2. Animate Bull stomp shockwave (green)
    if (bullReacting) {
      bullBurstRefData.current.age += 0.04;
      if (bullBurstRef.current) {
        bullBurstRef.current.visible = true;
        const geo = bullBurstRef.current.geometry;
        const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
        const age = bullBurstRefData.current.age;
        const opacity = Math.max(0, 1 - age);
        
        // Update particles material opacity directly
        const mat = bullBurstRef.current.material as THREE.PointsMaterial;
        mat.opacity = opacity;

        for (let i = 0; i < burstCount; i++) {
          const dirX = bullBurstRefData.current.dirs[i * 3];
          const dirY = bullBurstRefData.current.dirs[i * 3 + 1];
          const dirZ = bullBurstRefData.current.dirs[i * 3 + 2];
          
          // Expand from center [-5, -1, 0]
          posAttr.setX(i, -4.5 + dirX * age * 4.5);
          posAttr.setY(i, -1 + dirY * age * 3.5);
          posAttr.setZ(i, 0 + dirZ * age * 4.5);
        }
        posAttr.needsUpdate = true;
      }
    } else {
      bullBurstRefData.current.age = 0;
      if (bullBurstRef.current) bullBurstRef.current.visible = false;
    }

    // 3. Animate Bear swipe ripple (red)
    if (bearReacting) {
      bearBurstRefData.current.age += 0.04;
      if (bearBurstRef.current) {
        bearBurstRef.current.visible = true;
        const geo = bearBurstRef.current.geometry;
        const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
        const age = bearBurstRefData.current.age;
        const opacity = Math.max(0, 1 - age);

        const mat = bearBurstRef.current.material as THREE.PointsMaterial;
        mat.opacity = opacity;

        for (let i = 0; i < burstCount; i++) {
          const dirX = bearBurstRefData.current.dirs[i * 3];
          const dirY = bearBurstRefData.current.dirs[i * 3 + 1];
          const dirZ = bearBurstRefData.current.dirs[i * 3 + 2];

          // Expand from center [5, -1, 0]
          posAttr.setX(i, 4.5 + dirX * age * 4.5);
          posAttr.setY(i, -1 + dirY * age * 3.5);
          posAttr.setZ(i, 0 + dirZ * age * 4.5);
        }
        posAttr.needsUpdate = true;
      }
    } else {
      bearBurstRefData.current.age = 0;
      if (bearBurstRef.current) bearBurstRef.current.visible = false;
    }
  });

  return (
    <group>
      {/* Ambient digital dust particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.055}
          color="#00e5ff"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Bull stomp shockwave (green) */}
      <points ref={bullBurstRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[bullBurstRefData.current.pos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color="#00ff88"
          transparent
          opacity={1.0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Bear swipe ripple (red) */}
      <points ref={bearBurstRef} visible={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[bearBurstRefData.current.pos, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color="#ff3366"
          transparent
          opacity={1.0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
