'use client';

import React, { useEffect, useState } from 'react';

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setVisible(false), 500); // Fade out delay
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 5;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div className={`loading-screen ${progress === 100 ? 'fade-out' : ''}`}>
      <div className="loader-container">
        <div className="loader-logo">
          NEXUS<span className="text-emerald-400">.AI</span>
        </div>
        
        {/* Glow Ring */}
        <div className="loader-ring-wrapper">
          <div className="loader-ring" />
          <div className="loader-percentage">{Math.min(progress, 100)}%</div>
        </div>

        <div className="loader-status">
          {progress < 40 && 'INITIALIZING WEBGL CORE...'}
          {progress >= 40 && progress < 75 && 'GENERATING BULL & BEAR GEOMETRIES...'}
          {progress >= 75 && progress < 100 && 'ESTABLISHING SECURE DATABASE CONNECT...'}
          {progress === 100 && 'COMPILING FINTECH MATRIX...'}
        </div>
      </div>
    </div>
  );
}
