export const COLORS = {
  bg: '#0a0a0f',
  bgCard: 'rgba(10, 10, 15, 0.6)',
  border: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#ffffff',
  textSecondary: '#a0a0b0',
  bullish: '#00ff88',
  bullishGlow: 'rgba(0, 255, 136, 0.4)',
  cyan: '#00e5ff',
  cyanGlow: 'rgba(0, 229, 255, 0.45)',
  bearish: '#ff3366',
  bearishGlow: 'rgba(255, 51, 102, 0.4)',
  bearCrack: '#ff0044',
  accent: '#ffd700',
  accentGlow: 'rgba(255, 215, 0, 0.4)',
  neutral: '#888899',
  neutralGlow: 'rgba(136, 136, 153, 0.2)',
  glowIntensity: 1.5,
};

export const SCROLL_SECTIONS = {
  HERO: { start: 0.0, end: 0.2 },
  AI_BRAIN: { start: 0.2, end: 0.4 },
  INDICATORS: { start: 0.4, end: 0.6 },
  NEWS: { start: 0.6, end: 0.8 },
  CTA: { start: 0.8, end: 1.0 },
};

export const CHART_CONFIG = {
  width: 14,
  heightScale: 0.15,
  spacing: 0.7,
  count: 20,
};

export const BULL_CONFIG = {
  position: [-5, -1, 0] as [number, number, number],
  scale: [1, 1, 1] as [number, number, number],
  rotation: [0, 0.5, 0] as [number, number, number],
};

export const BEAR_CONFIG = {
  position: [5, -1, 0] as [number, number, number],
  scale: [1, 1, 1] as [number, number, number],
  rotation: [0, -0.5, 0] as [number, number, number],
};
