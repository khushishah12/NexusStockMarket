'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '../../lib/supabase/client';
import GlassCard from './GlassCard';
import { Plus, Trash2, Loader2 } from 'lucide-react';

interface WatchlistItem {
  id: string;
  symbol: string;
  exchange: 'NSE' | 'BSE';
  notes: string | null;
}

export default function WatchlistPanel() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState<'NSE' | 'BSE'>('NSE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from('watchlist_items')
      .select('id, symbol, exchange, notes')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setItems([]);
    } else {
      setItems((data as WatchlistItem[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol.trim()) return;
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setError('You must be logged in.');
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from('watchlist_items').insert({
      user_id: userData.user.id,
      symbol: symbol.trim().toUpperCase(),
      exchange,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSymbol('');
    load();
  };

  const removeItem = async (id: string) => {
    const supabase = createClient();
    await supabase.from('watchlist_items').delete().eq('id', id);
    load();
  };

  return (
    <>
      <GlassCard accent="bullish" className="mb-6">
        <form onSubmit={addItem} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-xs text-slate-500">
            Symbol
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              placeholder="RELIANCE"
              className="mt-1 rounded border border-white/10 bg-black/40 px-3 py-2 text-white uppercase"
              required
            />
          </label>
          <label className="flex flex-col text-xs text-slate-500">
            Exchange
            <select
              value={exchange}
              onChange={(e) => setExchange(e.target.value as 'NSE' | 'BSE')}
              className="mt-1 rounded border border-white/10 bg-black/40 px-3 py-2 text-white"
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add to watchlist
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-rose-400">{error}</p>}
      </GlassCard>

      {loading ? (
        <p className="text-slate-500">Loading watchlist…</p>
      ) : items.length === 0 ? (
        <GlassCard accent="neutral">
          <p className="text-slate-400">No saved stocks yet. Add symbols above — they persist in Supabase.</p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <GlassCard key={item.id} accent="bullish">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{item.symbol}</p>
                  <p className="text-xs text-cyan-400">{item.exchange}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="rounded p-1 text-slate-500 transition hover:bg-rose-500/20 hover:text-rose-400"
                  aria-label="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="mt-3 text-sm font-semibold text-emerald-400">+1.24%</p>
              <p className="text-xs text-slate-500">Mock intraday change</p>
            </GlassCard>
          ))}
        </div>
      )}
    </>
  );
}
