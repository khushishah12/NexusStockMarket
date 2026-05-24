'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useMarketStore } from '../../store/useMarketStore';
import { TrendingUp, Brain, BarChart2, MessageSquare, Terminal } from 'lucide-react';

export default function HeroOverlay() {
  const router = useRouter();
  const { activeSection, aiSignal } = useMarketStore();

  const goLogin = () => router.push('/login');
  const goSignup = () => router.push('/signup');

  const sections = [
    {
      title: 'Smarter Stock Decisions, Powered by AI.',
      subtitle: 'Live data, predictions, sentiment & trends — visualized in 3D.',
      icon: <TrendingUp className="section-icon text-emerald-400" />,
      tag: 'FINANCIAL INTELLIGENCE',
      primaryBtn: 'Log in',
      secondaryBtn: 'Sign up',
      primaryAction: goLogin,
      secondaryAction: goSignup,
    },
    {
      title: 'Neural Net Trend Analysis',
      subtitle: 'Proprietary deep learning models synthesize live tickers, scanning volume patterns to project breakout probabilities.',
      icon: <Brain className="section-icon text-blue-400" />,
      tag: 'PREDICTIVE ENGINE',
      primaryBtn: 'Log in',
      primaryAction: goLogin,
    },
    {
      title: 'Dynamic Technical Indicators',
      subtitle: 'Evaluate RSI levels, MACD momentum bars, and moving average ribbons rendered procedurally on the fly.',
      icon: <BarChart2 className="section-icon text-amber-400" />,
      tag: 'TECHNICAL ALGORITHMS',
      primaryBtn: 'Log in',
      primaryAction: goLogin,
    },
    {
      title: 'Natural Language News Sentiment',
      subtitle: 'Real-time classification of news feeds and reports. Dynamic color-coded cubes map positive or negative outlooks.',
      icon: <MessageSquare className="section-icon text-pink-400" />,
      tag: 'SENTIMENT CORRELATOR',
      primaryBtn: 'Log in',
      primaryAction: goLogin,
    },
    {
      title: 'Access the Financial Matrix',
      subtitle: 'The full Next.js dashboard features custom watchlists, trading triggers, and deep portfolio analytics.',
      icon: <Terminal className="section-icon text-indigo-400" />,
      tag: 'NEXUS TERMINAL',
      primaryBtn: 'Log in',
      isFinal: true,
      primaryAction: goLogin,
    },
  ];

  return (
    <div className="ui-overlay-root">
      <header className="main-header">
        <div className="logo-container">
          <span className="logo-pulse" />
          <span className="logo-text">NEXUS<span className="logo-subtext">.AI</span></span>
        </div>
        <nav className="desktop-nav">
          <a href="#" className="nav-link active">Terminal</a>
          <a href="#features" className="nav-link">Analytics</a>
          <a href="#pricing" className="nav-link">Enterprise</a>
        </nav>
        <div className="header-auth-actions">
          <button type="button" className="header-cta header-cta--ghost" onClick={goLogin}>
            Log in
          </button>
          <button type="button" className="header-cta" onClick={goSignup}>
            Sign up
          </button>
        </div>
      </header>

      <div className="content-container">
        {sections.map((sec, i) => {
          const isActive = activeSection === i;

          return (
            <div
              key={i}
              className={`section-content ${isActive ? 'active' : ''}`}
            >
              <div className="section-tag" style={{ color: aiSignal.type === 'bullish' && i === 0 ? '#00ff88' : '' }}>
                {sec.icon}
                {sec.tag}
              </div>
              <h1 className="section-title">{sec.title}</h1>
              <p className="section-subtitle">{sec.subtitle}</p>

              <div className="button-group">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={sec.primaryAction}
                  style={{
                    boxShadow: i === 0 && aiSignal.type === 'bullish' ? '0 0 20px rgba(0,255,136,0.3)' : '',
                    borderColor: i === 0 && aiSignal.type === 'bullish' ? '#00ff88' : '',
                  }}
                >
                  {sec.primaryBtn}
                </button>
                {sec.secondaryBtn && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={sec.secondaryAction}
                  >
                    {sec.secondaryBtn}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="scroll-indicator">
        {sections.map((_, i) => (
          <div
            key={i}
            className={`indicator-dot ${activeSection === i ? 'active' : ''}`}
          />
        ))}
      </div>

      {activeSection === 0 && (
        <div className="scroll-helper">
          <div className="mouse-wheel" />
          <span className="scroll-text">SCROLL TO ANALYZE · DOUBLE-CLICK TO ROTATE</span>
        </div>
      )}
    </div>
  );
}
