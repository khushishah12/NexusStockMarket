'use client';

import { useState, useEffect } from 'react';
import PageTransition from '../../../components/dashboard/PageTransition';
import PageHeader from '../../../components/dashboard/PageHeader';
import GlassCard from '../../../components/dashboard/GlassCard';

// Types for stock data
interface Stock {
  symbol: string;
  company_name: string;
  exchange: string;
  sector: string;
  price?: number; // live price will be filled later
  vol?: string; // live volume placeholder
}

export default function MarketsPage() {
  const [exchange, setExchange] = useState<'ALL' | 'NSE' | 'BSE'>('ALL');
  const [sector, setSector] = useState('ALL');
  const [stocks, setStocks] = useState<Stock[]>([]);

  // Dummy static data for markets page (no external API)
  const dummyStocks: Stock[] = [
    { symbol: "RELIANCE", company_name: "Reliance Industries Ltd.", exchange: "NSE", sector: "Energy", price: 2500, vol: "1.2M" },
    { symbol: "TCS", company_name: "Tata Consultancy Services", exchange: "NSE", sector: "IT", price: 3400, vol: "800K" },
    { symbol: "HDFCBANK", company_name: "HDFC Bank Ltd.", exchange: "NSE", sector: "Finance", price: 1500, vol: "1.5M" },
    { symbol: "INFY", company_name: "Infosys Ltd.", exchange: "NSE", sector: "IT", price: 1800, vol: "600K" },
    { symbol: "SBIN", company_name: "State Bank of India", exchange: "NSE", sector: "Finance", price: 600, vol: "2.3M" }
  ];

  useEffect(() => {
    // Populate with dummy data on mount
    setStocks(dummyStocks);
  }, []);

  const filtered = stocks.filter((s) => {
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
