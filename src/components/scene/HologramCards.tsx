'use client';

import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useMarketStore } from '../../store/useMarketStore';

export default function HologramCards() {
  const { livePrice, aiSignal, heroScrollProgress } = useMarketStore();
  const groupRef = useRef<THREE.Group>(null);

  const cards = [
    {
      id: 'price',
      label: 'LIVE PRICE',
      value: `$${livePrice.toFixed(2)}`,
      change: '+4.8%',
      isPositive: true,
      color: '#00ff88',
      desc: 'NEXUS index real-time value',
    },
    {
      id: 'ai-signal',
      label: 'AI SIGNAL',
      value: aiSignal.type.toUpperCase(),
      change: `${(aiSignal.confidence * 100).toFixed(0)}% Conf`,
      isPositive: aiSignal.type === 'bullish',
      color: aiSignal.type === 'bullish' ? '#00ff88' : '#ff3366',
      desc: aiSignal.message,
    },
    {
      id: 'buy-prob',
      label: 'BUY PROBABILITY',
      value: `${aiSignal.buyProbability}%`,
      change: 'Strong Buy',
      isPositive: true,
      color: '#ffd700',
      desc: 'Neural net conviction score',
    },
    {
      id: 'sentiment',
      label: 'SENTIMENT SCORE',
      value: aiSignal.sentimentScore.toFixed(2),
      change: 'Positive',
      isPositive: true,
      color: '#00e5ff',
      desc: 'AI text analysis from global news feeds',
    },
  ];

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (groupRef.current) {
      groupRef.current.position.y = 1.2 + Math.sin(elapsed * 0.9) * 0.12;
      groupRef.current.rotation.y = elapsed * (0.045 + heroScrollProgress * 0.02);
    }
  });

  const orbitRadius = 4.2 - heroScrollProgress * 0.5;
  const verticalSpread = heroScrollProgress * 0.4;

  return (
    <group ref={groupRef} position={[0, 1.2, 0]}>
      {cards.map((card, i) => {
        const angle = (i * Math.PI * 2) / 4 + heroScrollProgress * 0.5;
        const x = Math.cos(angle) * orbitRadius;
        const z = Math.sin(angle) * orbitRadius;
        const y = Math.sin(i + heroScrollProgress * 3) * verticalSpread;

        return (
          <HologramCard
            key={card.id}
            card={card}
            position={[x, y, z]}
            angle={angle}
          />
        );
      })}
    </group>
  );
}

interface HologramCardProps {
  card: {
    id: string;
    label: string;
    value: string;
    change: string;
    isPositive: boolean;
    color: string;
    desc: string;
  };
  position: [number, number, number];
  angle: number;
}

function HologramCard({ card, position, angle }: HologramCardProps) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef<THREE.Group>(null);
  const basePos = useRef(new THREE.Vector3(...position));
  const { fetchData, expandedHoloCard, setExpandedHoloCard, rotateScene } = useMarketStore();

  const isExpanded = expandedHoloCard === card.id;

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedHoloCard(isExpanded ? null : card.id);
    if (card.id === 'ai-signal') fetchData();
    if (card.id === 'price') rotateScene();
  };

  useFrame((state) => {
    if (cardRef.current && state.camera) {
      cardRef.current.quaternion.copy(state.camera.quaternion);
      const elapsed = state.clock.getElapsedTime();
      const wave = Math.sin(elapsed * 2 + angle) * 0.18;
      const expandLift = isExpanded ? 0.35 : 0;
      cardRef.current.position.y = basePos.current.y + wave + expandLift;
      const targetScale = isExpanded ? 1.22 : hovered ? 1.08 : 1;
      cardRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
    }
  });

  return (
    <group ref={cardRef} position={position}>
      <Html transform distanceFactor={isExpanded ? 4.2 : 5} occlude>
        <div
          onClick={handleCardClick}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`hologram-card ${hovered ? 'hovered' : ''} ${isExpanded ? 'expanded' : ''}`}
          style={{
            borderColor: card.color,
            boxShadow: hovered || isExpanded
              ? `0 0 30px ${card.color}55, inset 0 0 16px ${card.color}25`
              : `0 0 8px ${card.color}22`,
            transform: isExpanded ? 'scale(1.05)' : undefined,
          }}
        >
          <div className="corner-accent tl" style={{ background: card.color }} />
          <div className="corner-accent tr" style={{ background: card.color }} />
          <div className="corner-accent bl" style={{ background: card.color }} />
          <div className="corner-accent br" style={{ background: card.color }} />

          <div className="card-label" style={{ color: card.color }}>{card.label}</div>
          <div className="card-value">{card.value}</div>

          <div className="card-footer">
            <span
              className="card-change"
              style={{ color: card.isPositive ? '#00ff88' : '#ff3366' }}
            >
              {card.change}
            </span>
            {(hovered || isExpanded) && <div className="card-tooltip">{card.desc}</div>}
          </div>
        </div>
      </Html>
    </group>
  );
}
