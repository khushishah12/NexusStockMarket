'use client';

import { useEffect } from 'react';
import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';
import GlassCard from '../../../components/dashboard/GlassCard';
import { useMarketStore } from '../../../store/useMarketStore';

export default function PredictionsPage() {
  const { aiSignal, fetchData } = useMarketStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const isBull = aiSignal.type === 'bullish';

  return (
    <PageTransition>
      <PageHeader
        tag="AI Engine"
        title="AI Predictions"
        subtitle="Buy/sell probability, trend forecasting, and model confidence."
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard accent={isBull ? 'bullish' : 'bearish'}>
          <p className="text-xs uppercase tracking-wider text-slate-500">Signal</p>
          <p className={`mt-2 text-3xl font-bold ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
            {aiSignal.type.toUpperCase()}
          </p>
        </GlassCard>
        <GlassCard accent="bullish">
          <p className="text-xs uppercase tracking-wider text-slate-500">Buy probability</p>
          <p className="mt-2 text-3xl font-bold text-emerald-400">{aiSignal.buyProbability}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
              style={{ width: `${aiSignal.buyProbability}%` }}
            />
          </div>
        </GlassCard>
        <GlassCard accent="neutral">
          <p className="text-xs uppercase tracking-wider text-slate-500">Confidence</p>
          <p className="mt-2 text-3xl font-bold text-cyan-400">
            {(aiSignal.confidence * 100).toFixed(0)}%
          </p>
        </GlassCard>
      </div>

      <GlassCard className="mt-5" accent="neutral">
        <p className="text-sm font-semibold text-white">Trend forecast</p>
        <p className="mt-2 text-slate-400">{aiSignal.message}</p>
      </GlassCard>
    </PageTransition>
  );
}
