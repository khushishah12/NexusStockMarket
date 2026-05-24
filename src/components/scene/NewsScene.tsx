'use client';

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';

export default function NewsScene() {
  const { news } = useMarketStore();
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(elapsed) * 0.1;
    }
  });

  // Render top 3 news articles as holographic rotating boxes
  const displayNews = news.slice(0, 3);

  return (
    <group ref={groupRef}>
      {displayNews.map((article, i) => {
        const xPos = (i - 1) * 3.5; // Space out the 3 cubes
        const yPos = Math.sin(i * 2) * 0.3;
        
        let color = '#888899'; // neutral
        if (article.sentiment === 'positive') color = '#00ff88';
        if (article.sentiment === 'negative') color = '#ff3366';

        return (
          <NewsCube
            key={i}
            article={article}
            position={[xPos, yPos, 0]}
            color={color}
            index={i}
          />
        );
      })}
    </group>
  );
}

interface NewsCubeProps {
  article: {
    title: string;
    sentiment: string;
    source: string;
    time: string;
  };
  position: [number, number, number];
  color: string;
  index: number;
}

function NewsCube({ article, position, color, index }: NewsCubeProps) {
  const cubeRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (cubeRef.current) {
      // Rotate each cube on its own speed
      cubeRef.current.rotation.y = elapsed * 0.2 + index * 1.5;
      cubeRef.current.rotation.x = Math.sin(elapsed * 0.5 + index) * 0.15;
    }
  });

  return (
    <group ref={cubeRef} position={position}>
      {/* Semi-transparent Glass Outer Cube */}
      <mesh castShadow>
        <boxGeometry args={[2.0, 1.4, 2.0]} />
        <meshPhysicalMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.15}
          roughness={0.1}
          metalness={0.1}
          transmission={0.8}
          thickness={0.5}
          transparent
          opacity={0.35}
        />
      </mesh>

      {/* Outer Neon Wireframe edges */}
      <mesh>
        <boxGeometry args={[2.02, 1.42, 2.02]} />
        <meshBasicMaterial color={color} wireframe />
      </mesh>

      {/* HTML text rendered inside the cube (facing user) */}
      <Html transform distanceFactor={4} scale={[0.8, 0.8, 0.8]} occlude>
        <div
          className="news-card"
          style={{
            borderColor: color,
            boxShadow: `0 0 15px ${color}20`,
          }}
        >
          <div className="news-source">
            <span style={{ color }}>{article.source.toUpperCase()}</span>
            <span className="news-time">{article.time}</span>
          </div>
          <div className="news-title">{article.title}</div>
          <div className="news-sentiment" style={{ background: `${color}15`, color }}>
            {article.sentiment.toUpperCase()} SENTIMENT
          </div>
        </div>
      </Html>
    </group>
  );
}
