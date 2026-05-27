'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, TrendingUp, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';
import GlassCard from '../../../components/dashboard/GlassCard';

interface SearchResult {
  symbol: string;
  short_symbol: string;
  exchange: string;
  company_name: string;
  sector: string;
  price: number | null;
  change_percent: number | null;
  volume: number | null;
}

export default function ChartsPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setSelectedIdx(-1);
      }
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const navigateTo = (symbol: string) => {
    setResults([]);
    setQuery('');
    router.push(`/dashboard/chart/${symbol}`);
  };

  const handleInput = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 150);
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((p) => Math.min(p + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((p) => Math.max(p - 1, -1)); }
    if (e.key === 'Enter' && selectedIdx >= 0 && results[selectedIdx]) { navigateTo(results[selectedIdx].symbol); }
    if (e.key === 'Escape') { setResults([]); setQuery(''); inputRef.current?.blur(); }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setResults([]);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <PageTransition>
      <PageHeader
        tag="Charts"
        title="Stock Analysis"
        subtitle="Search any NSE / BSE stock to view price charts, fundamentals, technical patterns, and more."
      />

      <div className="mx-auto mb-8 max-w-2xl" ref={containerRef}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Search stocks, e.g. TCS, RELIANCE, INFY..."
            className="w-full rounded-xl border border-white/10 bg-black/40 py-4 pl-12 pr-4 text-base text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-400" />
          )}

          {query.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-slate-900 shadow-2xl">
              {!loading && results.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">No stocks found for &quot;{query}&quot;</p>
              )}
              {results.map((r, i) => (
                <button
                  key={r.symbol}
                  onClick={() => navigateTo(r.symbol)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    i === selectedIdx ? 'bg-cyan-500/10' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30">
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold text-white">{r.short_symbol}</span>
                      <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">{r.exchange}</span>
                    </div>
                    <p className="truncate text-xs text-slate-400">{r.company_name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {r.price != null && (
                      <p className="text-sm font-semibold text-white">₹{r.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    )}
                    {r.change_percent != null && (
                      <p className={`flex items-center justify-end gap-0.5 text-xs font-medium ${r.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {r.change_percent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(r.change_percent).toFixed(2)}%
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {query.length === 0 && !loading && (
        <div className="grid gap-5 lg:grid-cols-3">
          <GlassCard accent="bullish" className="text-center">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 text-emerald-400" />
            <p className="text-sm font-semibold text-white">Price Charts</p>
            <p className="mt-1 text-xs text-slate-400">Interactive QuickChart with 7 timeframes (1D to MAX)</p>
          </GlassCard>
          <GlassCard accent="neutral" className="text-center">
            <Search className="mx-auto mb-3 h-8 w-8 text-cyan-400" />
            <p className="text-sm font-semibold text-white">Fundamentals</p>
            <p className="mt-1 text-xs text-slate-400">P/E, EPS, Market Cap, Beta, Dividend yield, and more</p>
          </GlassCard>
          <GlassCard accent="bearish" className="text-center">
            <TrendingUp className="mx-auto mb-3 h-8 w-8 text-rose-400" />
            <p className="text-sm font-semibold text-white">Pattern Detection</p>
            <p className="mt-1 text-xs text-slate-400">30+ chart patterns detected mathematically in real-time</p>
          </GlassCard>
        </div>
      )}
    </PageTransition>
  );
}
