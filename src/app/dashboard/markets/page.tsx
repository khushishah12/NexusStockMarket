'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, RefreshCw, TrendingUp } from 'lucide-react';
import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';
import GlassCard from '../../../components/dashboard/GlassCard';

interface StockData {
  symbol: string;
  exchange: string;
  sector: string;
  price: number;
  volume: number;
}

function ShimmerRow() {
  return (
    <tr className="border-t border-white/5">
      {[1, 2, 3, 4, 5].map((i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
        </td>
      ))}
    </tr>
  );
}

function formatVolume(v: number): string {
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  return v.toLocaleString();
}

export default function MarketsPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<StockData | null>(null);
  const [exchange, setExchange] = useState<'ALL' | 'NSE' | 'BSE'>('ALL');
  const [sector, setSector] = useState('ALL');

  const fetchStocks = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/stocks/live');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: StockData[] = await res.json();
      setStocks(data);
    } catch {
      setError('Failed to fetch live data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStocks();
    const interval = setInterval(fetchStocks, 10_000);
    return () => clearInterval(interval);
  }, [fetchStocks]);

  const sectors = [...new Set(stocks.map((s) => s.sector))].sort();

  const filtered = stocks.filter((s) => {
    if (exchange !== 'ALL' && s.exchange !== exchange) return false;
    if (sector !== 'ALL' && s.sector !== sector) return false;
    return true;
  });

  const shimmerRows = 6;

  return (
    <PageTransition>
      <PageHeader
        tag="Markets"
        title="NSE / BSE Stocks"
        subtitle="Live prices from Yahoo Finance — auto-refreshes every 10 seconds."
      />

      <GlassCard className="mb-6" accent="bullish">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Exchange
              <select
                value={exchange}
                onChange={(e) => setExchange(e.target.value as typeof exchange)}
                className="rounded border border-white/10 bg-black/40 px-3 py-1.5 text-white"
              >
                <option value="ALL">All</option>
                <option value="NSE">NSE</option>
                <option value="BSE">BSE</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-400">
              Sector
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="rounded border border-white/10 bg-black/40 px-3 py-1.5 text-white"
              >
                <option value="ALL">All</option>
                {sectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
          </div>
          <button
            onClick={fetchStocks}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-400 transition hover:bg-cyan-500/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </GlassCard>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Exchange</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Volume</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: shimmerRows }).map((_, i) => <ShimmerRow key={i} />)
              : filtered.map((row) => (
                  <tr
                    key={row.symbol}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer border-t border-white/5 transition hover:bg-white/[0.04]"
                  >
                    <td className="px-4 py-3 font-semibold text-white">{row.symbol}</td>
                    <td className="px-4 py-3 text-cyan-400">{row.exchange}</td>
                    <td className="px-4 py-3 text-slate-400">{row.sector}</td>
                    <td className="px-4 py-3 font-medium text-emerald-400">
                      ₹{row.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{row.volume ? formatVolume(row.volume) : '-'}</td>
                  </tr>
                ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-500">No stocks match the selected filters.</p>
        )}
        {error && (
          <p className="py-4 text-center text-sm text-rose-400">{error}</p>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">{selected.symbol}</h2>
              <button
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Exchange</span>
                <span className="font-medium text-cyan-400">{selected.exchange}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Sector</span>
                <span className="text-white">{selected.sector}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Price</span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                  ₹{selected.price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-400">Volume</span>
                <span className="text-white">{selected.volume ? formatVolume(selected.volume) : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
