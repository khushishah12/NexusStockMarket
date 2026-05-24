'use client';

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ScrollControls, useScroll } from '@react-three/drei';
import * as THREE from 'three';

import Lighting from './Lighting';
import Particles from './Particles';
import PostProcessing from './PostProcessing';
import EnvironmentChamber from './EnvironmentChamber';
import LightStreaks from './LightStreaks';
import InteractionRipples from './InteractionRipples';
import Bull from './Bull';
import Bear from './Bear';
import Candlesticks from './Candlesticks';
import GoldenLine from './GoldenLine';
import HologramCards from './HologramCards';
import NeuralSphere from './NeuralSphere';
import IndicatorsScene from './IndicatorsScene';
import NewsScene from './NewsScene';
import CTAScene from './CTAScene';
import { useMarketStore } from '../../store/useMarketStore';

interface SceneProps {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
}

export default function MainScene({ mouseRef }: SceneProps) {
  return (
    <div className="canvas-container">
      <Canvas
        camera={{ position: [0, 0.3, 7.5], fov: 48, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        shadows
      >
        <color attach="background" args={['#050508']} />

        <EnvironmentChamber />
        <Lighting />
        <LightStreaks />
        <Particles mouseRef={mouseRef} />
        <InteractionRipples />
        <PostProcessing />

        <ScrollControls pages={5} damping={0.18}>
          <SceneManager mouseRef={mouseRef} />
        </ScrollControls>
      </Canvas>
    </div>
  );
}

function SceneManager({ mouseRef }: SceneProps) {
  const scroll = useScroll();
  const {
    setActiveSection,
    setScrollOffset,
    setHeroScrollProgress,
    sceneRotation,
    rotateScene,
  } = useMarketStore();

  const worldRef = useRef<THREE.Group>(null);
  const heroGroup = useRef<THREE.Group>(null);
  const bullGroup = useRef<THREE.Group>(null);
  const bearGroup = useRef<THREE.Group>(null);
  const hologramGroup = useRef<THREE.Group>(null);
  const brainGroup = useRef<THREE.Group>(null);
  const indicatorGroup = useRef<THREE.Group>(null);
  const newsGroup = useRef<THREE.Group>(null);
  const ctaGroup = useRef<THREE.Group>(null);

  useFrame((state) => {
    const offset = scroll.offset;
    setScrollOffset(offset);

    const heroLocal = Math.min(1, offset / 0.2);
    setHeroScrollProgress(heroLocal);

    let activeSec = 0;
    if (offset >= 0.2 && offset < 0.4) activeSec = 1;
    else if (offset >= 0.4 && offset < 0.6) activeSec = 2;
    else if (offset >= 0.6 && offset < 0.8) activeSec = 3;
    else if (offset >= 0.8) activeSec = 4;
    setActiveSection(activeSec);

    const cam = state.camera as THREE.PerspectiveCamera;
    const mouseX = mouseRef.current.x;
    const mouseY = mouseRef.current.y;

    // Cinematic camera: parallax + hero zoom on scroll
    const heroZoom = 7.5 - heroLocal * 1.8;
    const sectionZoom = offset < 0.2 ? heroZoom : 7.5 + (offset - 0.2) * 2;
    cam.position.z = THREE.MathUtils.lerp(cam.position.z, sectionZoom, 0.06);
    cam.position.x = THREE.MathUtils.lerp(cam.position.x, mouseX * 0.55, 0.08);
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, 0.3 + mouseY * 0.45 - heroLocal * 0.15, 0.08);
    cam.lookAt(mouseX * 0.3, 0.45 + mouseY * 0.2, 0);
    cam.fov = THREE.MathUtils.lerp(cam.fov, 48 - heroLocal * 4, 0.05);
    cam.updateProjectionMatrix();

    if (worldRef.current) {
      worldRef.current.rotation.y = THREE.MathUtils.lerp(
        worldRef.current.rotation.y,
        sceneRotation,
        0.04
      );
    }

    if (heroGroup.current) {
      if (offset < 0.2) {
        heroGroup.current.position.set(0, 0.2 + heroLocal * 0.15, heroLocal * 0.25);
        heroGroup.current.scale.setScalar(1 + heroLocal * 0.05);
        heroGroup.current.rotation.y = heroLocal * 0.2;
      } else if (offset >= 0.2 && offset < 0.4) {
        const progress = (offset - 0.2) / 0.2;
        heroGroup.current.position.x = -progress * 4.0;
        heroGroup.current.position.y = 0.2 - progress * 0.2;
        heroGroup.current.scale.setScalar(1.0 - progress * 0.35);
      } else if (offset >= 0.4 && offset < 0.6) {
        const progress = (offset - 0.4) / 0.2;
        heroGroup.current.position.x = -4.0 - progress * 2.0;
        heroGroup.current.scale.setScalar(Math.max(0, 0.65 - progress * 0.65));
      } else {
        heroGroup.current.scale.setScalar(0);
      }
    }

    if (hologramGroup.current) {
      if (offset < 0.2) {
        const orbitShift = heroLocal * 0.6;
        hologramGroup.current.position.y = 1.2 + Math.sin(state.clock.elapsedTime * 0.8) * 0.08;
        hologramGroup.current.rotation.y = state.clock.elapsedTime * (0.05 + heroLocal * 0.03);
        hologramGroup.current.scale.setScalar(1 + orbitShift * 0.05);
      } else if (offset >= 0.2 && offset < 0.4) {
        const progress = (offset - 0.2) / 0.2;
        hologramGroup.current.scale.setScalar(Math.max(0, 1.0 - progress * 1.0));
        hologramGroup.current.rotation.y += 0.02;
      } else {
        hologramGroup.current.scale.setScalar(0);
      }
    }

    const bullHeroReact = heroLocal * 0.35;
    if (bullGroup.current) {
      if (offset < 0.2) {
        bullGroup.current.position.set(-4.5 - bullHeroReact * 0.3, -0.6 + bullHeroReact * 0.15, 0.2);
        bullGroup.current.rotation.z = -bullHeroReact * 0.08;
        bullGroup.current.scale.setScalar(0.9 + bullHeroReact * 0.08);
      } else if (offset >= 0.2 && offset < 0.4) {
        const progress = (offset - 0.2) / 0.2;
        bullGroup.current.position.set(-4.5 - progress * 0.5, -0.6, -progress * 2.0);
        bullGroup.current.scale.setScalar(0.9 - progress * 0.2);
        bullGroup.current.rotation.z = 0;
      } else if (offset >= 0.4 && offset < 0.6) {
        const progress = (offset - 0.4) / 0.2;
        bullGroup.current.position.set(-5.0 - progress * 1.5, -0.6, -2.0);
        bullGroup.current.scale.setScalar(0.7 - progress * 0.25);
      } else if (offset >= 0.6 && offset < 0.8) {
        const progress = (offset - 0.6) / 0.2;
        bullGroup.current.scale.setScalar(Math.max(0, 0.45 - progress * 0.45));
      } else {
        const progress = (offset - 0.8) / 0.2;
        bullGroup.current.position.set(-6.5, -1.0, -1.0);
        bullGroup.current.scale.setScalar(progress * 0.3);
      }
    }

    const bearHeroReact = heroLocal * 0.35;
    if (bearGroup.current) {
      if (offset < 0.2) {
        bearGroup.current.position.set(4.5 + bearHeroReact * 0.3, -0.6 + bearHeroReact * 0.1, 0.2);
        bearGroup.current.rotation.z = bearHeroReact * 0.08;
        bearGroup.current.scale.setScalar(0.9 + bearHeroReact * 0.05);
      } else if (offset >= 0.2 && offset < 0.4) {
        const progress = (offset - 0.2) / 0.2;
        bearGroup.current.position.set(4.5 + progress * 0.5, -0.6, -progress * 2.0);
        bearGroup.current.scale.setScalar(0.9 - progress * 0.2);
        bearGroup.current.rotation.z = 0;
      } else if (offset >= 0.4 && offset < 0.6) {
        const progress = (offset - 0.4) / 0.2;
        bearGroup.current.position.set(5.0 + progress * 1.5, -0.6, -2.0);
        bearGroup.current.scale.setScalar(0.7 - progress * 0.25);
      } else if (offset >= 0.6 && offset < 0.8) {
        const progress = (offset - 0.6) / 0.2;
        bearGroup.current.scale.setScalar(Math.max(0, 0.45 - progress * 0.45));
      } else {
        const progress = (offset - 0.8) / 0.2;
        bearGroup.current.position.set(6.5, -1.0, -1.0);
        bearGroup.current.scale.setScalar(progress * 0.3);
      }
    }

    if (brainGroup.current) {
      if (offset < 0.2) {
        brainGroup.current.position.set(0, -8.0, 0);
        brainGroup.current.scale.setScalar(0);
      } else if (offset >= 0.2 && offset < 0.4) {
        const progress = (offset - 0.2) / 0.2;
        brainGroup.current.position.set(progress * 2.5, -8.0 + progress * 8.5, 0);
        brainGroup.current.scale.setScalar(progress * 1.25);
      } else if (offset >= 0.4 && offset < 0.6) {
        const progress = (offset - 0.4) / 0.2;
        brainGroup.current.position.set(2.5, 0.5 + progress * 6.5, 0);
        brainGroup.current.scale.setScalar(Math.max(0, 1.25 - progress * 1.25));
      } else {
        brainGroup.current.scale.setScalar(0);
      }
    }

    if (indicatorGroup.current) {
      if (offset < 0.4) {
        indicatorGroup.current.position.set(0, -8.0, 0);
        indicatorGroup.current.scale.setScalar(0);
      } else if (offset >= 0.4 && offset < 0.6) {
        const progress = (offset - 0.4) / 0.2;
        indicatorGroup.current.position.set(0, -8.0 + progress * 8.5, 0);
        indicatorGroup.current.scale.setScalar(progress * 1.1);
      } else if (offset >= 0.6 && offset < 0.8) {
        const progress = (offset - 0.6) / 0.2;
        indicatorGroup.current.position.set(0, 0.5 + progress * 6.5, 0);
        indicatorGroup.current.scale.setScalar(Math.max(0, 1.1 - progress * 1.1));
      } else {
        indicatorGroup.current.scale.setScalar(0);
      }
    }

    if (newsGroup.current) {
      if (offset < 0.6) {
        newsGroup.current.position.set(0, -8.0, 0);
        newsGroup.current.scale.setScalar(0);
      } else if (offset >= 0.6 && offset < 0.8) {
        const progress = (offset - 0.6) / 0.2;
        newsGroup.current.position.set(0, -8.0 + progress * 8.5, 0);
        newsGroup.current.scale.setScalar(progress * 1.0);
      } else if (offset >= 0.8 && offset < 1.0) {
        const progress = (offset - 0.8) / 0.2;
        newsGroup.current.position.set(0, 0.5 + progress * 6.5, 0);
        newsGroup.current.scale.setScalar(Math.max(0, 1.0 - progress * 1.0));
      } else {
        newsGroup.current.scale.setScalar(0);
      }
    }

    if (ctaGroup.current) {
      if (offset < 0.8) {
        ctaGroup.current.position.set(0, -10.0, 0);
        ctaGroup.current.scale.setScalar(0);
      } else {
        const progress = (offset - 0.8) / 0.2;
        ctaGroup.current.position.set(0, -10.0 + progress * 10.5, 0);
        ctaGroup.current.scale.setScalar(progress * 1.1);
      }
    }
  });

  return (
    <group
      ref={worldRef}
      onDoubleClick={(e) => {
        e.stopPropagation();
        rotateScene();
      }}
    >
      <group ref={heroGroup} position={[0, 0.2, 0]}>
        <Candlesticks mouseRef={mouseRef} />
        <GoldenLine mouseRef={mouseRef} />
      </group>

      <group ref={hologramGroup}>
        <HologramCards />
      </group>

      <group ref={bullGroup}>
        <Bull mouseRef={mouseRef} />
      </group>

      <group ref={bearGroup}>
        <Bear mouseRef={mouseRef} />
      </group>

      <group ref={brainGroup}>
        <NeuralSphere />
      </group>

      <group ref={indicatorGroup}>
        <IndicatorsScene />
      </group>

      <group ref={newsGroup}>
        <NewsScene />
      </group>

      <group ref={ctaGroup}>
        <CTAScene />
      </group>
    </group>
  );
}
