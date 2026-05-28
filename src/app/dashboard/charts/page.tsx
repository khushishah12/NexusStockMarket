'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, ArrowUpRight, ArrowDownRight, TrendingUp, Loader2,
  Clock, ShieldAlert, BarChart3,
} from 'lucide-react';
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

interface ChartItem {
  timeframe: string;
  chartUrl: string | null;
}

interface DetailData {
  symbol: string;
  short_symbol: string;
  exchange: string;
  company_name: string;
  sector: string;
  price: number | null;
  change: number | null;
  change_percent: number | null;
  market_status: string;
  charts: ChartItem[];
}

interface PatternData {
  pattern_name: string;
  category: string;
  confidence_percent: number;
  detected_on_timeframe: string;
  pattern_region: { start_index: number; end_index: number };
  anchor_points: { p1: number; p2: number; p3: number; p4: number };
  highlight_polygon: [number, number][];
  explanation: string;
  theoretical_target_price: number | null;
  risk_level: string;
  stoploss: number | null;
  suitable_for_intraday: boolean;
  suitable_for_swing: boolean;
}

interface TimeframeData {
  timestamps: string[];
  close: number[];
}

interface PatternsResponse {
  symbol: string;
  patterns: PatternData[];
  timeframe_data: Record<string, TimeframeData>;
}

/* ------------------------------------------------------------------ */
/*  Constants & Helpers                                                */
/* ------------------------------------------------------------------ */

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'] as const;

function fmtCurrency(n: number | null): string {
  if (n == null) return '—';
  if (Math.abs(n) >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `₹${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toFixed(2)}`;
}

function fmtPct(n: number | null, digits = 2): string {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChartsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTf, setActiveTf] = useState('1D');
  const [showOverlay, setShowOverlay] = useState(false);

  const [patternsData, setPatternsData] = useState<PatternsResponse | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [overlayLoading, setOverlayLoading] = useState(false);

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

  const selectStock = useCallback(async (symbol: string) => {
    setQuery('');
    setResults([]);
    setSelectedSymbol(symbol);
    setActiveTf('1D');
    setShowOverlay(false);

    setDetailLoading(true);
    setPatternsLoading(true);
    try {
      const [detailRes, patternsRes] = await Promise.all([
        fetch(`/api/stocks/${encodeURIComponent(symbol)}/detail`),
        fetch(`/api/stocks/${encodeURIComponent(symbol)}/patterns`),
      ]);
      if (detailRes.ok) {
        const d = await detailRes.json();
        setDetail(d);
      }
      if (patternsRes.ok) {
        const p = await patternsRes.json();
        setPatternsData(p);
      }
    } catch { /* ignore */ }
    setDetailLoading(false);
    setPatternsLoading(false);
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
      selectStock(results[selectedIndex].symbol);
    } else if (e.key === 'Escape') {
      setQuery('');
      setResults([]);
      inputRef.current?.blur();
    }
  };

  /* ---- Fetch overlay chart from visualize API ---- */
  useEffect(() => {
    if (!showOverlay || !selectedSymbol) { setOverlayUrl(null); return; }
    setOverlayLoading(true);
    const tfPatterns = patternsData?.patterns.filter((p) => p.detected_on_timeframe === activeTf) || [];
    const body: any = { timeframe: activeTf };
    if (tfPatterns.length > 0) body.patterns = tfPatterns;
    fetch(`/api/stocks/${encodeURIComponent(selectedSymbol)}/visualize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => r.json())
      .then((data) => { if (data.chart_url) setOverlayUrl(data.chart_url); })
      .catch(() => {})
      .finally(() => setOverlayLoading(false));
  }, [showOverlay, selectedSymbol, activeTf, patternsData]);

  const activeChart = detail?.charts.find((c) => c.timeframe === activeTf);

  return (
    <PageTransition>
      <PageHeader
        tag="Charts"
        title="Chart Analysis"
        subtitle="Candlesticks, technical indicators &amp; chart pattern detection for NSE / BSE stocks."
      />

      {/* Search Card */}
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
            <ul className="mt-3 max-h-[420px] space-y-1 overflow-y-auto">
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
                    <TrendingUp className="h-4 w-4 text-cyan-400" />
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

          {query.length === 0 && !selectedSymbol && (
            <div className="py-10 text-center">
              <BarChart3 className="mx-auto mb-3 h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-500">Search a stock to view charts and technical patterns</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  INLINE CHART ANALYSIS (when selected)                        */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {selectedSymbol && detailLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        </div>
      )}

      {selectedSymbol && !detailLoading && detail && (
        <>
          {/* Header */}
          <GlassCard accent="neutral" className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white">{detail.short_symbol}</h1>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-400">{detail.exchange}</span>
                  <span className="rounded bg-white/5 px-2 py-0.5 text-xs text-slate-400">{detail.sector}</span>
                  <span className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${
                    detail.market_status === 'OPEN'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    <Clock className="h-3 w-3" />
                    {detail.market_status}
                  </span>
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
                    ({fmtPct(detail.change_percent)})
                  </p>
                )}
              </div>
            </div>
          </GlassCard>

          {/* CHART SECTION */}
          <div className="mb-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1.5">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => { setActiveTf(tf); setShowOverlay(false); }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      activeTf === tf && !showOverlay
                        ? 'border border-cyan-500/40 bg-cyan-500/20 text-cyan-300'
                        : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>

              {patternsData && (() => {
                const tfPatterns = patternsData.patterns.filter((p) => p.detected_on_timeframe === activeTf);
                return tfPatterns.length > 0;
              })() && (
                <button
                  onClick={() => setShowOverlay(!showOverlay)}
                  className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    showOverlay
                      ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                      : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  {showOverlay
                    ? `Hide Overlays`
                    : `Pattern Overlay (${patternsData.patterns.filter((p) => p.detected_on_timeframe === activeTf).length})`
                  }
                </button>
              )}
            </div>

            <GlassCard accent="neutral">
              <div className="flex min-h-[420px] items-center justify-center rounded-lg bg-slate-950/50 p-4">
                {(patternsLoading || overlayLoading) && (
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                )}
                {!patternsLoading && !overlayLoading && showOverlay && overlayUrl && (
                  <img
                    src={overlayUrl}
                    alt={`${detail.short_symbol} ${activeTf} with pattern overlays`}
                    className="max-h-[500px] w-full rounded-lg object-contain"
                  />
                )}
                {!patternsLoading && !overlayLoading && (!showOverlay || !overlayUrl) && activeChart?.chartUrl && (
                  <img
                    src={activeChart.chartUrl}
                    alt={`${detail.short_symbol} ${activeTf} chart`}
                    className="max-h-[500px] w-full rounded-lg object-contain"
                  />
                )}
                {!patternsLoading && !overlayLoading && (!activeChart?.chartUrl && !overlayUrl) && (
                  <p className="text-sm text-slate-500">Chart not available for {activeTf}</p>
                )}
              </div>
            </GlassCard>
          </div>

          {/* PATTERN DETECTIONS TABLE */}
          {patternsData && patternsData.patterns.length > 0 && (
            <GlassCard accent="neutral" className="mb-4 overflow-x-auto">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                <ShieldAlert className="h-3.5 w-3.5" />
                Chart Pattern Detections
                <span className="ml-1 text-slate-500">({patternsData.patterns.length} found)</span>
              </div>

              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
                    <th className="py-2 pr-3 font-medium">Pattern</th>
                    <th className="py-2 pr-3 font-medium">Category</th>
                    <th className="py-2 pr-3 font-medium">TF</th>
                    <th className="py-2 pr-3 font-medium">Confidence</th>
                    <th className="py-2 pr-3 font-medium">Risk</th>
                    <th className="py-2 pr-3 font-medium">Target</th>
                    <th className="py-2 pr-3 font-medium">Stop</th>
                    <th className="py-2 font-medium">Suitability</th>
                  </tr>
                </thead>
                <tbody>
                  {patternsData.patterns.map((p, i) => (
                    <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-2.5 pr-3 font-semibold text-white">{p.pattern_name}</td>
                      <td className="py-2.5 pr-3 text-xs text-slate-400">{p.category}</td>
                      <td className="py-2.5 pr-3 text-xs text-slate-500">{p.detected_on_timeframe}</td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                            <div
                              className={`h-full rounded-full ${
                                p.confidence_percent >= 70
                                  ? 'bg-emerald-400'
                                  : p.confidence_percent >= 50
                                  ? 'bg-amber-400'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${p.confidence_percent}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400">{p.confidence_percent}%</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          p.risk_level === 'Low' ? 'bg-emerald-500/10 text-emerald-400'
                            : p.risk_level === 'Medium' ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {p.risk_level}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-emerald-400">
                        {p.theoretical_target_price != null ? fmtCurrency(p.theoretical_target_price) : '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-rose-400">
                        {p.stoploss != null ? fmtCurrency(p.stoploss) : '—'}
                      </td>
                      <td className="py-2.5 text-[10px] text-slate-500">
                        <div className="flex gap-1">
                          {p.suitable_for_intraday && <span className="rounded bg-white/5 px-1 py-0.5">I</span>}
                          {p.suitable_for_swing && <span className="rounded bg-white/5 px-1 py-0.5">S</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-300">
                  Show explanations ({patternsData.patterns.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {patternsData.patterns.map((p, i) => (
                    <div key={i} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                      <p className="mb-1 text-xs font-semibold text-white">{p.pattern_name}</p>
                      <p className="text-xs text-slate-400">{p.explanation}</p>
                    </div>
                  ))}
                </div>
              </details>
            </GlassCard>
          )}

          {patternsData && patternsData.patterns.length === 0 && !patternsLoading && (
            <GlassCard accent="neutral" className="mb-4">
              <p className="text-sm text-slate-500">No chart patterns detected for {detail.short_symbol}.</p>
            </GlassCard>
          )}
        </>
      )}

      {selectedSymbol && !detailLoading && !detail && (
        <GlassCard accent="bearish" className="mb-4">
          <p className="text-sm text-rose-400">Failed to load data for {selectedSymbol}.</p>
        </GlassCard>
      )}
    </PageTransition>
  );
}
