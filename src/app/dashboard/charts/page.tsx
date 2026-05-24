'use client';

import { useEffect } from 'react';
import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';
import GlassCard from '../../../components/dashboard/GlassCard';
import { useMarketStore } from '../../../store/useMarketStore';

export default function ChartsPage() {
  const { candles, indicators, fetchData } = useMarketStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <PageTransition>
      <PageHeader
        tag="Technical"
        title="Charts & Indicators"
        subtitle="Candlestick data with RSI, MACD, and EMA ribbons."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <GlassCard accent="neutral" className="lg:col-span-2">
          <p className="mb-4 text-sm font-semibold text-white">Candlestick snapshot</p>
          <div className="flex h-48 items-end gap-1">
            {candles.slice(-24).map((c, i) => (
              <div
                key={i}
                className={`flex-1 rounded-t ${c.isBullish ? 'bg-emerald-500/70' : 'bg-rose-500/70'}`}
                style={{
                  height: `${20 + ((c.close - c.low) / (c.high - c.low || 1)) * 80}%`,
                }}
              />
            ))}
          </div>
        </GlassCard>

        <GlassCard accent="bullish">
          <p className="text-xs text-slate-500">RSI (14)</p>
          <p className="mt-1 text-2xl font-bold text-emerald-400">{indicators.rsi.toFixed(1)}</p>
          <p className="mt-2 text-xs text-slate-500">
            {indicators.rsi > 70 ? 'Overbought zone' : indicators.rsi < 30 ? 'Oversold zone' : 'Neutral momentum'}
          </p>
        </GlassCard>

        <GlassCard accent="neutral">
          <p className="text-xs text-slate-500">MACD</p>
          <p className="mt-1 text-lg font-bold text-cyan-400">
            {indicators.macd.macdLine.at(-1)?.toFixed(2)} / {indicators.macd.signalLine.at(-1)?.toFixed(2)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Histogram {indicators.macd.histogram.at(-1)?.toFixed(2)}
          </p>
        </GlassCard>

        <GlassCard accent="neutral" className="lg:col-span-2">
          <p className="text-sm font-semibold text-white">EMA ribbon</p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <span className="text-emerald-400">EMA 9: {indicators.ema.ema9.at(-1)?.toFixed(2)}</span>
            <span className="text-cyan-400">EMA 21: {indicators.ema.ema21.at(-1)?.toFixed(2)}</span>
          </div>
        </GlassCard>
      </div>
    </PageTransition>
  );
}
