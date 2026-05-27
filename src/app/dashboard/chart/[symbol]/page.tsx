'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, Loader2, ExternalLink, Clock, BookOpen, Newspaper, BarChart3, LineChart, Target, PieChart, Wallet, Info, Search, Shield, ShieldAlert } from 'lucide-react';
import PageTransition from '../../../../components/dashboard/PageTransition';
import GlassCard from '../../../../components/dashboard/GlassCard';
import { buildOverlayChartUrl } from '../../../../lib/chart-overlay';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChartItem {
  timeframe: string;
  chartUrl: string | null;
}

interface Fundamentals {
  previous_close: number | null;
  open: number | null;
  day_range: { low: number | null; high: number | null };
  week_52_range: { low: number | null; high: number | null };
  volume: number | null;
  avg_volume: number | null;
  market_cap: number | null;
  beta: number | null;
  pe_ratio: number | null;
  eps: number | null;
  earnings_date: string | null;
  forward_dividend_yield: string | null;
  ex_dividend_date: string | null;
  target_est: number | null;
}

interface NewsItem {
  title: string;
  source: string;
  link: string;
  time: string | null;
  summary: string | null;
  type: string;
}

interface FilingItem {
  title: string;
  type: string;
  date: string | null;
  url: string | null;
}

interface AnalystData {
  price_target: { high: number | null; median: number | null; low: number | null };
  recommendation: { strong_buy: number; buy: number; hold: number; sell: number; strong_sell: number };
}

interface Statistics {
  market_cap: number | null;
  enterprise_value: number | null;
  trailing_pe: number | null;
  forward_pe: number | null;
  peg_ratio: number | null;
  price_sales: number | null;
  price_book: number | null;
  ev_revenue: number | null;
  ev_ebitda: number | null;
}

interface Financials {
  profit_margin: number | null;
  return_on_assets: number | null;
  return_on_equity: number | null;
  revenue: number | null;
  net_income: number | null;
  diluted_eps: number | null;
  total_cash: number | null;
  total_debt_equity: number | null;
  levered_free_cash_flow: number | null;
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
  market_status: string;
  description: string | null;
  charts: ChartItem[];
  fundamentals: Fundamentals;
  news: NewsItem[];
  filings: FilingItem[];
  performance: { week_52_high: number | null; week_52_low: number | null };
  earnings_charts: { eps_trend_url: string | null; revenue_vs_net_income_url: string | null };
  analysts: AnalystData;
  statistics: Statistics;
  financials: Financials;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'] as const;

function fmt(n: number | null, digits = 2): string {
  if (n == null) return 'Not Provided';
  return n.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtPct(n: number | null): string {
  if (n == null) return 'Not Provided';
  return `${(n * 100).toFixed(2)}%`;
}

function fmtCurrency(n: number | null): string {
  if (n == null) return 'Not Provided';
  if (Math.abs(n) >= 1e14) return `₹${(n / 1e14).toFixed(2)}T`;
  if (Math.abs(n) >= 1e12) return `₹${(n / 1e12).toFixed(2)}T`;
  if (Math.abs(n) >= 1e9) return `₹${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  return `₹${n.toLocaleString()}`;
}

function fmtVolume(n: number | null): string {
  if (n == null) return 'Not Provided';
  if (n >= 1e7) return `${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(2)}L`;
  return n.toLocaleString();
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'Not Provided';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function pctColor(v: number | null | undefined): string {
  if (v == null) return 'text-slate-400';
  return v >= 0 ? 'text-emerald-400' : 'text-rose-400';
}

function pctArrow(v: number | null | undefined): string {
  if (v == null) return '';
  return v >= 0 ? '+' : '';
}

/* ------------------------------------------------------------------ */
/*  InfoRow                                                            */
/* ------------------------------------------------------------------ */

function InfoRow({ label, value, cls = '' }: { label: string; value: string | number | null; cls?: string }) {
  const display = value == null || value === 'Not Provided' ? 'Not Provided' : String(value);
  return (
    <div className={`flex justify-between border-b border-white/[0.04] py-2 text-sm ${cls}`}>
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-white">{display}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page Component                                                     */
/* ------------------------------------------------------------------ */

export default function ChartDetailPage() {
  const params = useParams();
  const router = useRouter();
  const symbol = params?.symbol as string;

  const [detail, setDetail] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTf, setActiveTf] = useState('1D');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [patternsData, setPatternsData] = useState<{ patterns: any[]; timeframe_data: Record<string, { timestamps: string[]; close: number[] }> } | null>(null);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const [showPatternOverlay, setShowPatternOverlay] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
        setSelectedIdx(-1);
      }
    } catch { /* ignore */ }
    setSearchLoading(false);
  }, []);

  const navigateTo = (sym: string) => {
    setSearchQuery('');
    setSearchResults([]);
    router.push(`/dashboard/chart/${sym}`);
  };

  const handleSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((p) => Math.min(p + 1, searchResults.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((p) => Math.max(p - 1, -1)); }
    if (e.key === 'Enter' && selectedIdx >= 0 && searchResults[selectedIdx]) {
      navigateTo(searchResults[selectedIdx].symbol);
    }
    if (e.key === 'Escape') { setSearchResults([]); setSearchQuery(''); }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 150);
  }, [searchQuery, doSearch]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults([]);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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

    setPatternsLoading(true);
    fetch(`/api/stocks/${encodeURIComponent(symbol)}/patterns`)
      .then((r) => r.json())
      .then((data) => {
        if (data.patterns) setPatternsData(data);
        if (data.patterns && data.patterns.length > 0) setShowPatternOverlay(false);
      })
      .catch(() => {})
      .finally(() => setPatternsLoading(false));
  }, [symbol]);

  /* ---- Loading / Error ---- */
  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-sm text-slate-400">Generating report for {symbol}...</p>
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

  const { fundamentals: f, analysts: a, statistics: s, financials: fin } = detail;

  const activeChart = detail.charts.find((c) => c.timeframe === activeTf);

  return (
    <PageTransition>
      {/* Back + Search with dropdown */}
      <div className="mb-4 flex items-center gap-3" ref={searchRef}>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="relative ml-auto max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKey}
            placeholder="Search stock..."
            className="w-full rounded-lg border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/20"
          />
          {searchQuery && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-white/10 bg-slate-900 shadow-xl">
              {searchLoading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                </div>
              )}
              {!searchLoading && searchResults.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-500">No stocks found</p>
              )}
              {!searchLoading && searchResults.map((r, i) => (
                <button
                  key={r.symbol}
                  onClick={() => navigateTo(r.symbol)}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                    i === selectedIdx ? 'bg-cyan-500/10' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="font-bold text-white">{r.short_symbol}</span>
                  <span className="text-xs text-slate-500">{r.exchange}</span>
                  <span className="ml-auto text-xs text-slate-400">{r.company_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/*  HEADER                                                      */}
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
                ₹{fmt(detail.price)}
              </p>
            )}
            {detail.change_percent != null && (
              <p className={`flex items-center justify-end gap-1 text-sm font-medium ${pctColor(detail.change_percent)}`}>
                <TrendingUp className={`h-4 w-4 ${detail.change_percent < 0 ? 'rotate-180' : ''}`} />
                {detail.change != null && `${pctArrow(detail.change)}${detail.change.toFixed(2)} `}
                ({pctArrow(detail.change_percent)}{detail.change_percent.toFixed(2)}%)
              </p>
            )}
          </div>
        </div>
      </GlassCard>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  CHART (75% width)                                          */}
      <div className="mx-auto w-full lg:w-3/4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => { setActiveTf(tf); setShowPatternOverlay(false); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTf === tf && !showPatternOverlay
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {tf}
          </button>
        ))}
        {/* Overlay toggle */}
        {patternsData && patternsData.patterns.some((p) => p.detected_on_timeframe === activeTf) && (
          <button
            onClick={() => setShowPatternOverlay(!showPatternOverlay)}
            className={`ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              showPatternOverlay
                ? 'border border-amber-500/40 bg-amber-500/20 text-amber-300'
                : 'border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            {showPatternOverlay ? 'Hide Overlays' : `Pattern Overlay (${patternsData.patterns.filter((p) => p.detected_on_timeframe === activeTf).length})`}
          </button>
        )}
      </div>

      <GlassCard accent="neutral" className="mb-4">
        <div className="flex min-h-[420px] items-center justify-center rounded-lg bg-slate-950/50 p-4">
          {(() => {
            // Overlay chart
            if (showPatternOverlay && patternsData && activeTf) {
              const tfData = patternsData.timeframe_data[activeTf];
              const tfPatterns = patternsData.patterns.filter((p) => p.detected_on_timeframe === activeTf);
              if (tfData && tfData.close.length > 5 && tfPatterns.length > 0) {
                const overlayUrl = buildOverlayChartUrl(symbol, activeTf, tfData.timestamps, tfData.close, tfPatterns);
                if (overlayUrl) return <img src={overlayUrl} alt={`${symbol} ${activeTf} with patterns`} className="max-h-[500px] w-full rounded-lg object-contain" />;
              }
            }
            // Basic chart
            if (activeChart?.chartUrl) {
              return <img src={activeChart.chartUrl} alt={`${detail.short_symbol} ${activeTf} chart`} className="max-h-[500px] w-full rounded-lg object-contain" />;
            }
            return <p className="text-sm text-slate-500">Chart not available for {activeTf}</p>;
          })()}
        </div>
      </GlassCard>
      </div>

      {/*  FUNDAMENTALS TABLE                                          */}
      <GlassCard accent="neutral" className="mb-4 border-l-2 border-l-cyan-500/30">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
          <BookOpen className="h-3.5 w-3.5" />
          Fundamentals Table
        </div>
        <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
          <div>
            <InfoRow label="Previous Close" value={f.previous_close != null ? fmtCurrency(f.previous_close) : 'Not Provided'} />
            <InfoRow label="Open" value={f.open != null ? fmtCurrency(f.open) : 'Not Provided'} />
            <InfoRow
              label="Day's Range"
              value={
                f.day_range.low != null && f.day_range.high != null
                  ? `${fmtCurrency(f.day_range.low)} — ${fmtCurrency(f.day_range.high)}`
                  : 'Not Provided'
              }
            />
            <InfoRow
              label="52 Week Range"
              value={
                f.week_52_range.low != null && f.week_52_range.high != null
                  ? `${fmtCurrency(f.week_52_range.low)} — ${fmtCurrency(f.week_52_range.high)}`
                  : 'Not Provided'
              }
            />
            <InfoRow label="Volume" value={fmtVolume(f.volume)} />
            <InfoRow label="Avg. Volume" value={fmtVolume(f.avg_volume)} />
            <InfoRow label="Market Cap (intraday)" value={fmtCurrency(f.market_cap)} />
          </div>
          <div>
            <InfoRow label="Beta (5Y Monthly)" value={f.beta != null ? fmt(f.beta) : 'Not Provided'} />
            <InfoRow label="PE Ratio (TTM)" value={f.pe_ratio != null ? fmt(f.pe_ratio) : 'Not Provided'} />
            <InfoRow label="EPS (TTM)" value={f.eps != null ? fmtCurrency(f.eps) : 'Not Provided'} />
            <InfoRow label="Earnings Date (est.)" value={fmtDate(f.earnings_date)} />
            <InfoRow label="Forward Dividend &amp; Yield" value={f.forward_dividend_yield ?? 'Not Provided'} />
            <InfoRow label="Ex-Dividend Date" value={fmtDate(f.ex_dividend_date)} />
            <InfoRow label="1y Target Est" value={f.target_est != null ? fmtCurrency(f.target_est) : 'Not Provided'} />
          </div>
        </div>
      </GlassCard>

      {/*  NEWS & FILINGS                                                */}
      <GlassCard accent="neutral" className="mb-4 border-l-2 border-l-cyan-500/30">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
          <Newspaper className="h-3.5 w-3.5" />
          News &amp; Filings
        </div>

        {/* Recent News */}
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent News</h3>
        {detail.news.length === 0 && <p className="mb-4 text-sm text-slate-500">Not Provided</p>}
        {detail.news.length > 0 && (
          <div className="mb-6 space-y-2">
            {detail.news.slice(0, 5).map((n, i) => (
              <div key={i} className="rounded-lg border border-white/[0.06] bg-black/20 p-3">
                <div className="flex items-start justify-between gap-2">
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-white transition hover:text-cyan-300"
                  >
                    {n.title}
                  </a>
                  <ExternalLink className="h-3 w-3 shrink-0 text-slate-600" />
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                  <span>{n.source}</span>
                  {n.time && <span>{new Date(n.time).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                  {n.type && <span className="rounded bg-white/5 px-1.5 py-0.5 uppercase">{n.type}</span>}
                </div>
                {n.summary && <p className="mt-1 text-xs text-slate-400 line-clamp-2">{n.summary}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Corporate Filings */}
        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">Corporate Filings</h3>
        {detail.filings.length === 0 && <p className="text-sm text-slate-500">Not Provided</p>}
        {detail.filings.length > 0 && (
          <div className="space-y-1">
            {detail.filings.map((fi, i) => (
              <div key={i} className="flex items-center justify-between rounded px-3 py-1.5 text-sm hover:bg-white/[0.04]">
                <span className="text-slate-300">{fi.type || fi.title}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{fmtDate(fi.date)}</span>
                  {fi.url && (
                    <a href={fi.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 text-cyan-400" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/*  PERFORMANCE OVERVIEW                                          */}
      <GlassCard accent="neutral" className="mb-4 border-l-2 border-l-cyan-500/30">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
          <BarChart3 className="h-3.5 w-3.5" />
          Performance Overview
        </div>
        <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
          <div>
            <InfoRow
              label="52W High"
              value={detail.performance.week_52_high != null ? fmtCurrency(detail.performance.week_52_high) : 'Not Provided'}
            />
            <InfoRow
              label="52W Low"
              value={detail.performance.week_52_low != null ? fmtCurrency(detail.performance.week_52_low) : 'Not Provided'}
            />
          </div>
          <div>
            <InfoRow
              label="52W High/Low Indicator"
              value={
                detail.price != null && detail.performance.week_52_high != null && detail.performance.week_52_high > 0
                  ? `${((detail.price / detail.performance.week_52_high) * 100).toFixed(1)}% of 52W High`
                  : 'Not Provided'
              }
            />
          </div>
        </div>
      </GlassCard>

      {/*  EARNINGS TRENDS                                               */}
      <GlassCard accent="neutral" className="mb-4 border-l-2 border-l-cyan-500/30">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
          <LineChart className="h-3.5 w-3.5" />
          Earnings Trends
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">EPS Trend (Quarterly)</h3>
            <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-slate-950/50">
              {detail.earnings_charts.eps_trend_url ? (
                <img src={detail.earnings_charts.eps_trend_url} alt="EPS Trend" className="w-full rounded-lg" />
              ) : (
                <p className="text-xs text-slate-500">Not Provided</p>
              )}
            </div>
          </div>
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Revenue vs Net Income (Quarterly)</h3>
            <div className="flex min-h-[200px] items-center justify-center rounded-lg bg-slate-950/50">
              {detail.earnings_charts.revenue_vs_net_income_url ? (
                <img src={detail.earnings_charts.revenue_vs_net_income_url} alt="Revenue vs Net Income" className="w-full rounded-lg" />
              ) : (
                <p className="text-xs text-slate-500">Not Provided</p>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/*  ANALYST INSIGHTS                                              */}
      <GlassCard accent="neutral" className="mb-4 border-l-2 border-l-cyan-500/30">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
          <Target className="h-3.5 w-3.5" />
          Analyst Insights
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {/* Price Targets */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Price Target</h3>
            <div className="space-y-1">
              <InfoRow
                label="High"
                value={a.price_target.high != null ? fmtCurrency(a.price_target.high) : 'Not Provided'}
              />
              <InfoRow
                label="Median"
                value={a.price_target.median != null ? fmtCurrency(a.price_target.median) : 'Not Provided'}
              />
              <InfoRow
                label="Low"
                value={a.price_target.low != null ? fmtCurrency(a.price_target.low) : 'Not Provided'}
              />
            </div>
          </div>
          {/* Recommendation Breakdown */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recommendation Breakdown</h3>
            <div className="space-y-1">
              <InfoRow label="Strong Buy" value={a.recommendation.strong_buy ?? 'Not Provided'} />
              <InfoRow label="Buy" value={a.recommendation.buy ?? 'Not Provided'} />
              <InfoRow label="Hold" value={a.recommendation.hold ?? 'Not Provided'} />
              <InfoRow label="Sell" value={a.recommendation.sell ?? 'Not Provided'} />
              <InfoRow label="Strong Sell" value={a.recommendation.strong_sell ?? 'Not Provided'} />
            </div>
          </div>
        </div>
      </GlassCard>

      {/*  STATISTICS TABLE                                              */}
      <GlassCard accent="neutral" className="mb-4 border-l-2 border-l-cyan-500/30">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
          <PieChart className="h-3.5 w-3.5" />
          Statistics Table
        </div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Valuation Measures</h3>
        <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
          <div>
            <InfoRow label="Market Cap" value={fmtCurrency(s.market_cap)} />
            <InfoRow label="Enterprise Value" value={fmtCurrency(s.enterprise_value)} />
            <InfoRow label="Trailing P/E" value={s.trailing_pe != null ? fmt(s.trailing_pe) : 'Not Provided'} />
            <InfoRow label="Forward P/E" value={s.forward_pe != null ? fmt(s.forward_pe) : 'Not Provided'} />
            <InfoRow label="PEG Ratio (5yr)" value={s.peg_ratio != null ? fmt(s.peg_ratio) : 'Not Provided'} />
          </div>
          <div>
            <InfoRow label="Price/Sales (ttm)" value={s.price_sales != null ? fmt(s.price_sales) : 'Not Provided'} />
            <InfoRow label="Price/Book (mrq)" value={s.price_book != null ? fmt(s.price_book) : 'Not Provided'} />
            <InfoRow label="Enterprise Value/Revenue" value={s.ev_revenue != null ? fmt(s.ev_revenue) : 'Not Provided'} />
            <InfoRow label="Enterprise Value/EBITDA" value={s.ev_ebitda != null ? fmt(s.ev_ebitda) : 'Not Provided'} />
          </div>
        </div>
      </GlassCard>

      {/*  FINANCIAL HIGHLIGHTS                                         */}
      <GlassCard accent="neutral" className="mb-4 border-l-2 border-l-cyan-500/30">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
          <Wallet className="h-3.5 w-3.5" />
          Financial Highlights
        </div>

        {/* Profitability & Income Statement */}
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Profitability &amp; Income Statement
        </h3>
        <div className="mb-4 grid gap-x-8 gap-y-0 sm:grid-cols-2">
          <div>
            <InfoRow label="Profit Margin" value={fin.profit_margin != null ? fmtPct(fin.profit_margin) : 'Not Provided'} />
            <InfoRow label="Return on Assets (ttm)" value={fin.return_on_assets != null ? fmtPct(fin.return_on_assets) : 'Not Provided'} />
            <InfoRow label="Return on Equity (ttm)" value={fin.return_on_equity != null ? fmtPct(fin.return_on_equity) : 'Not Provided'} />
          </div>
          <div>
            <InfoRow label="Revenue (ttm)" value={fmtCurrency(fin.revenue)} />
            <InfoRow label="Net Income (ttm)" value={fmtCurrency(fin.net_income)} />
            <InfoRow label="Diluted EPS (ttm)" value={fin.diluted_eps != null ? fmtCurrency(fin.diluted_eps) : 'Not Provided'} />
          </div>
        </div>

        {/* Balance Sheet & Cash Flow */}
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Balance Sheet &amp; Cash Flow
        </h3>
        <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
          <div>
            <InfoRow label="Total Cash (mrq)" value={fmtCurrency(fin.total_cash)} />
          </div>
          <div>
            <InfoRow label="Total Debt/Equity (mrq)" value={fin.total_debt_equity != null ? fmt(fin.total_debt_equity) : 'Not Provided'} />
            <InfoRow label="Levered Free Cash Flow (ttm)" value={fmtCurrency(fin.levered_free_cash_flow)} />
          </div>
        </div>
      </GlassCard>

      {/*  CHART PATTERNS                                               */}
      <GlassCard accent="neutral" className="mb-4 border-l-2 border-l-cyan-500/30">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
          <Shield className="h-3.5 w-3.5" />
          Chart Pattern Detection
        </div>

        {patternsLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            <span className="ml-2 text-xs text-slate-400">Scanning patterns...</span>
          </div>
        )}

        {!patternsLoading && (!patternsData || patternsData.patterns.length === 0) && (
          <p className="text-sm text-slate-500">No chart patterns detected in the analyzed timeframes.</p>
        )}

        {!patternsLoading && patternsData && patternsData.patterns.length > 0 && (
          <div className="space-y-3">
            {patternsData.patterns.slice(0, 5).map((p, i) => (
              <div key={i} className="rounded-lg border border-white/[0.06] bg-black/20 p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-white">{p.pattern_name}</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    p.risk_level === 'Low' ? 'bg-emerald-500/10 text-emerald-400'
                      : p.risk_level === 'Medium' ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}>{p.risk_level} Risk</span>
                  <span className="rounded bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-300">{p.confidence_percent}%</span>
                  <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">{p.category}</span>
                  <span className="text-[10px] text-slate-500">{p.detected_on_timeframe}</span>
                </div>
                <p className="text-xs text-slate-400">{p.explanation}</p>
                {(p.theoretical_target_price != null || p.stoploss != null) && (
                  <div className="mt-2 flex flex-wrap gap-4 text-xs">
                    {p.theoretical_target_price != null && (
                      <span className="text-emerald-400">Target: ₹{p.theoretical_target_price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                    {p.stoploss != null && (
                      <span className="text-rose-400">Stop: ₹{p.stoploss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    )}
                  </div>
                )}
                <div className="mt-2 flex gap-3 text-[10px] text-slate-500">
                  {p.suitable_for_intraday && <span className="rounded bg-white/5 px-1.5 py-0.5">Intraday ✓</span>}
                  {p.suitable_for_swing && <span className="rounded bg-white/5 px-1.5 py-0.5">Swing ✓</span>}
                  <span>Region: [{p.pattern_region?.start_index}–{p.pattern_region?.end_index}]</span>
                </div>
              </div>
            ))}
            {patternsData.patterns.length > 5 && (
              <p className="text-xs text-slate-500">+{patternsData.patterns.length - 5} more patterns detected</p>
            )}
          </div>
        )}
      </GlassCard>

      {/* About (extra) */}
      {detail.description && (
      <GlassCard accent="neutral" className="mb-4 border-l-2 border-l-cyan-500/30">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-300">
          <Info className="h-3.5 w-3.5" />
          About
        </div>
          <p className="text-sm leading-relaxed text-slate-300">{detail.description}</p>
        </GlassCard>
      )}
    </PageTransition>
  );
}
