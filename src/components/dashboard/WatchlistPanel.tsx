'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Loader2, Star,
  TrendingUp, TrendingDown, Wallet, BarChart3, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import StockSearchInput from './StockSearchInput';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface WatchlistItem {
  id: number;
  symbol: string;
  exchange: string;
  notes: string;
  created_at: string;
  current_price: number;
  change: number;
  change_percent: number;
}

interface FormData {
  symbol: string;
  exchange: string;
  notes: string;
}

const EMPTY_FORM: FormData = { symbol: '', exchange: 'NSE', notes: '' };

const PER_PAGE = 12;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmt(n: number): string {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(n);
}

function fmtCurrency(n: number): string {
  return n >= 0 ? `₹${fmt(n)}` : `-₹${fmt(Math.abs(n))}`;
}

function fmtPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${fmt(n)}%`;
}

/* ------------------------------------------------------------------ */
/*  Summary Card                                                       */
/* ------------------------------------------------------------------ */

function SummaryCard({ title, value, sub, icon: Icon, color, loading }: {
  title: string; value: string; sub?: string; icon: any; color: string; loading?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:bg-white/[0.04]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{title}</span>
        <div className={`rounded-lg p-1.5 ${color}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
      </div>
      {loading ? (
        <div className="h-6 w-24 animate-pulse rounded bg-white/[0.06]" />
      ) : (
        <>
          <p className="text-lg font-bold text-white">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add / Edit Modal                                                   */
/* ------------------------------------------------------------------ */

function ItemModal({ open, onClose, onSubmit, formData, setFormData, editing, loading }: {
  open: boolean;
  onClose: () => void;
  onSubmit: () => void;
  formData: FormData;
  setFormData: (d: FormData) => void;
  editing: boolean;
  loading: boolean;
}) {
  useEffect(() => {
    if (open) {
      const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
      document.addEventListener('keydown', handler);
      return () => document.removeEventListener('keydown', handler);
    }
  }, [open, onClose]);

  if (!open) return null;

  const valid = formData.symbol.trim();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/[0.08] bg-[#0b1120] p-6 shadow-2xl shadow-black/60">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit Watchlist Item' : 'Add to Watchlist'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Stock Symbol *</label>
            <StockSearchInput
              value={formData.symbol}
              onChange={val => setFormData({ ...formData, symbol: val })}
              onSelect={val => setFormData({ ...formData, symbol: val })}
              placeholder="Start typing a stock name..."
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Exchange</label>
            <select
              value={formData.exchange}
              onChange={e => setFormData({ ...formData, exchange: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white outline-none transition focus:border-emerald-500/30"
            >
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Notes <span className="text-slate-600">(optional)</span></label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Why are you watching this stock?"
              rows={2}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500/30"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.08]"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!valid || loading}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-sm font-semibold text-white transition hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Add to Watchlist'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Panel                                                              */
/* ------------------------------------------------------------------ */

export default function WatchlistPanel() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/watchlist');
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const filtered = items.filter(i => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return i.symbol.toLowerCase().includes(q)
      || i.notes.toLowerCase().includes(q)
      || i.exchange.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const gainers = items.filter(i => i.change > 0);
  const losers = items.filter(i => i.change < 0);
  const bestPerformer = items.length > 0
    ? items.reduce((best, i) => (i.change_percent > best.change_percent ? i : best), items[0])
    : null;
  const worstPerformer = items.length > 0
    ? items.reduce((worst, i) => (i.change_percent < worst.change_percent ? i : worst), items[0])
    : null;

  /* ── CRUD handlers ── */

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setEditing(false);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (item: WatchlistItem) => {
    setFormData({
      symbol: item.symbol,
      exchange: item.exchange,
      notes: item.notes,
    });
    setEditing(true);
    setEditId(item.id);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.symbol.trim()) return;
    setSubmitting(true);
    try {
      if (editing && editId) {
        await fetch(`/api/watchlist/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: formData.symbol,
            exchange: formData.exchange,
            notes: formData.notes,
          }),
        });
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol: formData.symbol,
            exchange: formData.exchange,
            notes: formData.notes,
          }),
        });
      }
      setModalOpen(false);
      fetchItems();
    } catch {}
    setSubmitting(false);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await fetch(`/api/watchlist/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      fetchItems();
    } catch {}
  };

  return (
    <>
      {/* ── Summary cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          title="Total Tracked"
          value={String(items.length)}
          sub={items.length === 1 ? '1 stock' : `${items.length} stocks`}
          icon={Star}
          color="bg-emerald-500/15 text-emerald-400"
          loading={loading}
        />
        <SummaryCard
          title="Gainers"
          value={String(gainers.length)}
          sub={gainers.length > 0 && bestPerformer ? `Best: ${bestPerformer.symbol} (${fmtPct(bestPerformer.change_percent)})` : ''}
          icon={TrendingUp}
          color="bg-emerald-500/15 text-emerald-400"
          loading={loading}
        />
        <SummaryCard
          title="Losers"
          value={String(losers.length)}
          sub={losers.length > 0 && worstPerformer ? `Worst: ${worstPerformer.symbol} (${fmtPct(worstPerformer.change_percent)})` : ''}
          icon={TrendingDown}
          color="bg-rose-500/15 text-rose-400"
          loading={loading}
        />
        <SummaryCard
          title="Market View"
          value={gainers.length >= losers.length ? 'Bullish' : 'Bearish'}
          sub={`${gainers.length} up · ${losers.length} down · ${items.length - gainers.length - losers.length} flat`}
          icon={BarChart3}
          color={gainers.length >= losers.length ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}
          loading={loading}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Filter by symbol, notes..."
            className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-emerald-500/30"
          />
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-500"
        >
          <Plus className="h-4 w-4" />
          Add Stock
        </button>
      </div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
        </div>
      ) : paged.length === 0 ? (
        <div className="rounded-xl border border-white/[0.06] py-20 text-center">
          <Star className="mx-auto mb-3 h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-500">
            {search ? 'No items match your search.' : 'Your watchlist is empty. Click "Add Stock" to start tracking.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {paged.map(item => (
            <div
              key={item.id}
              className="group rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/[0.12] hover:bg-white/[0.04]"
            >
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-white">{item.symbol}</p>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{item.exchange}</p>
                </div>
                <div className="flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(item)}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-emerald-400"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-rose-400"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {item.current_price > 0 ? (
                <>
                  <p className="text-2xl font-bold text-white">{fmtCurrency(item.current_price)}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className={`flex items-center gap-0.5 text-sm font-semibold ${
                      item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {item.change >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                      {fmtCurrency(item.change)}
                    </span>
                    <span className={`text-xs font-medium ${
                      item.change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      ({fmtPct(item.change_percent)})
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500">Price unavailable</p>
              )}

              {item.notes && (
                <p className="mt-3 text-xs text-slate-500 line-clamp-2">{item.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && !loading && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {Math.min(filtered.length, PER_PAGE)} of {filtered.length}</span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`min-w-[28px] rounded-lg px-2 py-1 text-center transition ${
                  p === safePage
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'text-slate-500 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Add/Edit Modal ── */}
      <ItemModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        formData={formData}
        setFormData={setFormData}
        editing={editing}
        loading={submitting}
      />

      {/* ── Delete Confirmation ── */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] bg-[#0b1120] p-6 shadow-2xl shadow-black/60">
            <h3 className="mb-2 text-lg font-semibold text-white">Remove from Watchlist</h3>
            <p className="mb-6 text-sm text-slate-400">Are you sure you want to remove this stock from your watchlist?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 text-sm text-slate-300 transition hover:bg-white/[0.08]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
