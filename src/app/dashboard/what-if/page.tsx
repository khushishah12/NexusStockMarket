'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Calculator, TrendingUp, TrendingDown, Minus, CalendarDays,
  IndianRupee, Loader2, RefreshCw, AlertTriangle, Info,
  BarChart3, ArrowRight, Clock,
} from 'lucide-react';
import StockSearchInput from '@/components/dashboard/StockSearchInput';

interface DataPoint {
  date: string;
  portfolio: number;
  benchmark: number;
}

interface Summary {
  totalInvested: number;
  finalValue: number;
  absoluteReturn: number;
  percentReturn: number;
  cagr: number;
  benchmarkValue: number;
  benchmarkReturn: number;
  alpha: number;
}

interface Result {
  symbol: string;
  company: string;
  amount: number;
  startDate: string;
  endDate: string;
  mode: 'lumpsum' | 'sip';
  currentPrice: number;
  summary: Summary;
  dataPoints: DataPoint[];
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function fmtCurrency(n: number): string {
  if (Math.abs(n) >= 1e7) return `₹${fmt(n / 1e7)}Cr`;
  if (Math.abs(n) >= 1e5) return `₹${fmt(n / 1e5)}L`;
  return `₹${fmt(n)}`;
}

function fmtPercent(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmt(n)}%`;
}

function formatDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function GrowthChart({ dataPoints, width = 700, height = 320 }: { dataPoints: DataPoint[]; width?: number; height?: number }) {
  if (dataPoints.length < 2) return null;

  const pad = { top: 20, right: 20, bottom: 40, left: 60 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const allValues = dataPoints.flatMap(d => [d.portfolio, d.benchmark]);
  const minVal = Math.min(...allValues) * 0.95;
  const maxVal = Math.max(...allValues) * 1.05;
  const range = maxVal - minVal || 1;

  const xScale = (i: number) => pad.left + (i / (dataPoints.length - 1)) * plotW;
  const yScale = (v: number) => pad.top + plotH - ((v - minVal) / range) * plotH;

  const portfolioLine = dataPoints.map((d, i) => `${xScale(i)},${yScale(d.portfolio)}`).join(' ');
  const benchmarkLine = dataPoints.map((d, i) => `${xScale(i)},${yScale(d.benchmark)}`).join(' ');

  const yTicks = 5;
  const yStep = range / yTicks;
  const yLabels: number[] = [];
  for (let i = 0; i <= yTicks; i++) {
    yLabels.push(minVal + yStep * i);
  }

  const xLabelCount = Math.min(dataPoints.length, 8);
  const xStep = Math.max(1, Math.floor((dataPoints.length - 1) / (xLabelCount - 1)));

  const lastPortfolio = dataPoints[dataPoints.length - 1].portfolio;
  const lastBenchmark = dataPoints[dataPoints.length - 1].benchmark;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
        </linearGradient>
        <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <rect x={pad.left} y={pad.top} width={plotW} height={plotH} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" rx="4" />

      {yLabels.map((v) => (
        <g key={v}>
          <line x1={pad.left} y1={yScale(v)} x2={pad.left + plotW} y2={yScale(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          <text x={pad.left - 8} y={yScale(v) + 4} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="11">
            {fmtCurrency(v)}
          </text>
        </g>
      ))}

      {dataPoints.filter((_, i) => i % xStep === 0 || i === dataPoints.length - 1).map((d, idx) => {
        const i = dataPoints.indexOf(d);
        return (
          <text key={d.date} x={xScale(i)} y={height - 8} textAnchor={idx === 0 ? 'start' : idx === Math.floor(dataPoints.length / xStep) ? 'middle' : 'end'} fill="rgba(255,255,255,0.35)" fontSize="10">
            {d.date.slice(0, 7)}
          </text>
        );
      })}

      <polyline points={benchmarkLine} fill="none" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="6,3" opacity="0.7" />
      <polyline points={portfolioLine} fill="none" stroke="#22d3ee" strokeWidth="2.5" />

      <polygon points={`${portfolioLine} ${xScale(dataPoints.length - 1)},${pad.top + plotH} ${xScale(0)},${pad.top + plotH}`} fill="url(#portfolioGrad)" />
      <polygon points={`${benchmarkLine} ${xScale(dataPoints.length - 1)},${pad.top + plotH} ${xScale(0)},${pad.top + plotH}`} fill="url(#benchGrad)" />

      <circle cx={xScale(dataPoints.length - 1)} cy={yScale(lastPortfolio)} r="4" fill="#22d3ee" stroke="#030308" strokeWidth="2" />
      <circle cx={xScale(dataPoints.length - 1)} cy={yScale(lastBenchmark)} r="3" fill="#a78bfa" stroke="#030308" strokeWidth="2" />

      <text x={pad.left + plotW / 2} y={height - 2} textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="10">
        Time (Year-Month)
      </text>

      <g transform={`translate(${pad.left + 8}, ${pad.top + 8})`}>
        <line x1="0" y1="0" x2="14" y2="0" stroke="#22d3ee" strokeWidth="2.5" />
        <text x="20" y="4" fill="rgba(255,255,255,0.6)" fontSize="11">Portfolio</text>
        <line x1="90" y1="0" x2="104" y2="0" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="4,2" />
        <text x="110" y="4" fill="rgba(255,255,255,0.6)" fontSize="11">NIFTY 50</text>
      </g>
    </svg>
  );
}

export default function WhatIfPage() {
  const [symbol, setSymbol] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 3);
    return formatDateInput(d);
  });
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));
  const [mode, setMode] = useState<'lumpsum' | 'sip'>('lumpsum');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const calculate = useCallback(async () => {
    if (!symbol) { setError('Please select a stock'); return; }
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { setError('Enter a valid amount'); return; }
    if (!startDate) { setError('Select a start date'); return; }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/stocks/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          amount: amt,
          startDate,
          endDate: endDate || undefined,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Calculation failed');
      } else {
        setResult(data);
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [symbol, amount, startDate, endDate, mode]);

  const summaryCards = result ? [
    { label: 'Total Invested', value: fmtCurrency(result.summary.totalInvested), color: 'text-blue-400', icon: IndianRupee },
    { label: 'Final Value', value: fmtCurrency(result.summary.finalValue), color: result.summary.finalValue >= result.summary.totalInvested ? 'text-emerald-400' : 'text-rose-400', icon: BarChart3 },
    { label: 'Total Return', value: fmtCurrency(result.summary.absoluteReturn), sub: fmtPercent(result.summary.percentReturn), color: result.summary.percentReturn >= 0 ? 'text-emerald-400' : 'text-rose-400', icon: TrendingUp },
    { label: 'CAGR', value: `${result.summary.cagr >= 0 ? '+' : ''}${fmt(result.summary.cagr)}%`, color: result.summary.cagr >= 0 ? 'text-emerald-400' : 'text-rose-400', icon: TrendingUp },
  ] : [];

  return (
    <div className="min-h-screen p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <Calculator className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">What-If Calculator</h1>
          <p className="text-sm text-white/50">See how past investments would have performed</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-5 bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">Investment Details</h2>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Stock</label>
            <StockSearchInput
              value={symbol}
              onChange={setSymbol}
              onSelect={(sym) => setSymbol(sym)}
              placeholder="Search NSE/BSE stocks..."
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Investment Amount (₹)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">₹</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={mode === 'sip' ? 'Monthly investment amount' : 'One-time investment amount'}
                className="w-full bg-black/40 border border-white/[0.08] rounded-lg pl-8 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/30 transition-colors"
              />
            </div>
            {mode === 'sip' && startDate && endDate && parseFloat(amount) > 0 && (
              <p className="text-xs text-white/40 mt-1">
                ₹{fmt(parseFloat(amount))} invested monthly from {startDate} to {endDate}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Start Date</label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={endDate}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-lg pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/30 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">End Date</label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  max={formatDateInput(new Date())}
                  className="w-full bg-black/40 border border-white/[0.08] rounded-lg pl-10 pr-3 py-2.5 text-white text-sm focus:outline-none focus:border-cyan-500/30 transition-colors"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Investment Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('lumpsum')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'lumpsum'
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                    : 'bg-white/[0.03] border border-white/[0.08] text-white/50 hover:border-white/20'
                }`}
              >
                Lump Sum
              </button>
              <button
                onClick={() => setMode('sip')}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  mode === 'sip'
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-300'
                    : 'bg-white/[0.03] border border-white/[0.08] text-white/50 hover:border-white/20'
                }`}
              >
                SIP (Monthly)
              </button>
            </div>
          </div>

          <button
            onClick={calculate}
            disabled={loading || !symbol || !amount}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-white font-medium hover:from-cyan-500/30 hover:to-violet-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</>
            ) : (
              <><Calculator className="w-4 h-4" /> Calculate</>
            )}
          </button>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
              <p className="text-sm text-rose-300">{error}</p>
            </div>
          )}
        </div>

        {result && (
          <div ref={resultRef} className="space-y-5 bg-white/[0.03] border border-white/[0.08] rounded-xl p-5">
            <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
              {result.company} ({result.symbol})
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {summaryCards.map((card) => (
                <div key={card.label} className="bg-black/30 rounded-lg p-3 border border-white/[0.06]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
                    <span className="text-[11px] text-white/40 uppercase tracking-wider">{card.label}</span>
                  </div>
                  <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
                  {card.sub && <p className={`text-xs ${card.color} opacity-80`}>{card.sub}</p>}
                </div>
              ))}
            </div>

            <div className="bg-black/30 rounded-lg p-3 border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-white/50 uppercase tracking-wider">Growth vs NIFTY 50</span>
              </div>
              <GrowthChart dataPoints={result.dataPoints} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 rounded-lg p-3 border border-white/[0.06]">
                <span className="text-[11px] text-white/40 uppercase tracking-wider">NIFTY 50 Return</span>
                <p className={`text-base font-bold mt-1 ${result.summary.benchmarkReturn >= 0 ? 'text-violet-400' : 'text-rose-400'}`}>
                  {fmtPercent(result.summary.benchmarkReturn)}
                </p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 border border-white/[0.06]">
                <span className="text-[11px] text-white/40 uppercase tracking-wider">Alpha (vs NIFTY 50)</span>
                <p className={`text-base font-bold mt-1 ${result.summary.alpha >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fmtPercent(result.summary.alpha)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
              <Info className="w-4 h-4 text-cyan-400 shrink-0" />
              <p className="text-xs text-white/50">
                {result.mode === 'sip'
                  ? `SIP of ₹${fmt(parseFloat(amount))}/month from ${result.startDate} to ${result.endDate}.`
                  : `Lump sum investment of ${fmtCurrency(result.summary.totalInvested)} on ${result.startDate}.`}
                {' '}Current price: ₹{fmt(result.currentPrice)}. Past performance is not indicative of future results.
              </p>
            </div>
          </div>
        )}
      </div>

      {!result && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calculator className="w-12 h-12 text-white/10 mb-4" />
          <p className="text-white/30 text-sm max-w-md">
            Select a stock, enter your investment amount and date, then click <span className="text-cyan-400">Calculate</span> to see how your investment would have grown.
          </p>
        </div>
      )}
    </div>
  );
}
