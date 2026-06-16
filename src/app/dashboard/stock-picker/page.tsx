'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Zap,
  Loader2, Activity, Sparkles, ChevronRight, RefreshCw,
  Search, Building2, Download, AlertTriangle, Target,
  TrendingUp as TrendUp, Shield, Award, PieChart,
  Filter, X, ArrowUpDown, ChevronDown, ChevronUp,
  Download as ExportIcon, Star, Clock, DollarSign,
} from 'lucide-react';

/* ── Types ── */

interface Recommendation {
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

/* ── Config ── */

const REC_LABELS: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  'Strong Buy': { label: 'Strong Buy', color: 'text-emerald-300', bg: 'bg-emerald-500/12', border: 'border-emerald-500/30', icon: TrendingUp },
  'Buy': { label: 'Buy', color: 'text-blue-300', bg: 'bg-blue-500/12', border: 'border-blue-500/30', icon: ArrowUpDown },
  'Watchlist': { label: 'Watchlist', color: 'text-yellow-300', bg: 'bg-yellow-500/12', border: 'border-yellow-500/30', icon: Clock },
  'Avoid': { label: 'Avoid', color: 'text-rose-300', bg: 'bg-rose-500/12', border: 'border-rose-500/30', icon: TrendingDown },
};

/* ── Helpers ── */

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

function marketStatus(): 'open' | 'closed' | 'pre' {
  const now = new Date();
  const h = now.getHours(), m = now.getMinutes(), d = now.getDay();
  if (d === 0 || d === 6) return 'closed';
  const total = h * 60 + m;
  if (total >= 555 && total <= 930) return 'open';
  return 'closed';
}

function getSectors(recos: Recommendation[]): string[] {
  return [...new Set(recos.map(r => r.sector))].filter(Boolean).sort();
}

/* ── Animated Counter ── */

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
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
  return <>{display}{suffix}</>;
}

/* ── Summary Card ── */

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

/* ── Recommendation Card ── */

function RecCard({ rec }: { rec: Recommendation }) {
  const cfg = REC_LABELS[rec.recommendation] || REC_LABELS['Watchlist'];
  const Icon = cfg.icon;
  return (
    <div className={`group relative overflow-hidden rounded-2xl border ${cfg.border} ${cfg.bg} p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-${rec.recommendation === 'Strong Buy' ? 'emerald' : rec.recommendation === 'Buy' ? 'blue' : rec.recommendation === 'Avoid' ? 'rose' : 'yellow'}-500/10`}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{rec.company}</p>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="font-mono text-[10px] text-slate-500">{rec.symbol}</span>
            <span className="rounded bg-white/[0.04] px-1.5 py-0.5 text-[9px] text-slate-600">{rec.market_cap_category}</span>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${cfg.bg} ${cfg.color}`}>
          <Icon className="h-3 w-3" />
          <span className="text-[10px] font-semibold">{cfg.label}</span>
        </div>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="text-[9px] text-slate-500">Predicted Return</p>
          <p className={`text-base font-bold ${rec.predicted_return >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmtReturn(rec.predicted_return)}
          </p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500">Confidence</p>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className={`h-full rounded-full ${rec.confidence >= 80 ? 'bg-emerald-500' : rec.confidence >= 60 ? 'bg-yellow-500' : 'bg-rose-500'}`}
                style={{ width: `${rec.confidence}%` }} />
            </div>
            <span className="font-mono text-xs text-slate-300">{rec.confidence}%</span>
          </div>
        </div>
      </div>
      <button className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-[10px] font-medium text-slate-300 transition hover:bg-white/[0.08] hover:text-white">
        View Analysis
      </button>
    </div>
  );
}

/* ── Simple Bar Chart ── */

function BarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  return (
    <div className="space-y-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-24 truncate text-[10px] text-slate-400">{d.label}</span>
          <div className="flex-1">
            <div className="h-4 overflow-hidden rounded-full bg-white/[0.04]">
              <div
                className={`h-full rounded-full ${d.value >= 0 ? 'bg-emerald-500/60' : 'bg-rose-500/60'} transition-all duration-500`}
                style={{ width: `${(Math.abs(d.value) / max) * 100}%` }}
              />
            </div>
          </div>
          <span className={`w-16 text-right font-mono text-[10px] ${d.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {fmtReturn(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Page ── */

export default function StockPickerPage() {
  const [recos, setRecos] = useState<Recommendation[]>([]);
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
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);

  const PER_PAGE = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/stock-picker');
      if (!res.ok) throw new Error('API error');
      const d = await res.json();
      setRecos(d.recommendations || []);
    } catch {
      setError('Failed to load recommendations');
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    let list = [...recos];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.symbol.toLowerCase().includes(q) || r.company.toLowerCase().includes(q));
    }
    if (selectedSectors.length) list = list.filter(r => selectedSectors.includes(r.sector));
    if (selectedMcap.length) list = list.filter(r => selectedMcap.includes(r.market_cap_category));
    if (selectedRec.length) list = list.filter(r => selectedRec.includes(r.recommendation));
    list = list.filter(r => r.predicted_return >= minReturn);
    list.sort((a, b) => {
      const aVal = sortBy === 'return' ? a.predicted_return : a.confidence;
      const bVal = sortBy === 'return' ? b.predicted_return : b.confidence;
      return sortAsc ? aVal - bVal : bVal - aVal;
    });
    return list;
  }, [recos, search, selectedSectors, selectedMcap, selectedRec, minReturn, sortBy, sortAsc]);

  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const best = recos[0];
  const status = marketStatus();
  const sectors = getSectors(recos);
  const mcaps = [...new Set(recos.map(r => r.market_cap_category))].filter(Boolean);
  const recTypes = [...new Set(recos.map(r => r.recommendation))].filter(Boolean);

  const summary = useMemo(() => {
    const total = recos.length;
    const strongBuy = recos.filter(r => r.recommendation === 'Strong Buy').length;
    const avgReturn = total > 0 ? recos.reduce((s, r) => s + r.predicted_return, 0) / total : 0;
    const highest = total > 0 ? Math.max(...recos.map(r => r.predicted_return)) : 0;
    return { total, strongBuy, avgReturn, highest };
  }, [recos]);

  const top10 = recos.slice(0, 10);
  const sectorData = useMemo(() => {
    const m = new Map<string, number[]>();
    recos.forEach(r => {
      if (!m.has(r.sector)) m.set(r.sector, []);
      m.get(r.sector)!.push(r.predicted_return);
    });
    return Array.from(m.entries()).map(([s, vals]) => ({
      label: s,
      value: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100,
      count: vals.length,
    })).sort((a, b) => b.value - a.value);
  }, [recos]);

  const exportCsv = () => {
    setExporting('csv');
    const header = 'Rank,Symbol,Company,Predicted Return %,Confidence,Recommendation,Sector,Market Cap';
    const rows = recos.map(r => `${r.rank},${r.symbol},"${r.company}",${r.predicted_return},${r.confidence},"${r.recommendation}","${r.sector}","${r.market_cap_category}"`);
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ai-stock-picker.csv'; a.click();
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
      <div className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/8 px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-cyan-300">
              <Sparkles className="h-3 w-3" />
              AI Stock Picker
            </div>
            <h1 className="text-2xl font-bold text-white">Discover the best stocks selected by AI</h1>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
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

      {/* ═══════════ SUMMARY CARDS ═══════════ */}
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard title="Total Stocks" value={loading ? '—' : <AnimatedNumber value={summary.total} />} sub="Analyzed" icon={BarChart3}
          gradient="from-cyan-500/30 to-blue-500/30" loading={loading} />
        <SummaryCard title="Strong Buy" value={loading ? '—' : <AnimatedNumber value={summary.strongBuy} />} sub="Recommendations" icon={TrendUp}
          gradient="from-emerald-500/30 to-green-500/30" loading={loading} />
        <SummaryCard title="Avg Return" value={loading ? '—' : fmtReturn(summary.avgReturn)} sub="Predicted" icon={Target}
          gradient="from-violet-500/30 to-purple-500/30" loading={loading} />
        <SummaryCard title="Top Return" value={loading ? '—' : fmtReturn(summary.highest)} sub="Highest predicted" icon={Award}
          gradient="from-amber-500/30 to-orange-500/30" loading={loading} />
      </div>

      {/* ═══════════ FILTER + TABLE ═══════════ */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by symbol or company..." className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/30" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-[10px] transition ${
              showFilters ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-white/[0.08] bg-white/[0.04] text-slate-400 hover:bg-white/[0.08]'
            }`}>
            <Filter className="h-3 w-3" /> Filters
          </button>
          <button onClick={exportCsv} disabled={exporting === 'csv' || !recos.length}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[10px] text-slate-400 transition hover:bg-white/[0.08] disabled:opacity-40">
            <ExportIcon className="h-3 w-3" /> {exporting === 'csv' ? 'Exporting...' : 'CSV'}
          </button>
        </div>
      </div>

      {/* ── Filter Panel ── */}
      {showFilters && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white">Filters</h3>
              <button onClick={() => { setSelectedSectors([]); setSelectedMcap([]); setSelectedRec([]); setMinReturn(-30); }}
                className="text-[10px] text-cyan-400 hover:text-cyan-300">Reset</button>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Sector</p>
                <div className="max-h-32 space-y-1.5 overflow-y-auto">
                  {sectors.map(s => (
                    <label key={s} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={selectedSectors.includes(s)}
                        onChange={() => setSelectedSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])}
                        className="h-3 w-3 rounded border-white/[0.12] bg-white/[0.04] accent-cyan-500" />
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
                        className="h-3 w-3 rounded border-white/[0.12] bg-white/[0.04] accent-cyan-500" />
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
                        className="h-3 w-3 rounded border-white/[0.12] bg-white/[0.04] accent-cyan-500" />
                      <span className="text-[11px] text-slate-400">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-slate-500">Min Return: {minReturn}%</p>
                <input type="range" min={-30} max={40} value={minReturn} onChange={e => setMinReturn(Number(e.target.value))}
                  className="w-full accent-cyan-500" />
                <div className="mt-1 flex justify-between text-[9px] text-slate-600">
                  <span>-30%</span><span>+40%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ RANKING TABLE ═══════════ */}
      <div className="mb-8 overflow-hidden rounded-2xl border border-white/[0.06]">
        <div className="border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Stock Rankings</h2>
        </div>
        {loading ? (
          <div className="px-5 py-16 text-center">
            <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan-400" />
            <p className="text-xs text-slate-500">Analyzing stocks with AI model...</p>
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
                      <span className="flex items-center gap-1">Return {sortBy === 'return' ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : ''}</span>
                    </th>
                    <th className="px-4 py-3 cursor-pointer select-none" onClick={() => toggleSort('confidence')}>
                      <span className="flex items-center gap-1">Confidence {sortBy === 'confidence' ? (sortAsc ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : ''}</span>
                    </th>
                    <th className="px-4 py-3">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-500">No matching stocks</td></tr>
                  ) : paged.map(r => {
                    const cfg = REC_LABELS[r.recommendation] || REC_LABELS['Watchlist'];
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
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${cfg.bg} ${cfg.color}`}>
                            <cfg.icon className="h-2.5 w-2.5" />
                            <span className="text-[9px] font-medium">{cfg.label}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
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
                        className={`min-w-[28px] rounded-lg px-2 py-1 text-[10px] transition ${p === page ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-500 hover:bg-white/[0.06]'}`}>
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

      {/* ═══════════ BEST OPPORTUNITY ═══════════ */}
      {best && (
        <div className="mb-8">
          <h2 className="mb-4 text-sm font-semibold text-white">Best Opportunity</h2>
          <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-cyan-500/8 p-6 sm:p-8">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="relative z-10">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-medium text-emerald-300">
                <Award className="h-3 w-3" />
                #1 Pick
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="text-2xl font-bold text-white">{best.company}</h3>
                  <p className="mt-1 font-mono text-xs text-slate-500">{best.symbol} · {best.sector} · {best.market_cap_category}</p>
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                      <p className="text-[9px] text-slate-500">Predicted Return</p>
                      <p className="text-3xl font-bold text-emerald-400">{fmtReturn(best.predicted_return)}</p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                      <p className="text-[9px] text-slate-500">AI Confidence</p>
                      <p className="text-3xl font-bold text-white">{best.confidence}%</p>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-relaxed text-slate-400">
                    AI model identifies strong fundamentals with attractive valuation, robust growth metrics, and favorable sector positioning. High confidence in predicted return.
                  </p>
                </div>
                <div className="flex flex-col justify-center">
                  <p className="mb-3 text-xs font-medium text-slate-400">Confidence Meter</p>
                  <div className="mb-2 h-3 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-1000"
                      style={{ width: `${best.confidence}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>0%</span>
                    <span>{best.confidence}% AI Confidence</span>
                    <span>100%</span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-4 py-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300">
                      {best.recommendation === 'Strong Buy' ? 'Strong Buy Recommendation' : best.recommendation}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ CHARTS ═══════════ */}
      {!loading && recos.length > 0 && (
        <div className="mb-8">
          {/* Top 10 */}
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="mb-4 text-xs font-semibold text-white">Top 10 Returns</h3>
            <BarChart data={top10.map(r => ({ label: r.symbol, value: r.predicted_return }))} color="cyan" />
          </div>
        </div>
      )}

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className="mt-12 border-t border-white/[0.06] py-8 text-center">
        <div className="mb-2 inline-flex items-center gap-1.5 text-[10px] text-slate-600">
          <Shield className="h-3 w-3" />
          Risk Disclaimer
        </div>
        <p className="mx-auto max-w-xl text-[10px] leading-relaxed text-slate-600">
          Recommendations are generated using machine learning models and are not financial advice.
          Past performance does not guarantee future results. Always do your own research before investing.
        </p>
      </footer>
    </div>
  );
}
