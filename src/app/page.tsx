'use client';

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useMouseTracking } from '../hooks/useMouseTracking';
import LoadingScreen from '../components/ui/LoadingScreen';
import HeroOverlay from '../components/ui/HeroOverlay';
import { useMarketStore } from '../store/useMarketStore';

// Dynamically import the Canvas scene to prevent SSR issues (WebGL/document references)
const MainScene = dynamic(() => import('../components/scene/MainScene'), {
  ssr: false,
});

export default function Home() {
  const mouseRef = useMouseTracking();
  const { fetchData } = useMarketStore();

  useEffect(() => {
    // Initial fetch of market statistics
    fetchData();

    // Setup periodic polling for data updates
    const interval = setInterval(() => {
      fetchData();
    }, 15000);

    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <main style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Visual Preloader */}
      <LoadingScreen />

      {/* R3F WebGL Scene */}
      <MainScene mouseRef={mouseRef} />

      {/* HTML Layout Overlay */}
      <HeroOverlay />
    </main>
  );
}
