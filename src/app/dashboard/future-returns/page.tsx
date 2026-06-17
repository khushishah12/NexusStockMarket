'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Zap,
  Loader2, Activity, Sparkles, ChevronRight, RefreshCw,
  Search, Building2, Download, AlertTriangle, Target,
  TrendingUp as TrendUp, Shield, Award, PieChart,
  Filter, X, ArrowUpDown, ChevronDown, ChevronUp,
  Download as ExportIcon, Star, Clock, DollarSign,
  Eye, BookmarkPlus, Info, LineChart,
} from 'lucide-react';

interface Prediction {
  rank: number;
  symbol: string;
  company: string;
  predicted_return: number;
  confidence: number;
  recommendation: string;
  sector: string;
  industry: string;
  market_cap: number;
  market_cap_category: string;
  price: number;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function fmtReturn(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmt(n)}%`;
}

function fmtMarketCap(n: number): string {
  if (n >= 1e12) return `₹${fmt(n / 1e12)}T`;
  if (n >= 1e9) return `₹${fmt(n / 1e9)}B`;
  if (n >= 1e7) return `₹${fmt(n / 1e7)}Cr`;
  return `₹${fmt(n)}`;
}

function getRating(rec: string): { stars: number; label: string; color: string } {
  const map: Record<string, { stars: number; label: string; color: string }> = {
    'Strong Buy': { stars: 5, label: 'Excellent', color: 'text-emerald-400' },
    'Buy': { stars: 4, label: 'Strong', color: 'text-green-400' },
    'Watchlist': { stars: 3, label: 'Moderate', color: 'text-yellow-400' },
    'Avoid': { stars: 1, label: 'Poor', color: 'text-rose-400' },
  };
  return map[rec] || map['Watchlist'];
}

function getRecommendation(rec: string): { label: string; color: string; bg: string } {
  const labels: Record<string, { label: string; color: string; bg: string }> = {
    'Strong Buy': { label: 'Strong Buy', color: 'text-emerald-300', bg: 'bg-emerald-500/12' },
    'Buy': { label: 'Buy', color: 'text-blue-300', bg: 'bg-blue-500/12' },
    'Watchlist': { label: 'Watchlist', color: 'text-yellow-300', bg: 'bg-yellow-500/12' },
    'Avoid': { label: 'Avoid', color: 'text-rose-300', bg: 'bg-rose-500/12' },
  };
  return labels[rec] || labels['Watchlist'];
}

function getReturnColor(returnVal: number): string {
  if (returnVal > 15) return '#059669';
  if (returnVal >= 8) return '#10b981';
  if (returnVal >= 3) return '#eab308';
  if (returnVal >= 0) return '#f97316';
  return '#e11d48';
}

function marketStatus(): 'open' | 'closed' | 'pre' {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), d = now.getDay();
  if (d === 0 || d === 6) return 'closed';
  const total = h * 60 + m;
  if (total >= 555 && total <= 930) return 'open';
  return 'closed';
}

function getSectors(preds: Prediction[]): string[] {
  return [...new Set(preds.map(r => r.sector))].filter(Boolean).sort();
}

function AnimatedNumber({ value, suffix = '', decimals = 0 }: { value: number; suffix?: string; decimals?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const dur = 1200;
    const step = (value - start) / (dur / 16);
    let cur = start;
    const timer = setInterval(() => {
      cur += step;
      if ((step > 0 && cur >= value) || (step < 0 && cur <= value)) {
        cur = value;
        clearInterval(timer);
      }
      setDisplay(Math.round(cur));
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toFixed(decimals)}{suffix}</>;
}

function SummaryCard({ title, value, sub, icon: Icon, gradient, loading }: {
  title: string; value: any; sub?: string; icon: any; gradient: string; loading?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.04] hover:shadow-lg hover:shadow-black/20">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10 transition-all duration-500 group-hover:scale-150 ${gradient}`} />
      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-500">{title}</span>
          <div className={`rounded-xl p-2 ${gradient} bg-opacity-20`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
        </div>
        {loading ? (
          <div className="h-7 w-24 animate-pulse rounded bg-white/[0.06]" />
        ) : (
          <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
        )}
        {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`h-3 w-3 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`} />
      ))}
    </div>
  );
}

function StarRatingLabel({ rec }: { rec: string }) {
  const r = getRating(rec);
  return (
    <div className="flex items-center gap-2">
      <StarRating rating={r.stars} />
      <span className={`text-[10px] font-medium ${r.color}`}>{r.label}</span>
    </div>
  );
}

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const isGood = (v: number) => color === 'sector' ? true : v >= 0;
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-24 truncate text-[10px] text-slate-400">{d.label}</span>
          <div className="flex-1">
            <div className="h-4 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className={`h-full rounded-full ${color === 'sector' ? 'bg-violet-500/60' : d.value >= 0 ? 'bg-emerald-500/60' : 'bg-rose-500/60'} transition-all duration-500`}
                style={{ width: `${(Math.abs(d.value) / max) * 100}%` }}
              />
            </div>
          </div>
          <span className={`w-16 text-right font-mono text-[10px] ${color === 'sector' ? 'text-violet-300' : d.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {color === 'sector' ? `${d.value}%` : fmtReturn(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScatterPlot({ data }: { data: { x: number; y: number; label: string }[] }) {
  const maxX = Math.max(...data.map(d => d.x), 1);
  const maxY = Math.max(...data.map(d => Math.abs(d.y)), 1);
  const minY = Math.min(...data.map(d => d.y), 0);
  const rangeY = maxY - minY || 1;
  return (
    <div className="relative h-48 w-full">
      <svg viewBox="0 0 400 200" className="h-full w-full">
        {data.slice(0, 25).map((d, i) => {
          const cx = 30 + (d.x / maxX) * 340;
          const cy = 180 - ((d.y - minY) / rangeY) * 160;
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={5} fill={d.y >= 0 ? '#10b981' : '#e11d48'} opacity={0.7}>
                <title>{d.label}: {d.y.toFixed(2)}%</title>
              </circle>
            </g>
          );
        })}
        <line x1={30} y1={180 - (-minY / rangeY) * 160} x2={370} y2={180 - (-minY / rangeY) * 160} stroke="#ffffff20" strokeWidth={1} strokeDasharray="4,4" />
      </svg>
    </div>
  );
}

function DistributionChart({ values }: { values: number[] }) {
  const bins = [-20, -10, -5, 0, 3, 8, 15, 20, 30, 50];
  const counts = bins.map((_, i) => {
    if (i === 0) return values.filter(v => v < bins[0]).length;
    if (i === bins.length - 1) return values.filter(v => v >= bins[i]).length;
    return values.filter(v => v >= bins[i] && v < bins[i + 1]).length;
  });
  const maxCount = Math.max(...counts, 1);
  const labels = ['<-20%', '-20%', '-5%', '0%', '3%', '8%', '15%', '20%', '30%', '>50%'];

  return (
    <div className="flex h-40 items-end gap-1">
      {counts.map((c, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <span className="text-[8px] text-slate-500">{c}</span>
          <div
            className="w-full rounded-t"
            style={{
              height: `${(c / maxCount) * 100}%`,
              background: bins[i] >= 15 ? '#059669' : bins[i] >= 8 ? '#10b981' : bins[i] >= 3 ? '#eab308' : '#e11d48',
              opacity: 0.7,
            }}
          />
          <span className="text-[7px] text-slate-600 -rotate-45 origin-left whitespace-nowrap">{labels[i]}</span>
        </div>
      ))}
    </div>
  );
}

function DetailModal({ pred, onClose }: { pred: Prediction | null; onClose: () => void }) {
  if (!pred) return null;
  const rec = getRecommendation(pred.recommendation);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-3xl border border-white/[0.08] bg-slate-900/95 p-6 shadow-2xl backdrop-blur-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="text-lg font-bold text-white">{pred.company}</p>
            <p className="font-mono text-xs text-slate-500">{pred.symbol}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
            <p className="text-[9px] text-slate-500">Predicted Return</p>
            <p className={`text-lg font-bold ${pred.predicted_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtReturn(pred.predicted_return)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
            <p className="text-[9px] text-slate-500">Confidence</p>
            <p className="text-lg font-bold text-white">{pred.confidence}%</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
            <p className="text-[9px] text-slate-500">Market Cap</p>
            <p className="text-sm font-bold text-white">{fmtMarketCap(pred.market_cap)}</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
            <p className="text-[9px] text-slate-500">Recommendation</p>
            <p className={`text-sm font-bold ${rec.color}`}>{rec.label}</p>
          </div>
        </div>

        <div className="mb-4 space-y-3">
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Valuation Score</span>
            <span className="font-mono text-slate-300">—</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Growth Score</span>
            <span className="font-mono text-slate-300">—</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">ROE</span>
            <span className="font-mono text-slate-300">—</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">P/E Ratio</span>
            <span className="font-mono text-slate-300">—</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">P/B Ratio</span>
            <span className="font-mono text-slate-300">—</span>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.06] bg-gradient-to-r from-cyan-500/8 to-blue-500/8 p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 text-cyan-400 shrink-0" />
            <p className="text-[11px] leading-relaxed text-slate-300">
              This stock is predicted to deliver approximately <span className="font-semibold text-white">{fmtReturn(pred.predicted_return)}</span> return over the next 30 days.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FutureReturnsPage() {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'return' | 'confidence'>('return');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedMcap, setSelectedMcap] = useState<string[]>([]);
  const [selectedRec, setSelectedRec] = useState<string[]>([]);
  const [minReturn, setMinReturn] = useState(-30);
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState<'csv' | null>(null);
  const [detail, setDetail] = useState<Prediction | null>(null);

  const PER_PAGE = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/future-returns');
      if (!res.ok) throw new Error('API error');
      const d = await res.json();
      setPredictions(d.predictions || []);
    } catch {
      setError('Failed to load predictions');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let list = [...predictions];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.symbol.toLowerCase().includes(q) || r.company.toLowerCase().includes(q));
    }
    if (selectedSectors.length) list = list.filter(r => selectedSectors.includes(r.sector));
    if (selectedMcap.length) list = list.filter(r => selectedMcap.includes(r.market_cap_category));
    if (selectedRec.length) {
      list = list.filter(r => selectedRec.includes(r.recommendation));
    }
    list = list.filter(r => r.predicted_return >= minReturn);
    list.sort((a, b) => {
      const aVal = sortBy === 'return' ? a.predicted_return : a.confidence;
      const bVal = sortBy === 'return' ? b.predicted_return : b.confidence;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [predictions, search, selectedSectors, selectedMcap, selectedRec, minReturn, sortBy, sortAsc]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const best = filtered[0];
  const featured = predictions.sort((a, b) => b.predicted_return - a.predicted_return)[0];
  const status = marketStatus();
  const sectors = getSectors(predictions);
  const mcaps = [...new Set(predictions.map(r => r.market_cap_category))].filter(Boolean);
  const recTypes = ['Strong Buy', 'Buy', 'Watchlist', 'Avoid'];

  const summary = useMemo(() => {
    const total = predictions.length;
    if (!total) return { avgReturn: 0, highest: 0, lowest: 0, positiveCount: 0, positivePct: 0 };
    const avgReturn = predictions.reduce((s, r) => s + r.predicted_return, 0) / total;
    const highest = Math.max(...predictions.map(r => r.predicted_return));
    const lowest = Math.min(...predictions.map(r => r.predicted_return));
    const positiveCount = predictions.filter(r => r.predicted_return > 0).length;
    return { avgReturn, highest, lowest, positiveCount, positivePct: (positiveCount / total) * 100 };
  }, [predictions]);

  const top10 = useMemo(() => filtered.slice(0, 10), [filtered]);

  const sectorData = useMemo(() => {
    const m = new Map<string, number[]>();
    predictions.forEach(r => {
      if (!m.has(r.sector)) m.set(r.sector, []);
      m.get(r.sector)!.push(r.predicted_return);
    });
    return Array.from(m.entries()).map(([s, vals]) => ({
      label: s,
      value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      count: vals.length,
    })).sort((a, b) => b.value - a.value);
  }, [predictions]);

  const scatterData = useMemo(() =>
    predictions.map(r => ({ x: r.market_cap, y: r.predicted_return, label: r.symbol })),
  [predictions]);

  const distributionValues = useMemo(() => predictions.map(r => r.predicted_return), [predictions]);

  const exportCsv = () => {
    setExporting('csv');
    const header = 'Rank,Symbol,Company,Predicted Return %,Confidence,Sector,Market Cap,Market Cap Category';
    const rows = predictions.map(r => `${r.rank},${r.symbol},"${r.company}",${r.predicted_return},${r.confidence},"${r.sector}","${fmtMarketCap(r.market_cap)}","${r.market_cap_category}"`);
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'future-returns.csv'; a.click();
    URL.revokeObjectURL(url);
    setTimeout(() => setExporting(null), 500);
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) setSortAsc(!sortAsc);
    else { setSortBy(field); setSortAsc(false); }
  };

  return (
    <div className="min-h-screen px-4 py-6">

      {/* ═══════════ HEADER ═══════════ */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/8 px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-violet-300">
              <LineChart className="h-3 w-3" />
              AI Future Return Predictor
            </div>
            <h1 className="text-2xl font-bold text-white">Forecasting expected stock returns using Machine Learning</h1>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Prediction Horizon: 30 Days
              </span>
              <span className={`flex items-center gap-1 ${status === 'open' ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${status === 'open' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                Market {status === 'open' ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-xs text-slate-300 transition hover:bg-white/[0.08] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══════════ HERO FEATURED PREDICTION CARD ═══════════ */}
      {featured && !loading && (
        <div className="mb-6 relative overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-indigo-500/10 p-6 sm:p-8">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-500/10 blur-3xl" />
          <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-medium text-violet-300">
              <Award className="h-3 w-3" />
              Featured Prediction
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <h2 className="text-3xl font-bold text-white">{featured.company}</h2>
                <p className="mt-1 font-mono text-sm text-slate-500">{featured.symbol} · {featured.sector} · {featured.market_cap_category}</p>
                <div className="mt-6 grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Predicted Return</p>
                    <p className="text-4xl font-bold text-emerald-400">{fmtReturn(featured.predicted_return)}</p>
                    <p className="mt-1 text-[10px] text-slate-600">Next 30 days</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Confidence</p>
                    <p className="text-4xl font-bold text-white">{featured.confidence}%</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400" style={{ width: `${featured.confidence}%` }} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Horizon</p>
                    <p className="text-4xl font-bold text-white">30</p>
                    <p className="mt-1 text-[10px] text-slate-600">Days</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-center">
                  <p className="mb-2 text-[10px] text-slate-500 uppercase tracking-wider">AI Opportunity Score</p>
                  <div className="flex items-center justify-center gap-2">
                    <StarRating rating={getRating(featured.recommendation).stars} />
                  </div>
                  <p className={`mt-1 text-xs font-medium ${getRating(featured.recommendation).color}`}>{getRating(featured.recommendation).label}</p>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-4 py-1.5">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300">{featured.recommendation}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ SUMMARY CARDS ═══════════ */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard title="Average Predicted Return" value={loading ? '—' : fmtReturn(summary.avgReturn)} sub="Across all stocks" icon={BarChart3}
          gradient="from-violet-500/30 to-purple-500/30" loading={loading} />
        <SummaryCard title="Highest Predicted Return" value={loading ? '—' : fmtReturn(summary.highest)} sub="Best performer" icon={TrendUp}
          gradient="from-emerald-500/30 to-green-500/30" loading={loading} />
        <SummaryCard title="Lowest Predicted Return" value={loading ? '—' : fmtReturn(summary.lowest)} sub="Worst performer" icon={TrendingDown}
          gradient="from-rose-500/30 to-red-500/30" loading={loading} />
        <SummaryCard title="Stocks with Positive Return" value={loading ? '—' : <AnimatedNumber value={summary.positiveCount} />} sub={`${summary.positivePct.toFixed(0)}% of total`} icon={Award}
          gradient="from-amber-500/30 to-orange-500/30" loading={loading} />
      </div>

      {/* ═══════════ TOP OPPORTUNITIES ═══════════ */}
      {!loading && predictions.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-4 text-sm font-semibold text-white">Prediction Overview</h2>
          {(() => {
            const grouped: Record<string, typeof predictions> = {};
            predictions.forEach(p => {
              if (!grouped[p.recommendation]) grouped[p.recommendation] = [];
              grouped[p.recommendation].push(p);
            });
            const sample = [
              ...(grouped['Strong Buy'] || []).slice(0, 3),
              ...(grouped['Buy'] || []).slice(0, 3),
              ...(grouped['Watchlist'] || []).slice(0, 3),
              ...(grouped['Avoid'] || []).slice(0, 3),
            ];
            return (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {sample.map(p => {
              const cardColors: Record<string, { bg: string; border: string }> = {
                'Strong Buy': { bg: '#05966920', border: '#05966940' },
                'Buy': { bg: '#10b98120', border: '#10b98140' },
                'Watchlist': { bg: '#eab30820', border: '#eab30840' },
                'Avoid': { bg: '#e11d4820', border: '#e11d4840' },
              };
              const cc = cardColors[p.recommendation] || cardColors['Watchlist'];
              return (
                <div key={p.symbol} className="group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                  style={{ borderColor: cc.border, background: cc.bg }}
                  onClick={() => setDetail(p)}>
                  <div className="mb-2">
                    <p className="text-sm font-semibold text-white">{p.symbol}</p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{p.company}</p>
                  </div>
                  <div className="mb-2">
                    <StarRatingLabel rec={p.recommendation} />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className={`text-base font-bold`} style={{ color: getReturnColor(p.predicted_return) }}>{fmtReturn(p.predicted_return)}</p>
                    <span className="text-[10px] text-slate-500">{p.confidence}%</span>
                  </div>
                </div>
              );
            })}
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════ FEATURED STOCK SECTION ═══════════ */}
      {featured && !loading && (
        <div className="mb-6">
          <h2 className="mb-4 text-sm font-semibold text-white">Featured Stock Pick</h2>
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-cyan-500/8 p-6 sm:p-8">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative z-10">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-300">
                <Award className="h-3 w-3" />
                #1 Pick
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-2xl font-bold text-white">{featured.company}</h3>
                  <p className="mt-1 font-mono text-xs text-slate-500">{featured.symbol} · {featured.sector} · {featured.market_cap_category}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                      <p className="text-[9px] text-slate-500">Predicted Return</p>
                      <p className="text-3xl font-bold text-emerald-400">{fmtReturn(featured.predicted_return)}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                      <p className="text-[9px] text-slate-500">AI Confidence</p>
                      <p className="text-3xl font-bold text-white">{featured.confidence}%</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                      <p className="text-[9px] text-slate-500">AI Opportunity Score</p>
                      <div className="mt-1 flex justify-center">
                        <StarRating rating={getRating(featured.recommendation).stars} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-center">
                      <p className="text-[9px] text-slate-500">Recommendation</p>
                      <p className={`mt-1 text-sm font-bold ${getRecommendation(featured.recommendation).color}`}>{featured.recommendation}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="mb-3 text-xs font-medium text-slate-400">Confidence Meter</p>
                  <div className="mb-2 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-1000"
                      style={{ width: `${featured.confidence}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>0%</span>
                    <span>{featured.confidence}% AI Confidence</span>
                    <span>100%</span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-4 py-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300">{featured.recommendation}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ FILTER + TABLE ═══════════ */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-xs flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by symbol or company..." className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none transition focus:border-violet-500/30" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[10px] transition ${
                showFilters ? 'border-violet-500/30 bg-violet-500/10 text-violet-300' : 'border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
              }`}>
              <Filter className="h-3 w-3" /> Filters
            </button>
            <button onClick={exportCsv} disabled={exporting === 'csv' || !predictions.length}
              className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[10px] text-slate-400 transition hover:bg-white/[0.08] disabled:opacity-40">
              <ExportIcon className="h-3 w-3" /> {exporting === 'csv' ? 'Exporting...' : 'CSV'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-white">Filters</h3>
                <button onClick={() => { setSelectedSectors([]); setSelectedMcap([]); setSelectedRec([]); setMinReturn(-30); }}
                  className="text-[10px] text-violet-400 hover:text-violet-300">Reset</button>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Sector</p>
                  <div className="max-h-32 space-y-1.5 overflow-y-auto">
                    {sectors.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedSectors.includes(s)}
                          onChange={() => setSelectedSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                          className="h-3 w-3 rounded border-white/[0.12] bg-white/[0.04] accent-violet-500" />
                        <span className="text-[11px] text-slate-400">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Market Cap</p>
                  <div className="space-y-1.5">
                    {mcaps.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedMcap.includes(s)}
                          onChange={() => setSelectedMcap(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                          className="h-3 w-3 rounded border-white/[0.12] bg-white/[0.04] accent-violet-500" />
                        <span className="text-[11px] text-slate-400">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Recommendation</p>
                  <div className="space-y-1.5">
                    {recTypes.map(s => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={selectedRec.includes(s)}
                          onChange={() => setSelectedRec(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                          className="h-3 w-3 rounded border-white/[0.12] bg-white/[0.04] accent-violet-500" />
                        <span className="text-[11px] text-slate-400">{s}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Min Return: {minReturn}%</p>
                  <input type="range" min={-30} max={40} value={minReturn} onChange={e => setMinReturn(Number(e.target.value))}
                    className="w-full accent-violet-500" />
                  <div className="mt-1 flex justify-between text-[9px] text-slate-600">
                    <span>-30%</span><span>+40%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════ PREDICTION TABLE ═══════════ */}
        <div className="overflow-hidden rounded-2xl border border-white/[0.06]">
          <div className="border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
            <h2 className="text-sm font-semibold text-white">Prediction Rankings</h2>
          </div>
          {loading ? (
            <div className="px-5 py-16 text-center">
              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-violet-400" />
              <p className="text-xs text-slate-500">Computing predictions with ML model...</p>
            </div>
          ) : error ? (
            <div className="px-5 py-16 text-center">
              <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-rose-400" />
              <p className="text-sm text-rose-300">{error}</p>
              <button onClick={fetchData} className="mt-3 rounded-xl bg-white/[0.06] px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.1]">Retry</button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.04] text-[9px] uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3 w-10">Rank</th>
                      <th className="px-4 py-3">Symbol</th>
                      <th className="px-4 py-3">Company</th>
                      <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('return')}>
                        <span className="flex items-center gap-1">Predicted Return {sortBy === 'return' ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : ''}</span>
                      </th>
                      <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('confidence')}>
                        <span className="flex items-center gap-1">Confidence {sortBy === 'confidence' ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : ''}</span>
                      </th>
                      <th className="px-4 py-3">Opportunity Rating</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">No matching predictions</td></tr>
                    ) : paged.map(r => {
                      const rec = getRecommendation(r.recommendation);
                      const rating = getRating(r.recommendation);
                      return (
                        <tr key={r.symbol} className="border-b border-white/[0.02] transition hover:bg-white/[0.02]">
                          <td className="px-4 py-3">
                            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/[0.04] font-mono text-[10px] text-slate-400">{r.rank}</span>
                          </td>
                          <td className="px-4 py-3 font-mono font-semibold text-white">{r.symbol}</td>
                          <td className="px-4 py-3 text-slate-300">{r.company}</td>
                          <td className={`px-4 py-3 font-mono font-medium ${r.predicted_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{fmtReturn(r.predicted_return)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-12 overflow-hidden rounded-full bg-white/[0.06]">
                                <div className={`h-full rounded-full ${r.confidence >= 80 ? 'bg-emerald-500' : r.confidence >= 60 ? 'bg-yellow-500' : 'bg-rose-500'}`}
                                  style={{ width: `${r.confidence}%` }} />
                              </div>
                              <span className="font-mono text-slate-400">{r.confidence}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StarRatingLabel rec={r.recommendation} />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => setDetail(r)}
                                className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                                title="View Details">
                                <Eye className="h-3 w-3" />
                              </button>
                              <button
                                className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-1.5 text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
                                title="Add to Watchlist">
                                <BookmarkPlus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/[0.04] px-5 py-3">
                  <span className="text-[10px] text-slate-500">{filtered.length} stocks</span>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const start = Math.max(1, Math.min(page - 2, totalPages - 4));
                      const p = start + i;
                      if (p > totalPages) return null;
                      return (
                        <button key={p} onClick={() => setPage(p)}
                          className={`min-w-[28px] rounded-lg px-2 py-1 text-[10px] transition ${p === page ? 'bg-violet-500/15 text-violet-300' : 'text-slate-500 hover:bg-white/[0.06]'}`}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ═══════════ VISUAL ANALYTICS ═══════════ */}
      {!loading && predictions.length > 0 && (
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-xs font-semibold text-white">Predicted Return Distribution</h3>
            <DistributionChart values={distributionValues} />
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-xs font-semibold text-white">Top 10 Return Predictions</h3>
            <BarChart data={top10.map(r => ({ label: r.symbol, value: r.predicted_return }))} color="green" />
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-xs font-semibold text-white">Sector-wise Opportunity</h3>
            <BarChart data={sectorData} color="sector" />
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-xs font-semibold text-white">Market Cap vs Predicted Return</h3>
            <ScatterPlot data={scatterData} />
            <div className="mt-2 flex justify-center gap-4 text-[9px] text-slate-600">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Positive</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Negative</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ DETAIL MODAL ═══════════ */}
      {detail && <DetailModal pred={detail} onClose={() => setDetail(null)} />}

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="mt-12 border-t border-white/[0.06] py-8 text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] text-slate-600">
          <Shield className="h-3 w-3" />
          Risk Disclaimer
        </div>
        <p className="mx-auto max-w-xl text-[10px] leading-relaxed text-slate-600">
          Predictions are generated using machine learning models and are not financial advice.
          Past performance does not guarantee future results. Always do your own research before investing.
        </p>
      </footer>
    </div>
  );
}
