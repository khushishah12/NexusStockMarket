'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Pencil, Trash2, X, Loader2,
  IndianRupee, TrendingUp, TrendingDown, Wallet,
  PieChart, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import PageTransition from '../../../components/dashboard/PageTransition';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Holding {
  id: number;
  stock_symbol: string;
  quantity: number;
  buy_price: number;
  buy_date: string;
  notes: string;
  current_price: number;
  invested_amount: number;
  current_value: number;
  profit_loss: number;
  profit_loss_percentage: number;
  exchange: string;
}

interface FormData {
  stock_symbol: string;
  quantity: string;
  buy_price: string;
  buy_date: string;
  notes: string;
}

const EMPTY_FORM: FormData = { stock_symbol: '', quantity: '', buy_price: '', buy_date: '', notes: '' };

const PER_PAGE = 10;

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
/*  Modal                                                              */
/* ------------------------------------------------------------------ */

function Modal({ open, onClose, onSubmit, formData, setFormData, editing, loading }: {
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

  const valid = formData.stock_symbol.trim() && Number(formData.quantity) > 0
    && Number(formData.buy_price) > 0 && formData.buy_date;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-[#0b1120] p-6 shadow-2xl shadow-black/60">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{editing ? 'Edit Holding' : 'Add Stock'}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Stock Symbol *</label>
            <input
              type="text"
              value={formData.stock_symbol}
              onChange={e => setFormData({ ...formData, stock_symbol: e.target.value.toUpperCase() })}
              placeholder="e.g. RELIANCE, TCS"
              className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Quantity *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="10"
                min="0"
                step="any"
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-slate-400">Buy Price (₹) *</label>
              <input
                type="number"
                value={formData.buy_price}
                onChange={e => setFormData({ ...formData, buy_price: e.target.value })}
                placeholder="2500.00"
                min="0"
                step="any"
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Buy Date *</label>
            <input
              type="date"
              value={formData.buy_date}
              onChange={e => setFormData({ ...formData, buy_date: e.target.value })}
              className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-500/30 [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">Notes <span className="text-slate-600">(optional)</span></label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any notes about this purchase..."
              rows={2}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-black/40 px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-cyan-500/30"
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
            className="flex-1 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-semibold text-white transition hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : editing ? 'Update' : 'Add to Portfolio'}
          </button>
        </div>
      </div>
    </div>
  );
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PortfolioPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchHoldings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/portfolio');
      if (!res.ok) return;
      const data = await res.json();
      setHoldings(data.holdings || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchHoldings(); }, [fetchHoldings]);

  const filtered = holdings.filter(h => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return h.stock_symbol.toLowerCase().includes(q)
      || h.notes.toLowerCase().includes(q)
      || h.exchange.toLowerCase().includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const totals = holdings.reduce((acc, h) => ({
    invested: acc.invested + h.invested_amount,
    currentValue: acc.currentValue + h.current_value,
    pl: acc.pl + h.profit_loss,
  }), { invested: 0, currentValue: 0, pl: 0 });
  const overallPlPct = totals.invested > 0 ? (totals.pl / totals.invested) * 100 : 0;

  /* ── CRUD handlers ── */

  const openAdd = () => {
    setFormData(EMPTY_FORM);
    setEditing(false);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = (h: Holding) => {
    setFormData({
      stock_symbol: h.stock_symbol,
      quantity: String(h.quantity),
      buy_price: String(h.buy_price),
      buy_date: h.buy_date,
      notes: h.notes,
    });
    setEditing(true);
    setEditId(h.id);
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.stock_symbol.trim() || !Number(formData.quantity) || !Number(formData.buy_price) || !formData.buy_date) return;
    setSubmitting(true);
    try {
      if (editing && editId) {
        await fetch(`/api/portfolio/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock_symbol: formData.stock_symbol,
            quantity: Number(formData.quantity),
            buy_price: Number(formData.buy_price),
            buy_date: formData.buy_date,
            notes: formData.notes,
          }),
        });
      } else {
        await fetch('/api/portfolio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            stock_symbol: formData.stock_symbol,
            quantity: Number(formData.quantity),
            buy_price: Number(formData.buy_price),
            buy_date: formData.buy_date,
            notes: formData.notes,
          }),
        });
      }
      setModalOpen(false);
      fetchHoldings();
    } catch {}
    setSubmitting(false);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      await fetch(`/api/portfolio/${deleteId}`, { method: 'DELETE' });
      setDeleteId(null);
      fetchHoldings();
    } catch {}
  };

  return (
    <PageTransition>
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-slate-500">Portfolio</p>
          <h1 className="text-xl font-bold text-white">My Holdings</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-blue-500"
        >
          <Plus className="h-4 w-4" />
          Add Stock
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard
          title="Total Invested"
          value={fmtCurrency(totals.invested)}
          icon={Wallet}
          color="bg-blue-500/15 text-blue-400"
          loading={loading}
        />
        <SummaryCard
          title="Current Value"
          value={fmtCurrency(totals.currentValue)}
          icon={PieChart}
          color="bg-violet-500/15 text-violet-400"
          loading={loading}
        />
        <SummaryCard
          title="Total Profit / Loss"
          value={fmtCurrency(totals.pl)}
          sub={totals.pl >= 0 ? '📈 Profit' : '📉 Loss'}
          icon={totals.pl >= 0 ? TrendingUp : TrendingDown}
          color={totals.pl >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}
          loading={loading}
        />
        <SummaryCard
          title="Overall Return"
          value={fmtPct(overallPlPct)}
          sub={`₹${fmt(totals.pl)} total`}
          icon={IndianRupee}
          color={overallPlPct >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}
          loading={loading}
        />
      </div>

      {/* ── Search ── */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Filter by symbol..."
            className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/30"
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[10px] font-medium uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Symbol</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Buy Price</th>
              <th className="px-4 py-3">Buy Date</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Invested</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">P/L</th>
              <th className="px-4 py-3">P/L %</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-slate-500">
                  <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-cyan-400" />
                  Loading holdings...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-16 text-center text-slate-500">
                  {search ? 'No holdings match your search.' : 'No holdings yet. Click "Add Stock" to get started.'}
                </td>
              </tr>
            ) : paged.map(h => (
              <tr key={h.id} className="border-b border-white/[0.04] transition hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <span className="font-semibold text-white">{h.stock_symbol}</span>
                  <span className="ml-2 text-[10px] text-slate-600">{h.exchange}</span>
                </td>
                <td className="px-4 py-3 text-slate-300">{fmt(h.quantity)}</td>
                <td className="px-4 py-3 text-slate-300">{fmtCurrency(h.buy_price)}</td>
                <td className="px-4 py-3 text-slate-400">{h.buy_date}</td>
                <td className="px-4 py-3 text-slate-300">{h.current_price ? fmtCurrency(h.current_price) : '—'}</td>
                <td className="px-4 py-3 text-slate-300">{fmtCurrency(h.invested_amount)}</td>
                <td className="px-4 py-3 text-slate-300">{fmtCurrency(h.current_value)}</td>
                <td className={`px-4 py-3 font-medium ${h.profit_loss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  <span className="flex items-center gap-1">
                    {h.profit_loss >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {fmtCurrency(h.profit_loss)}
                  </span>
                </td>
                <td className={`px-4 py-3 font-medium ${h.profit_loss_percentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {fmtPct(h.profit_loss_percentage)}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(h)}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-cyan-400"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(h.id)}
                      className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/[0.06] hover:text-rose-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                    ? 'bg-cyan-500/15 text-cyan-300'
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
      <Modal
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
            <h3 className="mb-2 text-lg font-semibold text-white">Delete Holding</h3>
            <p className="mb-6 text-sm text-slate-400">Are you sure you want to delete this holding? This action cannot be undone.</p>
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
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
