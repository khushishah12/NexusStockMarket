'use client';

import { useState } from 'react';
import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';
import GlassCard from '../../../components/dashboard/GlassCard';

const STOCKS = [
  { symbol: 'RELIANCE', exchange: 'NSE', sector: 'Energy', price: 2845.2, vol: '12.4M' },
  { symbol: 'TCS', exchange: 'NSE', sector: 'IT', price: 4120.5, vol: '8.1M' },
  { symbol: 'HDFCBANK', exchange: 'NSE', sector: 'Finance', price: 1689.3, vol: '15.2M' },
  { symbol: 'INFY', exchange: 'NSE', sector: 'IT', price: 1892.0, vol: '9.8M' },
  { symbol: 'SBIN', exchange: 'BSE', sector: 'Finance', price: 812.4, vol: '22.1M' },
  { symbol: 'TATASTEEL', exchange: 'BSE', sector: 'Metals', price: 156.8, vol: '18.6M' },
];

export default function MarketsPage() {
  const [exchange, setExchange] = useState<'ALL' | 'NSE' | 'BSE'>('ALL');
  const [sector, setSector] = useState('ALL');

  const filtered = STOCKS.filter((s) => {
    if (exchange !== 'ALL' && s.exchange !== exchange) return false;
    if (sector !== 'ALL' && s.sector !== sector) return false;
    return true;
  });

  return (
    <PageTransition>
      <PageHeader
        tag="Markets"
        title="NSE / BSE Stocks"
        subtitle="Browse listings with sector, volume, and price filters."
      />

      <GlassCard className="mb-6" accent="bullish">
        <div className="flex flex-wrap gap-4">
          <label className="text-sm text-slate-400">
            Exchange
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value as typeof exchange)}
              className="ml-2 rounded border border-white/10 bg-black/40 px-3 py-1.5 text-white"
            >
              <option value="ALL">All</option>
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </label>
          <label className="text-sm text-slate-400">
            Sector
            <select
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="ml-2 rounded border border-white/10 bg-black/40 px-3 py-1.5 text-white"
            >
              <option value="ALL">All</option>
              <option value="IT">IT</option>
              <option value="Finance">Finance</option>
              <option value="Energy">Energy</option>
              <option value="Metals">Metals</option>
            </select>
          </label>
        </div>
      </GlassCard>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Exchange</th>
              <th className="px-4 py-3">Sector</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Volume</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.symbol} className="border-t border-white/5 hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-semibold text-white">{row.symbol}</td>
                <td className="px-4 py-3 text-cyan-400">{row.exchange}</td>
                <td className="px-4 py-3 text-slate-400">{row.sector}</td>
                <td className="px-4 py-3">₹{row.price.toLocaleString()}</td>
                <td className="px-4 py-3 text-slate-500">{row.vol}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageTransition>
  );
}
