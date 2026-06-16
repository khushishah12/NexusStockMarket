'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, Minus, BarChart3, Zap,
  Loader2, Activity, Sparkles, ChevronRight, RefreshCw, Search, Building2,
} from 'lucide-react';

const STOCKS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
  'BHARTIARTL.NS', 'ITC.NS', 'SBIN.NS', 'LT.NS', 'HINDUNILVR.NS',
  'BAJFINANCE.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'ASIANPAINT.NS',
  'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'ULTRACEMCO.NS',
  'NTPC.NS', 'POWERGRID.NS',
];

function displayName(s: string) { return s.replace('.NS', ''); }

interface Features {
  valuation_score: number;
  financial_stability_score: number;
  debt_risk_score: number;
  growth_score: number;
  roe: number;
  pe_ratio: number;
  pb_ratio: number;
}

interface Prediction {
  signal: string;
  confidence: number;
  probabilities: { BUY: number; HOLD: number; SELL: number };
  model: string;
}

const FEATURE_META: { key: keyof Features; label: string; suffix: string }[] = [
  { key: 'valuation_score', label: 'Valuation Score', suffix: '/100' },
  { key: 'financial_stability_score', label: 'Financial Stability', suffix: '/100' },
  { key: 'debt_risk_score', label: 'Debt Risk', suffix: '/100' },
  { key: 'growth_score', label: 'Growth Score', suffix: '/100' },
  { key: 'roe', label: 'Return on Equity', suffix: '%' },
  { key: 'pe_ratio', label: 'P/E Ratio', suffix: '' },
  { key: 'pb_ratio', label: 'P/B Ratio', suffix: '' },
];

const SIGNAL_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: any }> = {
  BUY: { label: 'BUY', color: 'text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: TrendingUp },
  HOLD: { label: 'HOLD', color: 'text-yellow-300', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: Minus },
  SELL: { label: 'SELL', color: 'text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30', icon: TrendingDown },
};

export default function PredictSignalPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [features, setFeatures] = useState<Features | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredStocks = STOCKS.filter(s =>
    s.replace('.NS', '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectStock = useCallback(async (s: string) => {
    setSelected(s);
    setPrediction(null);
    setFeatures(null);
    setError('');
    setLoadingFeatures(true);

    try {
      const res = await fetch('/api/predict-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: s }),
      });
      const data = await res.json();
      if (data.features) setFeatures(data.features);
      if (data.prediction) setPrediction(data.prediction);
      if (data.error) setError(data.error);
    } catch {
      setError('Failed to fetch data');
    }

    setLoadingFeatures(false);
  }, []);

  const predictSignal = useCallback(async () => {
    if (!selected) return;
    setPredicting(true);
    setPrediction(null);
    setError('');

    try {
      const res = await fetch('/api/predict-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selected }),
      });
      const data = await res.json();
      if (data.prediction) setPrediction(data.prediction);
      if (data.features) setFeatures(data.features);
      if (data.error) setError(data.error);
    } catch {
      setError('Prediction failed');
    }

    setPredicting(false);
  }, [selected]);

  const signalCfg = prediction ? SIGNAL_CONFIG[prediction.signal] || SIGNAL_CONFIG.HOLD : null;
  const SignalIcon = signalCfg?.icon || Minus;

  return (
    <div className="min-h-screen px-4 py-6">
      {/* ── Header ── */}
      <div className="mb-8 text-center">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-[10px] font-medium uppercase tracking-widest text-slate-500">
          <Activity className="h-3 w-3" />
          Stock AI Predictor
        </div>
        <h1 className="text-2xl font-bold text-white">Signal Predictor</h1>
        <p className="mt-1 text-sm text-slate-400">
          Select a Nifty 50 stock to analyze fundamentals and predict the trading signal
        </p>
      </div>

      {/* ── Stock Search ── */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Select Stock</h2>
          {selected && !loadingFeatures && (
            <button
              onClick={() => { setSearchQuery(displayName(selected)); selectStock(selected); }}
              className="flex items-center gap-1 text-[10px] text-slate-500 transition hover:text-cyan-400"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          )}
        </div>
        <div className="relative" ref={searchRef}>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
            onFocus={() => { if (filteredStocks.length > 0) setShowDropdown(true); }}
            placeholder="Search stock (e.g. RELIANCE, TCS, HDFC)..."
            className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/30"
          />
          {showDropdown && (
            <div className="absolute left-0 top-full z-50 mt-1.5 w-full rounded-xl border border-white/[0.08] bg-[#0f1729] p-1 shadow-2xl shadow-black/60">
              {filteredStocks.length === 0 ? (
                <div className="px-4 py-3 text-center text-xs text-slate-500">No stocks found</div>
              ) : (
                filteredStocks.map((s) => {
                  const isActive = selected === s;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        setSearchQuery(displayName(s));
                        setShowDropdown(false);
                        selectStock(s);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-sm transition ${
                        isActive ? 'bg-cyan-500/10 text-cyan-300' : 'text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isActive ? 'bg-cyan-500/15 ring-1 ring-cyan-400/30' : 'bg-white/[0.04]'
                      }`}>
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <span className="font-medium">{s.replace('.NS', '')}</span>
                      <span className="ml-auto text-[10px] text-slate-600">NSE</span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mb-6 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {/* ── Content area ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: Features ── */}
        <div>
          {!selected && (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.06] text-slate-600">
              <BarChart3 className="mb-3 h-10 w-10" />
              <p className="text-sm">Select a stock to analyze its fundamentals</p>
            </div>
          )}

          {selected && loadingFeatures && (
            <div className="flex h-64 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                <p className="text-xs text-slate-500">Fetching {displayName(selected)} fundamentals...</p>
              </div>
            </div>
          )}

          {selected && !loadingFeatures && features && (
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">
                  {displayName(selected)} Fundamentals
                </h3>
                <span className="rounded bg-white/[0.04] px-2 py-1 text-[10px] font-mono text-slate-500">
                  {selected}
                </span>
              </div>

              <div className="space-y-3">
                {FEATURE_META.map(({ key, label, suffix }) => {
                  const val = features[key];
                  const isScore = key.includes('score');
                  const barW = isScore ? Math.max(0, Math.min(100, val)) : 0;
                  const isGood = isScore ? val >= 50 : true;
                  return (
                    <div key={key}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-slate-400">{label}</span>
                        <span className="font-mono text-slate-200">
                          {val}{suffix}
                        </span>
                      </div>
                      {isScore && (
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isGood ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${barW}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {!prediction && !predicting && (
                <div className="mt-5 text-center">
                  <button
                    onClick={predictSignal}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500"
                  >
                    <Sparkles className="h-4 w-4" />
                    Predict Trading Signal
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Result ── */}
        <div>
          {predicting && (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-cyan-400" />
              <p className="text-sm text-slate-400">Running AI prediction model...</p>
            </div>
          )}

          {prediction && signalCfg && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-500">
              <div className={`rounded-2xl border ${signalCfg.border} ${signalCfg.bg} p-6 backdrop-blur`}>
                <div className="mb-4 text-center">
                  <div className="mb-1 text-[10px] font-medium uppercase tracking-widest text-slate-500">
                    AI Signal for {displayName(selected!)}
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 ${signalCfg.bg} ${signalCfg.color}`}>
                    <SignalIcon className="h-4 w-4" />
                    <span className="text-lg font-bold">{signalCfg.label}</span>
                  </div>
                </div>

                <div className="mb-4 text-center">
                  <div className="text-3xl font-bold text-white">
                    {(prediction.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-500">Confidence</div>
                </div>

                {prediction.probabilities && (
                  <div className="space-y-2">
                    {(['BUY', 'HOLD', 'SELL'] as const).map((s) => {
                      const cfg = SIGNAL_CONFIG[s];
                      const prob = prediction.probabilities[s] || 0;
                      const Icon = cfg.icon;
                      return (
                        <div key={s} className="flex items-center gap-3">
                          <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                          <span className={`w-10 text-xs font-medium ${cfg.color}`}>{s}</span>
                          <div className="flex-1">
                            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  s === 'BUY' ? 'bg-emerald-500' : s === 'SELL' ? 'bg-rose-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${prob * 100}%` }}
                              />
                            </div>
                          </div>
                          <span className="w-12 text-right font-mono text-xs text-slate-400">
                            {(prob * 100).toFixed(0)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-600">
                  <Sparkles className="h-3 w-3" />
                  Powered by Stock AI Model
                  {prediction.model && (
                    <span className="rounded bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px]">
                      {prediction.model}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={predictSignal}
                disabled={predicting}
                className="mt-3 w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-2.5 text-xs text-slate-400 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
              >
                {predicting ? (
                  <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Re-run Prediction'
                )}
              </button>
            </div>
          )}

          {selected && !loadingFeatures && !predicting && !prediction && features && !error && (
            <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.06] text-slate-600">
              <Zap className="mb-3 h-8 w-8" />
              <p className="text-sm">Click Predict Signal to see the result</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
