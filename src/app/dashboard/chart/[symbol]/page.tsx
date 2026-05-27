'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Loader2, BarChart3, DollarSign, Activity, Globe, Briefcase, Layers } from 'lucide-react';
import PageTransition from '../../../../components/dashboard/PageTransition';
import GlassCard from '../../../../components/dashboard/GlassCard';

interface ChartData {
  timeframe: string;
  chartUrl: string | null;
}

interface StockDetail {
  symbol: string;
  short_symbol: string;
  exchange: string;
  company_name: string;
  sector: string;
  industry: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  volume: number | null;
  market_cap: number | null;
  day_high: number | null;
  day_low: number | null;
  fifty_two_week_high: number | null;
  fifty_two_week_low: number | null;
  description: string | null;
  charts: ChartData[];
}

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'] as const;

function formatLargeNumber(n: number | null): string {
  if (n == null) return '—';
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `₹${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString()}`;
}

function formatVolume(v: number | null): string {
  if (v == null) return '—';
  if (v >= 1e7) return `${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(2)}L`;
  return v.toLocaleString();
}

export default function ChartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params?.symbol as string;

  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTf, setActiveTf] = useState('1D');

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/detail`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setDetail(data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [symbol]);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-sm text-slate-400">Loading {symbol}...</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (error || !detail) {
    return (
      <PageTransition>
        <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-rose-400">{error || 'Stock not found'}</p>
          <button onClick={() => router.back()} className="text-sm text-cyan-400 hover:underline">Go back</button>
        </div>
      </PageTransition>
    );
  }

  const activeChart = detail.charts.find((c) => c.timeframe === activeTf);

  return (
    <PageTransition>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{detail.short_symbol}</h1>
            <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-400">{detail.exchange}</span>
            <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-400">{detail.sector}</span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{detail.company_name}</p>
        </div>
        <div className="text-right">
          {detail.price != null && (
            <p className="text-3xl font-bold text-white">
              ₹{detail.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          )}
          {detail.change_percent != null && (
            <p className={`flex items-center justify-end gap-1 text-sm font-medium ${
              detail.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              <TrendingUp className={`h-4 w-4 ${detail.change_percent < 0 ? 'rotate-180' : ''}`} />
              {detail.change != null && `${detail.change >= 0 ? '+' : ''}${detail.change.toFixed(2)} `}
              ({detail.change_percent >= 0 ? '+' : ''}{detail.change_percent.toFixed(2)}%)
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => setActiveTf(tf)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTf === tf
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      <GlassCard accent="neutral" className="mb-6">
        <div className="flex items-center justify-center rounded-lg bg-slate-950/50 min-h-[300px]">
          {activeChart?.chartUrl ? (
            <img src={activeChart.chartUrl} alt={`${detail.short_symbol} ${activeTf} chart`} className="w-full rounded-lg" />
          ) : (
            <p className="text-sm text-slate-500">Chart not available for {activeTf}</p>
          )}
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassCard accent="bullish">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            Volume
          </div>
          <p className="mt-1 text-base font-semibold text-white">{formatVolume(detail.volume)}</p>
        </GlassCard>

        <GlassCard accent="neutral">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <BarChart3 className="h-3.5 w-3.5 text-cyan-400" />
            Market Cap
          </div>
          <p className="mt-1 text-base font-semibold text-white">{formatLargeNumber(detail.market_cap)}</p>
        </GlassCard>

        <GlassCard accent="neutral">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            Day Range
          </div>
          <p className="mt-1 text-base font-semibold text-white">
            {detail.day_low != null ? `₹${detail.day_low.toFixed(2)}` : '—'} — {detail.day_high != null ? `₹${detail.day_high.toFixed(2)}` : '—'}
          </p>
        </GlassCard>

        <GlassCard accent="bearish">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Layers className="h-3.5 w-3.5 text-rose-400" />
            52W Range
          </div>
          <p className="mt-1 text-base font-semibold text-white">
            {detail.fifty_two_week_low != null ? `₹${detail.fifty_two_week_low.toFixed(2)}` : '—'} — {detail.fifty_two_week_high != null ? `₹${detail.fifty_two_week_high.toFixed(2)}` : '—'}
          </p>
        </GlassCard>
      </div>

      {detail.description && (
        <GlassCard accent="neutral" className="mt-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Globe className="h-3.5 w-3.5 text-cyan-400" />
            About
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{detail.description}</p>
        </GlassCard>
      )}
    </PageTransition>
  );
}
