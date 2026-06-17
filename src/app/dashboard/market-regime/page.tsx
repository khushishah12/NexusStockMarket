'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Zap,
  Loader2, Activity, Sparkles, ChevronRight, RefreshCw,
  Search, Building2, Download, AlertTriangle, Target,
  Shield, Award, PieChart, Filter, X, ArrowUpDown,
  Eye, Info, LineChart, Clock, Gauge,
} from 'lucide-react';

interface RegimePrediction {
  symbol: string;
  regime: string;
  confidence: number;
  probabilities: number[];
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(n);
}

function regimeConfig(regime: string): { label: string; glow: string; border: string; bg: string; text: string; icon: any } {
  const map: Record<string, any> = {
    BULL: {
      label: 'Bull',
      glow: 'shadow-[0_0_30px_rgba(0,255,136,0.25)]',
      border: 'border-emerald-500/30',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      icon: TrendingUp,
    },
    BEAR: {
      label: 'Bear',
      glow: 'shadow-[0_0_30px_rgba(255,51,102,0.25)]',
      border: 'border-rose-500/30',
      bg: 'bg-rose-500/10',
      text: 'text-rose-400',
      icon: TrendingDown,
    },
    NEUTRAL: {
      label: 'Neutral',
      glow: 'shadow-[0_0_30px_rgba(250,204,21,0.25)]',
      border: 'border-yellow-500/30',
      bg: 'bg-yellow-500/10',
      text: 'text-yellow-400',
      icon: Minus,
    },
  };
  return map[regime] || map.NEUTRAL;
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
      setDisplay(decimals > 0 ? Math.round(cur * 10 ** decimals) / 10 ** decimals : Math.round(cur));
    }, 16);
    return () => clearInterval(timer);
  }, [value, decimals]);
  const displayVal = decimals > 0 ? display.toFixed(decimals) : display;
  return <span>{displayVal}{suffix}</span>;
}

function PieChartSVG({ bear, neutral, bull }: { bear: number; neutral: number; bull: number }) {
  const total = bear + neutral + bull || 1;
  const b1 = (bear / total) * 360;
  const n1 = (neutral / total) * 360;
  const b2 = (bull / total) * 360;

  const toRad = (d: number) => (d - 90) * Math.PI / 180;
  const polar = (cx: number, cy: number, r: number, deg: number) => {
    const rad = toRad(deg);
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const arc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const s = polar(cx, cy, r, start);
    const e = polar(cx, cy, r, end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  };

  let cur = 0;
  const slices = [
    { deg: b1, color: '#e11d48', label: 'Bear' },
    { deg: n1, color: '#eab308', label: 'Neutral' },
    { deg: b2, color: '#10b981', label: 'Bull' },
  ];

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      {slices.map((s, i) => {
        if (s.deg < 0.5) return null;
        const start = cur;
        cur += s.deg;
        const path = arc(100, 100, 90, start, cur);
        return <path key={i} d={path} fill={s.color} opacity={0.85} />;
      })}
      <circle cx="100" cy="100" r="50" fill="#0f172a" />
      <text x="100" y="96" textAnchor="middle" fill="white" fontSize="22" fontWeight="bold">{fmt(bull)}%</text>
      <text x="100" y="114" textAnchor="middle" fill="#94a3b8" fontSize="10">Bull</text>
    </svg>
  );
}

function BarChartSVG({ bear, neutral, bull }: { bear: number; neutral: number; bull: number }) {
  const total = bear + neutral + bull || 1;
  const maxVal = Math.max(bear, neutral, bull, 1);
  const h = (v: number) => (v / maxVal) * 100;

  return (
    <svg viewBox="0 0 300 180" className="h-full w-full">
      {[0, 25, 50, 75, 100].map(i => (
        <line key={i} x1="0" y1={160 - i * 1.4} x2="280" y2={160 - i * 1.4} stroke="#ffffff08" strokeWidth="1" />
      ))}
      <rect x="30" y={160 - h(bear) * 1.3} width="60" height={h(bear) * 1.3} rx="6" fill="#e11d48" opacity="0.85" />
      <text x="60" y="175" textAnchor="middle" fill="#e11d48" fontSize="11" fontWeight="bold">Bear</text>
      <text x="60" y={160 - h(bear) * 1.3 - 6} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{bear}</text>

      <rect x="120" y={160 - h(neutral) * 1.3} width="60" height={h(neutral) * 1.3} rx="6" fill="#eab308" opacity="0.85" />
      <text x="150" y="175" textAnchor="middle" fill="#eab308" fontSize="11" fontWeight="bold">Neutral</text>
      <text x="150" y={160 - h(neutral) * 1.3 - 6} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{neutral}</text>

      <rect x="210" y={160 - h(bull) * 1.3} width="60" height={h(bull) * 1.3} rx="6" fill="#10b981" opacity="0.85" />
      <text x="240" y="175" textAnchor="middle" fill="#10b981" fontSize="11" fontWeight="bold">Bull</text>
      <text x="240" y={160 - h(bull) * 1.3 - 6} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{bull}</text>
    </svg>
  );
}

function GaugeSVG({ value, label, color }: { value: number; label: string; color: string }) {
  const deg = (value / 100) * 180;
  const toRad = (d: number) => (d - 180) * Math.PI / 180;
  const cx = 100, cy = 100, r = 75;
  const polar = (d: number) => ({ x: cx + r * Math.cos(toRad(d)), y: cy + r * Math.sin(toRad(d)) });

  const s = polar(0);
  const e = polar(deg);
  const large = deg > 180 ? 1 : 0;
  const path = `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;

  return (
    <svg viewBox="0 0 200 130" className="h-full w-full">
      <path d="M 25 100 A 75 75 0 0 1 175 100" fill="none" stroke="#ffffff10" strokeWidth="12" strokeLinecap="round" />
      <path d={path} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" />
      <text x="100" y="105" textAnchor="middle" fill="white" fontSize="28" fontWeight="bold">{Math.round(value)}%</text>
      <text x="100" y="124" textAnchor="middle" fill="#94a3b8" fontSize="10">{label}</text>
    </svg>
  );
}

function RegimeBadge({ regime, confidence }: { regime: string; confidence: number }) {
  const cfg = regimeConfig(regime);
  const Icon = cfg.icon;
  return (
    <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${cfg.border} ${cfg.bg}`}>
      <Icon className={`h-3 w-3 ${cfg.text}`} />
      <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
      <span className="text-[10px] text-slate-500">· {fmt(confidence)}%</span>
    </div>
  );
}

export default function MarketRegimePage() {
  const [predictions, setPredictions] = useState<RegimePrediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterRegime, setFilterRegime] = useState<string>('ALL');
  const [detail, setDetail] = useState<RegimePrediction | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/market-regime');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setPredictions(data.predictions || []);
    } catch {
      setError('Failed to load regime predictions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = useMemo(() => {
    if (filterRegime === 'ALL') return predictions;
    return predictions.filter(p => p.regime === filterRegime);
  }, [predictions, filterRegime]);

  const summary = useMemo(() => {
    const bull = predictions.filter(p => p.regime === 'BULL').length;
    const bear = predictions.filter(p => p.regime === 'BEAR').length;
    const neutral = predictions.filter(p => p.regime === 'NEUTRAL').length;
    const avgConf = predictions.length > 0 ? predictions.reduce((a, b) => a + b.confidence, 0) / predictions.length : 0;
    return { bull, bear, neutral, avgConf };
  }, [predictions]);

  const topBullish = useMemo(() => {
    return [...predictions]
      .filter(p => p.regime === 'BULL')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);
  }, [predictions]);

  const status = (() => {
    const now = new Date();
    const h = now.getHours(), m = now.getMinutes(), d = now.getDay();
    if (d === 0 || d === 6) return 'closed';
    const total = h * 60 + m;
    return total >= 555 && total <= 930 ? 'open' : 'closed';
  })();

  const heroPrediction = useMemo(() => {
    if (predictions.length === 0) return null;
    const regimeCounts: Record<string, number> = {};
    predictions.forEach(p => { regimeCounts[p.regime] = (regimeCounts[p.regime] || 0) + 1; });
    const majorityRegime = Object.entries(regimeCounts).sort((a, b) => b[1] - a[1])[0][0];
    const majorityStocks = predictions.filter(p => p.regime === majorityRegime).sort((a, b) => b.confidence - a.confidence);
    return {
      regime: majorityRegime,
      count: regimeCounts[majorityRegime],
      topStock: majorityStocks[0] || predictions[0],
      avgConf: predictions.filter(p => p.regime === majorityRegime).reduce((a, b) => a + b.confidence, 0) / (regimeCounts[majorityRegime] || 1),
    };
  }, [predictions]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-2 border-violet-400 border-t-transparent" />
          <p className="text-sm text-slate-400">Analyzing market regimes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-rose-400" />
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={fetchData} className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2 text-xs text-slate-300 hover:bg-white/[0.08]">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const hcfg = heroPrediction ? regimeConfig(heroPrediction.regime) : regimeConfig('NEUTRAL');
  const HIcon = hcfg.icon;

  return (
    <div className="min-h-screen px-4 py-6">

      {/* ═══════ HEADER ═══════ */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className={`mb-2 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest ${hcfg.border} ${hcfg.bg} ${hcfg.text}`}>
              <Activity className="h-3 w-3" />
              AI Market Regime Predictor
            </div>
            <h1 className="text-2xl font-bold text-white">Forecasting future market conditions using Machine Learning</h1>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                {predictions.length} Stocks Tracked
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
            <RefreshCw className={`h-3.5 w-3.5`} />
            Refresh
          </button>
        </div>
      </div>

      {/* ═══════ HERO — CURRENT MARKET OUTLOOK ═══════ */}
      {heroPrediction && (
        <div className={`relative mb-6 overflow-hidden rounded-3xl border ${hcfg.border} bg-gradient-to-br ${hcfg.bg} p-6 sm:p-8 ${hcfg.glow}`}
          style={{ background: heroPrediction.regime === 'BULL' ? 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,200,100,0.03))' :
              heroPrediction.regime === 'BEAR' ? 'linear-gradient(135deg, rgba(255,51,102,0.08), rgba(200,0,50,0.03))' :
              'linear-gradient(135deg, rgba(250,204,21,0.08), rgba(200,160,0,0.03))' }}>
          <div className={`absolute -right-24 -top-24 h-80 w-80 rounded-full blur-3xl ${hcfg.bg}`}
            style={{ background: heroPrediction.regime === 'BULL' ? 'rgba(0,255,136,0.12)' :
                heroPrediction.regime === 'BEAR' ? 'rgba(255,51,102,0.12)' :
                'rgba(250,204,21,0.12)' }} />
          <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full blur-3xl"
            style={{ background: heroPrediction.regime === 'BULL' ? 'rgba(0,200,100,0.08)' :
                heroPrediction.regime === 'BEAR' ? 'rgba(200,0,50,0.08)' :
                'rgba(200,160,0,0.08)' }} />
          <div className="relative z-10">
            <div className={`mb-4 inline-flex items-center gap-1.5 rounded-full border ${hcfg.border} px-3 py-1 text-[10px] font-medium ${hcfg.text}`}>
              <Sparkles className="h-3 w-3" />
              Current Market Outlook
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <div className="mb-4 flex items-center gap-4">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${hcfg.bg} ${hcfg.text}`}>
                    <HIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Predicted Regime</p>
                    <p className={`text-4xl font-bold ${hcfg.text}`}>{hcfg.label}ish</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Confidence</p>
                    <p className={`text-3xl font-bold ${hcfg.text}`}>{fmt(heroPrediction.avgConf)}%</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className={`h-full rounded-full`}
                        style={{ width: `${heroPrediction.avgConf}%`, background: heroPrediction.regime === 'BULL' ? 'linear-gradient(90deg,#10b981,#059669)' :
                            heroPrediction.regime === 'BEAR' ? 'linear-gradient(90deg,#e11d48,#be123c)' :
                            'linear-gradient(90deg,#eab308,#ca8a04)' }} />
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Risk Level</p>
                    <p className={`text-3xl font-bold ${hcfg.text}`}>
                      {heroPrediction.regime === 'BULL' ? 'Low' : heroPrediction.regime === 'BEAR' ? 'High' : 'Moderate'}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-600">Market Risk</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider">Stocks In Regime</p>
                    <p className={`text-3xl font-bold ${hcfg.text}`}>{heroPrediction.count}</p>
                    <p className="mt-1 text-[10px] text-slate-600">of {predictions.length}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5">
                  <p className="mb-2 text-[10px] text-slate-500 uppercase tracking-wider">Top Stock in this Regime</p>
                  <p className={`text-lg font-bold ${hcfg.text}`}>{heroPrediction.topStock.symbol.replace('.NS', '')}</p>
                  <p className="text-xs text-slate-500">Confidence: {fmt(heroPrediction.topStock.confidence)}%</p>
                  <div className="mt-2 flex gap-2">
                    {predictions.filter(p => p.regime === heroPrediction.regime).slice(0, 5).map(s => (
                      <span key={s.symbol} className={`rounded-md px-2 py-0.5 text-[10px] ${hcfg.bg} ${hcfg.text} border ${hcfg.border}`}>
                        {s.symbol.replace('.NS', '')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ SUMMARY CARDS ═══════ */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard title="Bullish Stocks" value={<AnimatedNumber value={summary.bull} />}
          sub={`${predictions.length > 0 ? ((summary.bull / predictions.length) * 100).toFixed(0) : 0}% of tracked`}
          icon={TrendingUp} gradient="from-emerald-500/30 to-green-500/30" />
        <SummaryCard title="Bearish Stocks" value={<AnimatedNumber value={summary.bear} />}
          sub={`${predictions.length > 0 ? ((summary.bear / predictions.length) * 100).toFixed(0) : 0}% of tracked`}
          icon={TrendingDown} gradient="from-rose-500/30 to-red-500/30" />
        <SummaryCard title="Neutral Stocks" value={<AnimatedNumber value={summary.neutral} />}
          sub={`${predictions.length > 0 ? ((summary.neutral / predictions.length) * 100).toFixed(0) : 0}% of tracked`}
          icon={Minus} gradient="from-yellow-500/30 to-amber-500/30" />
        <SummaryCard title="Avg Confidence" value={<AnimatedNumber value={summary.avgConf} decimals={1} suffix="%" />}
          sub="Across all regimes" icon={Award} gradient="from-violet-500/30 to-purple-500/30" />
      </div>

      {/* ═══════ TOP OPPORTUNITIES + REGIME DISTRIBUTION ═══════ */}
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        {/* Top Bullish */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            Top Bullish Stocks
          </h2>
          <div className="space-y-3">
            {topBullish.length === 0 && <p className="text-xs text-slate-500">No bullish stocks detected</p>}
            {topBullish.map((s, i) => (
              <div key={s.symbol} className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-3 transition hover:bg-white/[0.04]">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-600 w-4">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{s.symbol.replace('.NS', '')}</p>
                    <p className="text-[10px] text-slate-500">Confidence: {fmt(s.confidence)}%</p>
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}>
                  Consider Buy
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pie Chart - Distribution */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white flex items-center gap-2">
            <PieChart className="h-4 w-4 text-violet-400" />
            Regime Distribution
          </h2>
          <div className="mx-auto h-52 w-52">
            <PieChartSVG bear={summary.bear} neutral={summary.neutral} bull={summary.bull} />
          </div>
          <div className="mt-3 flex justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Bull</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500" /> Neutral</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Bear</span>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h2 className="mb-4 text-sm font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            Distribution Breakdown
          </h2>
          <div className="h-48">
            <BarChartSVG bear={summary.bear} neutral={summary.neutral} bull={summary.bull} />
          </div>
        </div>
      </div>

      {/* ═══════ RISK DASHBOARD ═══════ */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <GaugeSVG value={summary.bull / (predictions.length || 1) * 100} label="Bull Market Strength" color="#10b981" />
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <GaugeSVG value={summary.bear / (predictions.length || 1) * 100} label="Bear Market Exposure" color="#e11d48" />
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <GaugeSVG value={summary.neutral / (predictions.length || 1) * 100} label="Neutral Stability Index" color="#eab308" />
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
          <GaugeSVG value={summary.avgConf} label="Market Risk Meter" color={summary.avgConf > 70 ? '#10b981' : summary.avgConf > 40 ? '#eab308' : '#e11d48'} />
        </div>
      </div>

      {/* ═══════ FILTERS ═══════ */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
        {['ALL', 'BULL', 'BEAR', 'NEUTRAL'].map(r => {
          const isActive = filterRegime === r;
          const cfg = r === 'ALL' ? { text: 'text-slate-300', border: 'border-white/[0.08]', bg: 'bg-white/[0.04]' } : regimeConfig(r);
          return (
            <button key={r}
              onClick={() => setFilterRegime(r)}
              className={`rounded-full border px-3 py-1 text-[11px] font-medium transition ${
                isActive ? `${cfg.border} ${cfg.bg} ${cfg.text}` : 'border-white/[0.06] text-slate-500 hover:text-slate-300'
              }`}>
              {r === 'ALL' ? 'All' : r.charAt(0) + r.slice(1).toLowerCase()}
            </button>
          );
        })}
      </div>

      {/* ═══════ REGIME OVERVIEW GRID ═══════ */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {filtered.map(p => {
          const cfg = regimeConfig(p.regime);
          const Icon = cfg.icon;
          return (
            <div key={p.symbol}
              onClick={() => setDetail(p)}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl border ${cfg.border} ${cfg.bg} p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${cfg.glow}`}>
              <div className="mb-3 flex items-center justify-between">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${cfg.bg} ${cfg.text}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <RegimeBadge regime={p.regime} confidence={p.confidence} />
              </div>
              <p className="text-base font-bold text-white">{p.symbol.replace('.NS', '')}</p>
              <p className="text-[9px] text-slate-600 mt-0.5">NSE: {p.symbol}</p>
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-500">Confidence</span>
                  <span className={`font-semibold ${cfg.text}`}>{fmt(p.confidence)}%</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${p.confidence}%`, background: p.regime === 'BULL' ? 'linear-gradient(90deg,#10b981,#059669)' :
                        p.regime === 'BEAR' ? 'linear-gradient(90deg,#e11d48,#be123c)' :
                        'linear-gradient(90deg,#eab308,#ca8a04)' }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══════ STOCK DETAIL MODAL ═══════ */}
      {detail && (() => {
        const cfg = regimeConfig(detail.regime);
        const Icon = cfg.icon;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setDetail(null)}>
            <div className="w-full max-w-lg rounded-3xl border border-white/[0.08] bg-slate-900 p-6 sm:p-8"
              onClick={e => e.stopPropagation()}>
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${cfg.bg} ${cfg.text}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-white">{detail.symbol.replace('.NS', '')}</p>
                    <p className="text-xs text-slate-500">{detail.symbol}</p>
                  </div>
                </div>
                <button onClick={() => setDetail(null)} className="rounded-full p-1.5 text-slate-500 hover:bg-white/[0.06] hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-6 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Predicted Regime</p>
                  <p className={`mt-1 text-xl font-bold ${cfg.text}`}>{cfg.label}</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Confidence</p>
                  <p className={`mt-1 text-xl font-bold ${cfg.text}`}>{fmt(detail.confidence)}%</p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Trend Strength</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {detail.confidence > 70 ? 'Strong' : detail.confidence > 40 ? 'Moderate' : 'Weak'}
                  </p>
                </div>
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-center">
                  <p className="text-[9px] text-slate-500 uppercase tracking-wider">Market Volatility</p>
                  <p className={`mt-1 text-xl font-bold ${detail.regime === 'BEAR' ? 'text-rose-400' : 'text-slate-300'}`}>
                    {detail.regime === 'BEAR' ? 'Elevated' : detail.regime === 'BULL' ? 'Low' : 'Moderate'}
                  </p>
                </div>
              </div>

              <div className="mb-6 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p className="mb-2 text-[10px] text-slate-500 uppercase tracking-wider">Probability Breakdown</p>
                {['BEAR', 'NEUTRAL', 'BULL'].map((r, i) => {
                  const prob = detail.probabilities?.[i] ?? 0;
                  const rc = regimeConfig(r);
                  return (
                    <div key={r} className="mb-2 last:mb-0">
                      <div className="mb-1 flex items-center justify-between text-[11px]">
                        <span className={rc.text}>{r}</span>
                        <span className="text-slate-400">{fmt(prob)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                        <div className="h-full rounded-full transition-all" style={{ width: `${prob}%`, background: r === 'BULL' ? '#10b981' : r === 'BEAR' ? '#e11d48' : '#eab308' }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                <p className="mb-1 text-[10px] text-slate-500 uppercase tracking-wider">AI Insight</p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  This stock is currently predicted to be in a <span className={cfg.text}>{cfg.label}</span> regime based on market behavior, volatility, trend strength, and VIX conditions.
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={() => setDetail(null)}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-5 py-2.5 text-xs text-slate-300 hover:bg-white/[0.08]">
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══════ FOOTER ═══════ */}
      <div className="mt-8 border-t border-white/[0.04] pt-6 text-center">
        <p className="text-[10px] text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Market regime forecasts are generated using machine learning models and should not be considered financial advice.
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ title, value, sub, icon: Icon, gradient }: {
  title: string; value: React.ReactNode; sub: string; icon: any; gradient: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-20`} />
      <div className="relative z-10">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <Icon className="h-4 w-4 text-slate-500" />
        </div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="mt-1 text-[10px] text-slate-600">{sub}</p>
      </div>
    </div>
  );
}
