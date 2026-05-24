'use client';

import { useEffect } from 'react';
import PageTransition from '../../components/dashboard/PageTransition';
import PageHeader from '../../components/dashboard/PageHeader';
import GlassCard from '../../components/dashboard/GlassCard';
import { useMarketStore } from '../../store/useMarketStore';
import { TrendingUp, TrendingDown, Brain } from 'lucide-react';

export default function DashboardHomePage() {
  const { candles, aiSignal, livePrice, fetchData } = useMarketStore();

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15000);
    return () => clearInterval(id);
  }, [fetchData]);

  const change = candles.length >= 2
    ? ((livePrice - candles[candles.length - 2].close) / candles[candles.length - 2].close) * 100
    : 0;
  const isUp = change >= 0;

  return (
    <PageTransition>
      <PageHeader
        tag="Terminal Home"
        title="Dashboard"
        subtitle="Overview of markets, live indices snapshot, and AI-generated summary."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <GlassCard accent="bullish" className="md:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Live index</p>
          <p className="mt-2 text-4xl font-bold text-white">${livePrice.toFixed(2)}</p>
          <p className={`mt-2 flex items-center gap-1 text-sm font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {isUp ? '+' : ''}
            {change.toFixed(2)}% today
          </p>
        </GlassCard>

        <GlassCard accent="neutral">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-400">
            <Brain size={14} /> AI summary
          </p>
          <p className="mt-3 text-sm leading-relaxed text-slate-300">{aiSignal.message}</p>
          <p className="mt-4 text-xs text-slate-500">
            Confidence {(aiSignal.confidence * 100).toFixed(0)}% · Sentiment {aiSignal.sentimentScore.toFixed(2)}
          </p>
        </GlassCard>

        {[
          { label: 'NIFTY 50', value: '24,850', ch: '+0.42%', up: true },
          { label: 'SENSEX', value: '81,420', ch: '+0.38%', up: true },
          { label: 'BANK NIFTY', value: '52,110', ch: '-0.15%', up: false },
        ].map((idx) => (
          <GlassCard key={idx.label} accent={idx.up ? 'bullish' : 'bearish'}>
            <p className="text-xs text-slate-500">{idx.label}</p>
            <p className="mt-1 text-xl font-bold">{idx.value}</p>
            <p className={`mt-1 text-sm font-semibold ${idx.up ? 'text-emerald-400' : 'text-rose-400'}`}>
              {idx.ch}
            </p>
          </GlassCard>
        ))}
      </div>
    </PageTransition>
  );
}
