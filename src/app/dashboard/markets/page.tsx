'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, ArrowUpRight, ArrowDownRight, TrendingUp, Loader2,
  BarChart3, Globe,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';
import GlassCard from '../../../components/dashboard/GlassCard';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MarketsPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data);
      setSelectedIndex(-1);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      router.push(`/dashboard/chart/${results[selectedIndex].symbol}`);
    } else if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      inputRef.current?.blur();
    }
  };

  const handleSelect = (symbol: string) => {
    router.push(`/dashboard/chart/${symbol}`);
  };

  return (
    <PageTransition>
      <PageHeader
        tag="Markets"
        title="Stock Screener"
        subtitle="Screen NSE &amp; BSE stocks by name, sector, or symbol. Click through to full analysis."
      />

      <GlassCard accent="neutral" className="mx-auto mb-6 max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search stocks, e.g. TCS, RELIANCE, INFY..."
            className="w-full rounded-xl border border-white/10 bg-black/40 py-4 pl-12 pr-4 text-base text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
          />
          {loading && (
            <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-400" />
          )}
        </div>

        <div className="mt-2 min-h-[60px]">
          {query.length > 0 && results.length === 0 && !loading && (
            <p className="py-8 text-center text-sm text-slate-500">No stocks found for &quot;{query}&quot;</p>
          )}

          {results.length > 0 && (
            <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
              {results.map((item, i) => (
                <li
                  key={item.symbol}
                  onClick={() => handleSelect(item.symbol)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition-all duration-150 ${
                    i === selectedIndex
                      ? 'border border-cyan-500/20 bg-cyan-500/10'
                      : 'border border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/30">
                    <Globe className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-bold text-white">{item.short_symbol}</span>
                      <span className="shrink-0 rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">
                        {item.exchange}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-400">{item.company_name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    {item.price != null && (
                      <p className="text-sm font-semibold text-white">
                        ₹{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                    {item.change_percent != null && (
                      <p className={`flex items-center justify-end gap-0.5 text-xs font-medium ${
                        item.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {item.change_percent >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {Math.abs(item.change_percent).toFixed(2)}%
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {query.length === 0 && (
            <div className="py-10 text-center">
              <BarChart3 className="mx-auto mb-3 h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-500">Discover NSE &amp; BSE stocks by symbol or company name</p>
            </div>
          )}
        </div>
      </GlassCard>
    </PageTransition>
  );
}
