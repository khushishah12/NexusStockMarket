'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMarketStore } from '../../store/useMarketStore';
import LogoutButton from '../../components/auth/LogoutButton';
import {
  TrendingUp,
  ArrowLeft,
  Activity,
  Cpu,
  Bookmark,
  Bell,
  Sliders,
  DollarSign,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

export default function Dashboard() {
  const router = useRouter();
  const { candles, aiSignal, indicators, news, fetchData, livePrice } = useMarketStore();

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleGoBack = () => {
    router.push('/');
  };

  return (
    <div className="dashboard-root">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-logo">
          <span className="logo-pulse" />
          <span className="logo-text">NEXUS<span className="logo-subtext">.AI</span></span>
        </div>
        
        <nav className="sidebar-menu">
          <a href="#" className="menu-item active">
            <Activity className="menu-icon" /> Live Terminal
          </a>
          <a href="#" className="menu-item">
            <Cpu className="menu-icon" /> AI Predictor
          </a>
          <a href="#" className="menu-item">
            <Bookmark className="menu-item-icon" /> Watchlist
          </a>
          <a href="#" className="menu-item">
            <Bell className="menu-icon" /> Alerts
          </a>
          <a href="#" className="menu-item">
            <Sliders className="menu-icon" /> Settings
          </a>
        </nav>

        <div className="sidebar-footer">
          <button className="back-btn" onClick={handleGoBack}>
            <ArrowLeft className="back-icon" /> Back to 3D Scene
          </button>
          <LogoutButton />
        </div>
      </aside>

      {/* Main Grid Content */}
      <main className="dashboard-content">
        {/* Top Navbar */}
        <header className="dashboard-header">
          <div className="header-info">
            <h1 className="header-title">Live Terminal</h1>
            <p className="header-subtitle">Nexus Stock (NXS) real-time calculations</p>
          </div>
          <div className="user-profile">
            <div className="profile-badge">PRO LEVEL</div>
            <div className="profile-pic" />
          </div>
        </header>

        {/* Dashboard Grid Modules */}
        <div className="dashboard-grid">
          {/* 1. Main Ticker Statistic Widget */}
          <section className="grid-widget col-span-2">
            <div className="widget-header">
              <span className="widget-tag">REALTIME TICKER</span>
              <h2 className="widget-title">Market Overview</h2>
            </div>
            <div className="ticker-values">
              <div className="ticker-main">
                <span className="ticker-price">${livePrice.toFixed(2)}</span>
                <span className="ticker-percent positive">
                  <ChevronUp className="inline-icon" /> +4.82%
                </span>
              </div>
              <div className="ticker-stat-group">
                <div className="ticker-stat">
                  <span className="stat-lbl">Open</span>
                  <span className="stat-val">$150.00</span>
                </div>
                <div className="ticker-stat">
                  <span className="stat-lbl">High</span>
                  <span className="stat-val">$168.50</span>
                </div>
                <div className="ticker-stat">
                  <span className="stat-lbl">Low</span>
                  <span className="stat-val">$148.00</span>
                </div>
                <div className="ticker-stat">
                  <span className="stat-lbl">Volume</span>
                  <span className="stat-val">1.24M</span>
                </div>
              </div>
            </div>

            {/* Simulated Horizontal Candle Sparks */}
            <div className="sparklines-container">
              {candles.map((candle, idx) => (
                <div
                  key={idx}
                  className={`spark-bar ${candle.isBullish ? 'bullish' : 'bearish'}`}
                  style={{
                    height: `${20 + Math.abs(candle.close - candle.open) * 10}px`,
                  }}
                />
              ))}
            </div>
          </section>

          {/* 2. AI Intelligence Signals Module */}
          <section className="grid-widget">
            <div className="widget-header">
              <span className="widget-tag" style={{ color: '#ffd700' }}>NEURAL PREDICTION</span>
              <h2 className="widget-title">AI Signals</h2>
            </div>
            <div className="ai-stats-wrap">
              <div className="ai-gauge">
                <div className="gauge-value" style={{ color: aiSignal.type === 'bullish' ? '#00ff88' : '#ff3366' }}>
                  {aiSignal.buyProbability}%
                </div>
                <div className="gauge-label">BUY PROBABILITY</div>
              </div>
              <div className="ai-details">
                <div className="detail-row">
                  <span className="detail-lbl">Signal Classification</span>
                  <span
                    className="detail-val font-bold"
                    style={{ color: aiSignal.type === 'bullish' ? '#00ff88' : '#ff3366' }}
                  >
                    {aiSignal.type.toUpperCase()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-lbl">Model Confidence</span>
                  <span className="detail-val font-bold text-white">
                    {(aiSignal.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-lbl">Sentiment Score</span>
                  <span className="detail-val text-emerald-400 font-bold">
                    +{aiSignal.sentimentScore.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <p className="ai-message-text">{aiSignal.message}</p>
          </section>

          {/* 3. Watchlist Widget */}
          <section className="grid-widget">
            <div className="widget-header">
              <span className="widget-tag">PORTFOLIO</span>
              <h2 className="widget-title">Watchlist</h2>
            </div>
            <div className="watchlist-list">
              <div className="watchlist-item">
                <div className="item-info">
                  <span className="item-symbol">NXS</span>
                  <span className="item-name">Nexus Index</span>
                </div>
                <div className="item-price-group">
                  <span className="item-price">${livePrice.toFixed(2)}</span>
                  <span className="item-percent positive">+4.8%</span>
                </div>
              </div>
              <div className="watchlist-item">
                <div className="item-info">
                  <span className="item-symbol">APX</span>
                  <span className="item-name">Apex Core</span>
                </div>
                <div className="item-price-group">
                  <span className="item-price">$384.10</span>
                  <span className="item-percent negative">-1.2%</span>
                </div>
              </div>
              <div className="watchlist-item">
                <div className="item-info">
                  <span className="item-symbol">VTX</span>
                  <span className="item-name">Vertex Chip</span>
                </div>
                <div className="item-price-group">
                  <span className="item-price">$89.75</span>
                  <span className="item-percent positive">+0.4%</span>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Technical Indicators Widget */}
          <section className="grid-widget">
            <div className="widget-header">
              <span className="widget-tag">TECHNICAL STATISTICS</span>
              <h2 className="widget-title">Indicators</h2>
            </div>
            <div className="indicators-panel">
              <div className="indicator-metric">
                <div className="metric-header">
                  <span className="metric-name">Relative Strength Index (RSI)</span>
                  <span className="metric-value text-amber-400">{indicators.rsi}</span>
                </div>
                <div className="metric-bar-bg">
                  <div className="metric-bar-fill" style={{ width: `${indicators.rsi}%`, background: '#fbbf24' }} />
                </div>
                <span className="metric-desc">Neutral-Overbought threshold (70 overbought)</span>
              </div>

              <div className="indicator-metric">
                <div className="metric-header">
                  <span className="metric-name">MACD Histogram</span>
                  <span className="metric-value text-cyan-400">+0.50</span>
                </div>
                <div className="metric-bar-bg">
                  <div className="metric-bar-fill" style={{ width: '65%', background: '#00ffff' }} />
                </div>
                <span className="metric-desc">Bullish momentum crossover confirmed</span>
              </div>
            </div>
          </section>

          {/* 5. Sentiment News Widget */}
          <section className="grid-widget">
            <div className="widget-header">
              <span className="widget-tag">TEXT CORPUS SENTIMENT</span>
              <h2 className="widget-title">Recent Intelligence</h2>
            </div>
            <div className="dashboard-news-list">
              {news.slice(0, 3).map((article, i) => {
                let color = '#888899';
                if (article.sentiment === 'positive') color = '#00ff88';
                if (article.sentiment === 'negative') color = '#ff3366';

                return (
                  <div key={i} className="dashboard-news-item" style={{ borderLeftColor: color }}>
                    <div className="news-item-source" style={{ color }}>{article.source.toUpperCase()}</div>
                    <div className="news-item-title">{article.title}</div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      {/* Styled Dashboard Components Stylesheet (Vanilla CSS embedded or styled inside app styles) */}
      <style jsx global>{`
        .dashboard-root {
          display: flex;
          background: #030305;
          color: #ffffff;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
        }

        .dashboard-sidebar {
          width: 250px;
          border-right: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: rgba(10, 10, 15, 0.5);
          backdrop-filter: blur(20px);
        }

        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 2.5rem;
        }

        .sidebar-menu {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex-grow: 1;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 6px;
          color: #a0a0b0;
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .menu-item:hover, .menu-item.active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        .menu-item.active {
          border-left: 3px solid #00ff88;
          background: rgba(0, 255, 136, 0.04);
        }

        .menu-icon {
          width: 16px;
          height: 16px;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: transparent;
          color: #a0a0b0;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.75rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .back-btn:hover {
          color: #ffffff;
          border-color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        .sidebar-footer {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          margin-top: auto;
        }

        .dashboard-logout-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          background: rgba(255, 51, 102, 0.08);
          color: #ff6688;
          border: 1px solid rgba(255, 51, 102, 0.25);
          padding: 0.75rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.25s ease;
        }

        .dashboard-logout-btn:hover:not(:disabled) {
          background: rgba(255, 51, 102, 0.18);
          border-color: #ff3366;
          color: #ffffff;
        }

        .dashboard-logout-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .dashboard-content {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          padding: 2rem 2.5rem;
          overflow-y: auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .header-title {
          font-size: 1.75rem;
          font-weight: 800;
        }

        .header-subtitle {
          color: #a0a0b0;
          font-size: 0.85rem;
        }

        .user-profile {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .profile-badge {
          background: rgba(0, 255, 136, 0.1);
          color: #00ff88;
          border: 1px solid rgba(0, 255, 136, 0.2);
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.05rem;
        }

        .profile-pic {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #00ff88);
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.5rem;
        }

        .grid-widget {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 12px;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .col-span-2 {
          grid-column: span 2;
        }

        .widget-header {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          margin-bottom: 1.25rem;
        }

        .widget-tag {
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.1rem;
          color: #a0a0b0;
        }

        .widget-title {
          font-size: 1.25rem;
          font-weight: 700;
        }

        .ticker-values {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .ticker-price {
          font-size: 2.5rem;
          font-weight: 800;
          margin-right: 1rem;
        }

        .ticker-percent {
          font-size: 1rem;
          font-weight: 700;
        }

        .ticker-percent.positive { color: #00ff88; }

        .ticker-stat-group {
          display: flex;
          gap: 1.5rem;
        }

        .ticker-stat {
          display: flex;
          flex-direction: column;
        }

        .stat-lbl {
          font-size: 0.7rem;
          color: #a0a0b0;
        }

        .stat-val {
          font-weight: 600;
        }

        .sparklines-container {
          display: flex;
          align-items: flex-end;
          gap: 0.35rem;
          height: 80px;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.1);
          padding-bottom: 0.25rem;
        }

        .spark-bar {
          flex-grow: 1;
          border-radius: 2px;
          opacity: 0.8;
          transition: all 0.3s ease;
        }

        .spark-bar.bullish {
          background: #00ff88;
          box-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
        }

        .spark-bar.bearish {
          background: #ff3366;
          box-shadow: 0 0 8px rgba(255, 51, 102, 0.3);
        }

        .ai-stats-wrap {
          display: flex;
          align-items: center;
          gap: 2rem;
          margin-bottom: 1rem;
        }

        .ai-gauge {
          border: 3px solid rgba(255, 255, 255, 0.05);
          border-top-color: #ffd700;
          border-radius: 50%;
          width: 90px;
          height: 90px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .gauge-value {
          font-size: 1.4rem;
          font-weight: 800;
        }

        .gauge-label {
          font-size: 0.5rem;
          font-weight: 700;
          color: #a0a0b0;
        }

        .ai-details {
          flex-grow: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          padding-bottom: 0.25rem;
        }

        .detail-lbl {
          color: #a0a0b0;
        }

        .ai-message-text {
          font-size: 0.75rem;
          color: #a0a0b0;
          line-height: 1.4;
          background: rgba(255, 255, 255, 0.02);
          padding: 0.75rem;
          border-radius: 6px;
        }

        .watchlist-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .watchlist-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.04);
        }

        .item-symbol {
          font-weight: 700;
          display: block;
        }

        .item-name {
          font-size: 0.7rem;
          color: #a0a0b0;
        }

        .item-price-group {
          text-align: right;
        }

        .item-price {
          font-weight: 600;
          display: block;
        }

        .item-percent {
          font-size: 0.7rem;
          font-weight: 700;
        }

        .item-percent.positive { color: #00ff88; }
        .item-percent.negative { color: #ff3366; }

        .indicator-metric {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1.25rem;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .metric-bar-bg {
          height: 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          overflow: hidden;
        }

        .metric-bar-fill {
          height: 100%;
          border-radius: 3px;
        }

        .metric-desc {
          font-size: 0.65rem;
          color: #a0a0b0;
        }

        .dashboard-news-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .dashboard-news-item {
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.01);
          border-left: 3px solid transparent;
          border-radius: 0 6px 6px 0;
        }

        .news-item-source {
          font-size: 0.6rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
        }

        .news-item-title {
          font-size: 0.8rem;
          font-weight: 600;
          line-height: 1.3;
        }

        @media (max-width: 1024px) {
          .dashboard-grid {
            grid-template-columns: 1fr;
          }
          .col-span-2 {
            grid-column: span 1;
          }
        }
      `}</style>
    </div>
  );
}
