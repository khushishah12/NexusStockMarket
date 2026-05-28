'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, ArrowUpRight, ArrowDownRight, Loader2, Globe,
  Maximize, Sigma, Minus, Crosshair as CrosshairIcon,
  Lock, Unlock,
} from 'lucide-react';
import CandlestickChart from '@/components/dashboard/CandlestickChart';
import type { OHLCVPoint, PatternInfo, TrendLine } from '@/components/dashboard/CandlestickChart';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SearchResult {
  symbol: string;
  short_symbol: string;
  exchange: string;
  company_name: string;
  price: number | null;
  change_percent: number | null;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'] as const;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChartsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [ohlcv, setOhlcv] = useState<OHLCVPoint[]>([]);
  const [patterns, setPatterns] = useState<PatternInfo[]>([]);
  const [timeframe, setTimeframe] = useState('1M');
  const [chartLoading, setChartLoading] = useState(false);
  const [searchVisible, setSearchVisible] = useState(true);
  const [focused, setFocused] = useState(false);

  const [scaleMode, setScaleMode] = useState<'linear' | 'log'>('linear');
  const [trendLineMode, setTrendLineMode] = useState(false);
  const [verticalLock, setVerticalLock] = useState(false);
  const [crosshairEnabled, setCrosshairEnabled] = useState(true);
  const [trendLines, setTrendLines] = useState<TrendLine[]>([]);

  const autoScaleKey = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---- Debounced search via API ---- */
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

  /* ---- Keyboard nav ---- */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && results[selectedIndex]) {
      selectStock(results[selectedIndex].symbol);
    } else if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      inputRef.current?.blur();
    }
  };

  /* ---- Initial peek ---- */
  useEffect(() => {
    const t = setTimeout(() => setSearchVisible(false), 2500);
    return () => clearTimeout(t);
  }, []);

  /* ---- Auto-show / hide ---- */
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (e.clientY < 80) {
        setSearchVisible(true);
      } else if (!focused && query.length === 0) {
        hideTimer.current = setTimeout(() => setSearchVisible(false), 600);
      }
    }
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [focused, query]);

  /* ---- Fetch OHLCV + patterns on select ---- */
  useEffect(() => {
    if (!selectedSymbol) return;
    setChartLoading(true);
    setOhlcv([]);
    setPatterns([]);
    setTrendLines([]);
    autoScaleKey.current = 0;

    Promise.all([
      fetch(`/api/stocks/${encodeURIComponent(selectedSymbol)}/ohlcv?timeframe=${timeframe}`).then((r) => r.json()),
      fetch(`/api/stocks/${encodeURIComponent(selectedSymbol)}/patterns?timeframe=${timeframe}`).then((r) => r.json()),
    ])
      .then(([o, p]) => {
        if (o.ohlcv) setOhlcv(o.ohlcv);
        if (p.patterns) setPatterns(p.patterns);
      })
      .catch(() => {})
      .finally(() => setChartLoading(false));
  }, [selectedSymbol, timeframe]);

  const selectStock = useCallback((sym: string) => {
    setSelectedSymbol(sym);
    setQuery('');
    setResults([]);
    setSearchVisible(false);
  }, []);

  return (
    <div className="relative flex h-screen flex-col overflow-auto bg-[#0b1120] select-none">
      {/* ── Floating search bar ── */}
      <div
        className="absolute left-0 right-0 top-0 z-50 transition-all duration-300 ease-in-out"
        style={{
          transform: searchVisible ? 'translateY(0)' : 'translateY(-100%)',
          opacity: searchVisible ? 1 : 0,
        }}
        onMouseEnter={() => {
          if (hideTimer.current) clearTimeout(hideTimer.current);
          setSearchVisible(true);
        }}
      >
        <div className="mx-auto max-w-xl px-4 pb-2 pt-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setFocused(true)}
              onBlur={() => { setFocused(false); if (query.length === 0) setResults([]); }}
              placeholder="Search stocks, e.g. TCS, RELIANCE, INFY..."
              className="w-full rounded-xl border border-white/10 bg-black/40 py-3 pl-12 pr-10 text-base text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
              autoFocus
            />
            {loading && (
              <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-cyan-400" />
            )}
          </div>

          {query.length > 0 && results.length === 0 && !loading && (
            <p className="py-6 text-center text-sm text-slate-500">No stocks found for &quot;{query}&quot;</p>
          )}

          {results.length > 0 && (
            <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-xl border border-white/10 bg-[#1a2332] shadow-xl">
              {results.map((item, i) => (
                <li
                  key={item.symbol}
                  onClick={() => selectStock(item.symbol)}
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
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Toolbar + Timeframe bar */}
        {selectedSymbol && (
          <div className="flex flex-wrap items-center gap-2 border-b border-white/5 px-4 py-2">
            {/* Symbol */}
            <span className="mr-2 text-sm font-bold text-white">{selectedSymbol}</span>

            {/* Timeframes */}
            <div className="flex flex-wrap gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    timeframe === tf
                      ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                      : 'border border-transparent text-slate-500 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>

            {/* Spacer */}
            <div className="ml-auto flex items-center gap-1">
              {/* Auto-scale */}
              <button
                onClick={() => autoScaleKey.current++}
                title="Auto-scale (A)"
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
              >
                <Maximize className="h-3.5 w-3.5" />
              </button>

              {/* Log/Linear */}
              <button
                onClick={() => setScaleMode(s => s === 'linear' ? 'log' : 'linear')}
                title={`Toggle ${scaleMode === 'linear' ? 'log' : 'linear'} scale`}
                className={`rounded-lg p-1.5 transition ${
                  scaleMode === 'log' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Sigma className="h-3.5 w-3.5" />
              </button>

              {/* Crosshair */}
              <button
                onClick={() => setCrosshairEnabled(c => !c)}
                title="Toggle crosshair"
                className={`rounded-lg p-1.5 transition ${
                  crosshairEnabled ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <CrosshairIcon className="h-3.5 w-3.5" />
              </button>

              {/* Vertical lock */}
              <button
                onClick={() => setVerticalLock(v => !v)}
                title="Toggle vertical lock (V)"
                className={`rounded-lg p-1.5 transition ${
                  verticalLock ? 'bg-purple-500/20 text-purple-400' : 'text-slate-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                {verticalLock ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              </button>

              {/* Trend line */}
              <button
                onClick={() => setTrendLineMode(t => !t)}
                title="Trend line mode (T)"
                className={`rounded-lg p-1.5 transition ${
                  trendLineMode ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/40' : 'text-slate-500 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Chart area */}
        <div className="relative flex-1">
          {chartLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#0b1120]/80">
              <Loader2 className="h-7 w-7 animate-spin text-cyan-400" />
            </div>
          )}

          {selectedSymbol && !chartLoading && (
            <CandlestickChart
              key={selectedSymbol + timeframe + autoScaleKey.current}
              data={ohlcv}
              patterns={patterns}
              symbol={selectedSymbol}
              timeframe={timeframe}
              className="h-full w-full"
              liveInterval={timeframe === '1D' ? 30 : 60}
              scaleMode={scaleMode}
              trendLines={trendLines}
              onTrendLinesChange={setTrendLines}
              crosshairEnabled={crosshairEnabled}
            />
          )}

          {!selectedSymbol && !chartLoading && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-slate-600">Search a stock to begin chart analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
