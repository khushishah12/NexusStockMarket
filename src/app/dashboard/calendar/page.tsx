'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, CalendarDays, Table2, ArrowUpRight, ArrowDownRight,
  Loader2, RefreshCw, ChevronLeft, ChevronRight,
  Filter, X, Building2, Clock,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface EarningsEvent {
  id: number;
  symbol: string;
  company_name: string;
  exchange: string;
  event_date: string;
  event_time: string;
  event_type: string;
  sector: string;
  quarter: string;
  fiscal_year: number;
  description: string;
  source: string;
}

type SortField = 'event_date' | 'company_name';
type ViewMode = 'table' | 'calendar';

const EVENT_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  quarterly_results: { label: 'Results', bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
  earnings: { label: 'Earnings', bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  guidance: { label: 'Guidance', bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
  dividend: { label: 'Dividend', bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400' },
};

const TIME_LABELS: Record<string, string> = {
  before_open: 'Before Market',
  after_close: 'After Market',
  not_specified: '—',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDate(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtShort(d: string): string {
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function dayOfWeek(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
}

function isToday(d: string): boolean {
  const today = new Date();
  const dd = new Date(d + 'T00:00:00');
  return today.toDateString() === dd.toDateString();
}

function daysUntil(d: string): number {
  const diff = new Date(d + 'T00:00:00').getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function getMonthDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < first; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('table');
  const [search, setSearch] = useState('');
  const [filterExchange, setFilterExchange] = useState<string>('all');
  const [filterRange, setFilterRange] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('event_date');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchEvents = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const url = `/api/stocks/calendar${forceRefresh ? '?refresh=true' : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  /* ---- Filter + Sort ---- */
  const processed = useMemo(() => {
    let filtered = [...events];

    /* Search */
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(e =>
        e.company_name.toLowerCase().includes(q) ||
        e.symbol.toLowerCase().includes(q)
      );
    }

    /* Exchange filter */
    if (filterExchange !== 'all') {
      filtered = filtered.filter(e =>
        e.exchange?.toUpperCase() === filterExchange.toUpperCase()
      );
    }

    /* Range filter */
    if (filterRange === 'today') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(e => e.event_date === today);
    } else if (filterRange === 'week') {
      const end = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
      filtered = filtered.filter(e => e.event_date <= end);
    } else if (filterRange === 'month') {
      const end = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
      filtered = filtered.filter(e => e.event_date <= end);
    }

    /* Sort */
    filtered.sort((a, b) => {
      if (sortField === 'event_date') {
        return a.event_date.localeCompare(b.event_date);
      }
      return a.company_name.localeCompare(b.company_name);
    });

    return filtered;
  }, [events, search, filterExchange, filterRange, sortField]);

  /* ---- Calendar helpers ---- */
  const calendarEvents = useMemo(() => {
    const map = new Map<string, EarningsEvent[]>();
    for (const e of events) {
      const d = e.event_date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    return map;
  }, [events]);

  const days = useMemo(() => getMonthDays(calYear, calMonth), [calYear, calMonth]);

  /* ---- Summary stats ---- */
  const stats = useMemo(() => {
    const now = new Date().toISOString().split('T')[0];
    return {
      total: events.length,
      upcoming: events.filter(e => e.event_date >= now).length,
      thisWeek: events.filter(e => {
        const end = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
        return e.event_date >= now && e.event_date <= end;
      }).length,
      sectors: new Set(events.map(e => e.sector).filter(Boolean)).size,
    };
  }, [events]);

  return (
    <div className="flex h-full flex-col bg-[#0b1120]">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-6 py-4">
        <div>
          <h1 className="text-lg font-bold text-white">Earnings Calendar</h1>
          <p className="text-xs text-slate-500">
            {stats.upcoming} events upcoming · {stats.sectors} sectors
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-white/10 bg-black/30 p-0.5">
            <button
              onClick={() => setView('table')}
              className={`rounded-md px-2.5 py-1.5 text-xs transition ${
                view === 'table' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-white'
              }`}
            >
              <Table2 className="mr-1 inline-block h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`rounded-md px-2.5 py-1.5 text-xs transition ${
                view === 'calendar' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-500 hover:text-white'
              }`}
            >
              <CalendarDays className="mr-1 inline-block h-3.5 w-3.5" /> Calendar
            </button>
          </div>

          <button
            onClick={() => fetchEvents(true)}
            disabled={loading}
            className="rounded-lg border border-white/10 p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
            title="Refresh data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Filters bar ── */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/5 px-6 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => setSearch(e.target.value), 150);
            }}
            placeholder="Search by company or symbol..."
            className="w-full rounded-lg border border-white/10 bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <select
          value={filterRange}
          onChange={e => setFilterRange(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-300 outline-none transition focus:border-cyan-500/40"
        >
          <option value="all">All Dates</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">Next 30 Days</option>
        </select>

        <select
          value={filterExchange}
          onChange={e => setFilterExchange(e.target.value)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-300 outline-none transition focus:border-cyan-500/40"
        >
          <option value="all">All Exchanges</option>
          <option value="NSE">NSE</option>
          <option value="BSE">BSE</option>
        </select>

        <select
          value={sortField}
          onChange={e => setSortField(e.target.value as SortField)}
          className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs text-slate-300 outline-none transition focus:border-cyan-500/40"
        >
          <option value="event_date">Sort by Date</option>
          <option value="company_name">Sort by Name</option>
        </select>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading && events.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : view === 'table' ? (
          <TableView events={processed} />
        ) : (
          <CalendarView
            days={days}
            year={calYear}
            month={calMonth}
            events={calendarEvents}
            onPrev={() => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); }}
            onNext={() => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Table View                                                         */
/* ------------------------------------------------------------------ */

function TableView({ events }: { events: EarningsEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-slate-600">No events found matching your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/5 text-left text-xs font-medium text-slate-500">
            <th className="pb-3 pr-4">Date</th>
            <th className="pb-3 pr-4">Company</th>
            <th className="pb-3 pr-4">Symbol</th>
            <th className="pb-3 pr-4">Exchange</th>
            <th className="pb-3 pr-4">Event</th>
            <th className="pb-3 pr-4">Quarter</th>
            <th className="pb-3 pr-4">Time</th>
            <th className="pb-3">Sector</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const es = EVENT_STYLES[e.event_type] || EVENT_STYLES.quarterly_results;
            const du = daysUntil(e.event_date);
            return (
              <tr
                key={e.id}
                className={`border-b border-white/5 transition hover:bg-white/[0.02] ${isToday(e.event_date) ? 'bg-cyan-500/5' : ''}`}
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{fmtShort(e.event_date)}</span>
                    <span className="text-[10px] text-slate-500">{dayOfWeek(e.event_date)}</span>
                    {du === 0 && <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] text-cyan-300">Today</span>}
                    {du === 1 && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-300">Tomorrow</span>}
                  </div>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-sm font-medium text-white">{e.company_name}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="rounded bg-white/5 px-2 py-0.5 text-xs font-mono text-slate-300">{e.symbol}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-xs text-slate-400">{e.exchange}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${es.bg} ${es.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${es.dot}`} />
                    {es.label}
                  </span>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-xs text-slate-400">{e.quarter} FY{e.fiscal_year}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock className="h-3 w-3" />
                    {TIME_LABELS[e.event_time] || '—'}
                  </span>
                </td>
                <td className="py-3">
                  <span className="rounded bg-white/5 px-2 py-0.5 text-[11px] text-slate-500">{e.sector}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Calendar View                                                      */
/* ------------------------------------------------------------------ */

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function CalendarView({
  days, year, month, events, onPrev, onNext,
}: {
  days: (number | null)[];
  year: number;
  month: number;
  events: Map<string, EarningsEvent[]>;
  onPrev: () => void;
  onNext: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Month nav */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onPrev} className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-base font-bold text-white">{MONTH_NAMES[month]} {year}</h2>
        <button onClick={onNext} className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-white">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-px rounded-xl border border-white/5 bg-white/5 overflow-hidden">
        {DAY_NAMES.map(d => (
          <div key={d} className="bg-[#0b1120] px-3 py-2 text-center text-[11px] font-medium text-slate-500">
            {d}
          </div>
        ))}

        {days.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} className="bg-[#0b1120] min-h-[100px] p-2" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayEvents = events.get(dateStr) || [];
          const isT = dateStr === today;

          return (
            <div
              key={dateStr}
              className={`min-h-[100px] bg-[#0b1120] p-2 transition hover:bg-white/[0.02] ${isT ? 'ring-1 ring-inset ring-cyan-500/30' : ''}`}
            >
              <div className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                isT ? 'bg-cyan-500/30 font-bold text-cyan-300' : 'text-slate-400'
              }`}>
                {d}
              </div>
              <div className="space-y-0.5">
                {dayEvents.slice(0, 3).map(e => {
                  const es = EVENT_STYLES[e.event_type] || EVENT_STYLES.quarterly_results;
                  return (
                    <div
                      key={e.id}
                      className="truncate rounded px-1.5 py-0.5 text-[10px]"
                      title={`${e.company_name} - ${es.label} ${e.quarter}`}
                    >
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${es.dot} mr-1 align-middle`} />
                      <span className="align-middle text-slate-300">{e.symbol}</span>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] text-slate-500">+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
