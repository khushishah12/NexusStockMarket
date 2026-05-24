import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  accent?: 'neutral' | 'bullish' | 'bearish';
}

const accentBorder = {
  neutral: 'border-cyan-500/20',
  bullish: 'border-emerald-500/25',
  bearish: 'border-rose-500/25',
};

export default function GlassCard({
  children,
  className = '',
  accent = 'neutral',
}: GlassCardProps) {
  return (
    <div
      className={`rounded-xl border bg-white/[0.03] p-5 backdrop-blur-md ${accentBorder[accent]} ${className}`}
    >
      {children}
    </div>
  );
}
