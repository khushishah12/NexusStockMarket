'use client';

import React from 'react';
import Link from 'next/link';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  sidePanel?: React.ReactNode;
}

export default function AuthLayout({ children, title, subtitle, sidePanel }: AuthLayoutProps) {
  return (
    <div className="auth-page">
      <div className="auth-bg-grid" aria-hidden />
      <div className="auth-bg-glow auth-bg-glow--left" aria-hidden />
      <div className="auth-bg-glow auth-bg-glow--right" aria-hidden />

      <header className="auth-header">
        <Link href="/" className="auth-logo">
          <span className="logo-pulse" />
          <span className="logo-text">
            NEXUS<span className="logo-subtext">.AI</span>
          </span>
        </Link>
      </header>

      <main className={`auth-main ${sidePanel ? 'auth-main--split' : ''}`}>
        <div className="auth-card-wrap">
          <div className="auth-card">
            <div className="auth-card-accent" />
            <h1 className="auth-title">{title}</h1>
            <p className="auth-subtitle">{subtitle}</p>
            {children}
          </div>
        </div>
        {sidePanel && <aside className="auth-side-panel">{sidePanel}</aside>}
      </main>
    </div>
  );
}
