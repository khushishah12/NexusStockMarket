'use client';

import { useEffect } from 'react';
import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';
import GlassCard from '../../../components/dashboard/GlassCard';
import { useMarketStore } from '../../../store/useMarketStore';

const sentimentColor = {
  positive: 'border-emerald-500/40 text-emerald-400',
  negative: 'border-rose-500/40 text-rose-400',
  neutral: 'border-slate-500/40 text-slate-400',
};

export default function NewsPage() {
  const { news, aiSignal, fetchData } = useMarketStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const score = aiSignal.sentimentScore;
  const label = score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral';

  return (
    <PageTransition>
      <PageHeader
        tag="Sentiment"
        title="News & Sentiment"
        subtitle="Market news feed with AI sentiment scoring and summary."
      />

      <GlassCard className="mb-6" accent="neutral">
        <p className="text-sm font-semibold text-white">AI-generated summary</p>
        <p className="mt-2 text-slate-400">{aiSignal.message}</p>
        <p className={`mt-4 inline-block rounded-full border px-3 py-1 text-xs font-bold uppercase ${sentimentColor[label]}`}>
          Sentiment: {label} ({score.toFixed(2)})
        </p>
      </GlassCard>

      <div className="grid gap-4 md:grid-cols-2">
        {news.map((item, i) => (
          <GlassCard
            key={`${item.source}-${i}`}
            accent={item.sentiment === 'positive' ? 'bullish' : item.sentiment === 'negative' ? 'bearish' : 'neutral'}
          >
            <p className="text-xs font-bold text-cyan-400">{item.source}</p>
            <p className="mt-2 font-semibold text-white">{item.title}</p>
            <p className={`mt-3 text-xs uppercase ${sentimentColor[item.sentiment]}`}>{item.sentiment}</p>
          </GlassCard>
        ))}
      </div>
    </PageTransition>
  );
}
