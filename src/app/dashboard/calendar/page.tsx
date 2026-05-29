'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Search, CalendarDays, Table2, TrendingUp,
  Loader2, RefreshCw, ChevronLeft, ChevronRight, Clock, Coins,
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

interface IpoEvent {
  id: number;
  symbol: string;
  company_name: string;
  exchange: string;
  ipo_date: string;
  issue_type: string;
  price_band: string;
  lot_size: number;
  min_investment: number;
  sector: string;
  status: string;
  description: string;
  source: string;
}

type SortField = 'event_date' | 'company_name';
type IpoSortField = 'ipo_date' | 'company_name' | 'min_investment';
type ViewMode = 'table' | 'calendar';
type TabType = 'earnings' | 'ipos';

const EVENT_STYLES: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
  quarterly_results: { label: 'Results', bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400', border: 'border-l-blue-400/40' },
  earnings: { label: 'Earnings', bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400', border: 'border-l-emerald-400/40' },
  guidance: { label: 'Guidance', bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400', border: 'border-l-amber-400/40' },
  dividend: { label: 'Dividend', bg: 'bg-purple-500/15', text: 'text-purple-300', dot: 'bg-purple-400', border: 'border-l-purple-400/40' },
};

const IPO_STATUS_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  upcoming: { label: 'Upcoming', bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
  open: { label: 'Open', bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  closed: { label: 'Closed', bg: 'bg-slate-500/15', text: 'text-slate-300', dot: 'bg-slate-400' },
  listing: { label: 'Listing', bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
};

const TIME_LABELS: Record<string, string> = {
  before_open: 'Before Market',
  after_close: 'After Market',
  not_specified: 'Not Specified',
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function dayOfWeek(d: string): string {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
}

function isToday(d: string): boolean {
  return new Date(d + 'T00:00:00').toDateString() === new Date().toDateString();
}

function daysUntil(d: string): number {
  return Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000);
}

function getMonthDays(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < first; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
}

function fmtPrice(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n}`;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CalendarPage() {
  const [tab, setTab] = useState<TabType>('earnings');

  /* Earnings state */
  const [events, setEvents] = useState<EarningsEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  /* IPO state */
  const [ipos, setIpos] = useState<IpoEvent[]>([]);
  const [iposLoading, setIposLoading] = useState(true);

  const [view, setView] = useState<ViewMode>('table');
  const [ipoView, setIpoView] = useState<ViewMode>('table');

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [filterExchange, setFilterExchange] = useState('all');
  const [filterRange, setFilterRange] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterIssueType, setFilterIssueType] = useState('all');
  const [sortField, setSortField] = useState<string>('event_date');
  const [ipoSortField, setIpoSortField] = useState<IpoSortField>('ipo_date');

  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [ipoCalMonth, setIpoCalMonth] = useState(new Date().getMonth());
  const [ipoCalYear, setIpoCalYear] = useState(new Date().getFullYear());

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  const fetchEvents = useCallback(async (forceRefresh = false) => {
    setEventsLoading(true);
    try {
      const res = await fetch(`/api/stocks/calendar${forceRefresh ? '?refresh=true' : ''}`);
      const data = await res.json();
      if (data.events) setEvents(data.events);
    } catch {}
    setEventsLoading(false);
  }, []);

  const fetchIpos = useCallback(async (forceRefresh = false) => {
    setIposLoading(true);
    try {
      const res = await fetch(`/api/stocks/ipos${forceRefresh ? '?refresh=true' : ''}`);
      const data = await res.json();
      if (data.ipos) setIpos(data.ipos);
    } catch {}
    setIposLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchIpos(); }, [fetchIpos]);

  const refresh = useCallback(() => {
    if (tab === 'earnings') fetchEvents(true);
    else fetchIpos(true);
  }, [tab, fetchEvents, fetchIpos]);

  /* ---- Filter + Sort: Earnings ---- */
  const processedEvents = useMemo(() => {
    let f = [...events];

    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(e => e.company_name.toLowerCase().includes(q) || e.symbol.toLowerCase().includes(q));
    }

    if (filterExchange !== 'all') {
      f = f.filter(e => e.exchange?.toUpperCase() === filterExchange.toUpperCase());
    }

    const todayStr = new Date(now).toISOString().split('T')[0];
    if (filterRange === 'today') {
      f = f.filter(e => e.event_date === todayStr);
    } else if (filterRange === 'week') {
      const end = new Date(now + 7 * 86400000).toISOString().split('T')[0];
      f = f.filter(e => e.event_date >= todayStr && e.event_date <= end);
    } else if (filterRange === 'month') {
      const end = new Date(now + 30 * 86400000).toISOString().split('T')[0];
      f = f.filter(e => e.event_date >= todayStr && e.event_date <= end);
    }

    f.sort((a, b) =>
      sortField === 'event_date'
        ? a.event_date.localeCompare(b.event_date)
        : a.company_name.localeCompare(b.company_name)
    );

    return f;
  }, [events, search, filterExchange, filterRange, sortField, now]);

  /* ---- Filter + Sort: IPOs ---- */
  const processedIpos = useMemo(() => {
    let f = [...ipos];

    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(e => e.company_name.toLowerCase().includes(q) || e.symbol.toLowerCase().includes(q));
    }

    if (filterExchange !== 'all') {
      f = f.filter(e => e.exchange?.toUpperCase() === filterExchange.toUpperCase());
    }

    if (filterStatus !== 'all') {
      f = f.filter(e => e.status === filterStatus);
    }

    if (filterIssueType !== 'all') {
      f = f.filter(e => e.issue_type === filterIssueType);
    }

    f.sort((a, b) => {
      if (ipoSortField === 'ipo_date') return a.ipo_date.localeCompare(b.ipo_date);
      if (ipoSortField === 'company_name') return a.company_name.localeCompare(b.company_name);
      return a.min_investment - b.min_investment;
    });

    return f;
  }, [ipos, search, filterExchange, filterStatus, filterIssueType, ipoSortField]);

  /* ---- Calendar mapping ---- */
  const calendarEvents = useMemo(() => {
    const map = new Map<string, EarningsEvent[]>();
    for (const e of events) {
      const d = e.event_date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    return map;
  }, [events]);

  const ipoCalendarEvents = useMemo(() => {
    const map = new Map<string, IpoEvent[]>();
    for (const e of ipos) {
      const d = e.ipo_date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(e);
    }
    return map;
  }, [ipos]);

  const days = useMemo(() => getMonthDays(calYear, calMonth), [calYear, calMonth]);
  const ipoDays = useMemo(() => getMonthDays(ipoCalYear, ipoCalMonth), [ipoCalYear, ipoCalMonth]);

  const stats = useMemo(() => ({
    upcoming: events.filter(e => e.event_date >= today).length,
    sectors: new Set(events.map(e => e.sector).filter(Boolean)).size,
  }), [events, today]);

  const ipoStats = useMemo(() => ({
    upcoming: ipos.filter(e => e.ipo_date >= today).length,
    open: ipos.filter(e => e.status === 'open').length,
  }), [ipos, today]);

  const loading = tab === 'earnings' ? eventsLoading : iposLoading;

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-[#0b1120] via-[#0f1729] to-[#0b1120]">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-6 py-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {/* Earnings Calendar title */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 ring-1 ring-cyan-400/20">
              <CalendarDays className="h-4.5 w-4.5 text-cyan-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Earnings Calendar</h1>
              <p className="text-[11px] text-slate-500">{stats.upcoming} upcoming events &middot; {stats.sectors} sectors</p>
            </div>
          </div>

          {/* Divider */}
          <div className="hidden h-10 w-px bg-white/[0.06] sm:block" />

          {/* Upcoming IPOs title */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 ring-1 ring-violet-400/20">
              <Coins className="h-4.5 w-4.5 text-violet-300" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Upcoming IPOs</h1>
              <p className="text-[11px] text-slate-500">{ipoStats.upcoming} upcoming &middot; {ipoStats.open} open</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab toggle */}
          <div className="flex rounded-lg border border-white/[0.08] bg-black/40 p-0.5">
            <button
              onClick={() => setTab('earnings')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === 'earnings'
                  ? 'bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-500/10'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Earnings
            </button>
            <button
              onClick={() => setTab('ipos')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === 'ipos'
                  ? 'bg-violet-500/20 text-violet-300 shadow-sm shadow-violet-500/10'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              <Coins className="h-3.5 w-3.5" /> IPOs
            </button>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-white/[0.08] bg-black/40 p-0.5">
            <button
              onClick={() => { if (tab === 'earnings') setView('table'); else setIpoView('table'); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                (tab === 'earnings' ? view : ipoView) === 'table'
                  ? (tab === 'earnings' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-500/10' : 'bg-violet-500/20 text-violet-300 shadow-sm shadow-violet-500/10')
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
            <button
              onClick={() => { if (tab === 'earnings') setView('calendar'); else setIpoView('calendar'); }}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                (tab === 'earnings' ? view : ipoView) === 'calendar'
                  ? (tab === 'earnings' ? 'bg-cyan-500/20 text-cyan-300 shadow-sm shadow-cyan-500/10' : 'bg-violet-500/20 text-violet-300 shadow-sm shadow-violet-500/10')
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="rounded-lg border border-white/[0.08] bg-black/40 p-2 text-slate-500 transition hover:bg-white/5 hover:text-white"
            title="Refresh data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-white/[0.06] px-6 py-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => {
              const v = e.target.value;
              setSearchInput(v);
              if (debounceRef.current) clearTimeout(debounceRef.current);
              debounceRef.current = setTimeout(() => setSearch(v), 200);
            }}
            placeholder={tab === 'earnings' ? 'Search by company or symbol...' : 'Search IPOs by company or symbol...'}
            className="w-full rounded-lg border border-white/[0.08] bg-black/40 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-cyan-500/30 focus:shadow-sm focus:shadow-cyan-500/5"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearch(''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              <span className="text-xs">&times;</span>
            </button>
          )}
        </div>

        {tab === 'earnings' ? (
          <>
            <FilterSelect value={filterRange} onChange={setFilterRange} label="All Dates">
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">Next 30 Days</option>
            </FilterSelect>

            <FilterSelect value={filterExchange} onChange={setFilterExchange} label="All Exchanges">
              <option value="all">All Exchanges</option>
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </FilterSelect>

            <FilterSelect value={sortField} onChange={(v) => setSortField(v)} label="Sort">
              <option value="event_date">Sort: Date</option>
              <option value="company_name">Sort: Name</option>
            </FilterSelect>
          </>
        ) : (
          <>
            <FilterSelect value={filterStatus} onChange={setFilterStatus} label="All Status">
              <option value="all">All Status</option>
              <option value="upcoming">Upcoming</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="listing">Listing</option>
            </FilterSelect>

            <FilterSelect value={filterIssueType} onChange={setFilterIssueType} label="All Types">
              <option value="all">All Types</option>
              <option value="mainboard">Mainboard</option>
              <option value="sme">SME</option>
            </FilterSelect>

            <FilterSelect value={filterExchange} onChange={setFilterExchange} label="All Exchanges">
              <option value="all">All Exchanges</option>
              <option value="NSE">NSE</option>
              <option value="BSE">BSE</option>
            </FilterSelect>

            <FilterSelect value={ipoSortField} onChange={(v) => setIpoSortField(v as IpoSortField)} label="Sort">
              <option value="ipo_date">Sort: Date</option>
              <option value="company_name">Sort: Name</option>
              <option value="min_investment">Sort: Min Investment</option>
            </FilterSelect>
          </>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {loading && ((tab === 'earnings' ? events : ipos).length === 0) ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : tab === 'earnings' ? (
          view === 'table' ? (
            <EarningsTableView events={processedEvents} />
          ) : (
            <CalendarView
              days={days}
              year={calYear}
              month={calMonth}
              events={calendarEvents}
              accent="cyan"
              onPrev={() => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); }}
              onNext={() => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); }}
            />
          )
        ) : ipoView === 'table' ? (
          <IpoTableView ipos={processedIpos} />
        ) : (
          <IpoCalendarView
            days={ipoDays}
            year={ipoCalYear}
            month={ipoCalMonth}
            ipos={ipoCalendarEvents}
            onPrev={() => { if (ipoCalMonth === 0) { setIpoCalYear(y => y - 1); setIpoCalMonth(11); } else setIpoCalMonth(m => m - 1); }}
            onNext={() => { if (ipoCalMonth === 11) { setIpoCalYear(y => y + 1); setIpoCalMonth(0); } else setIpoCalMonth(m => m + 1); }}
          />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FilterSelect helper                                                 */
/* ------------------------------------------------------------------ */

function FilterSelect({ value, onChange, label, children }: {
  value: string; onChange: (v: string) => void; label: string; children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-slate-300 outline-none transition focus:border-cyan-500/30 appearance-none cursor-pointer hover:border-white/20"
    >
      {children}
    </select>
  );
}

/* ------------------------------------------------------------------ */
/*  Earnings Table View                                                */
/* ------------------------------------------------------------------ */

function EarningsTableView({ events }: { events: EarningsEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <TrendingUp className="h-8 w-8 text-slate-600" />
        <p className="text-sm text-slate-500">No events match your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/20">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3">Exchange</th>
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3">Quarter</th>
            <th className="px-4 py-3">Time</th>
            <th className="px-4 py-3">Sector</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const es = EVENT_STYLES[e.event_type] || EVENT_STYLES.quarterly_results;
            const du = daysUntil(e.event_date);
            const isT = isToday(e.event_date);
            return (
              <tr
                key={e.id}
                className={`border-b border-white/[0.04] transition hover:bg-white/[0.03] ${isT ? 'bg-cyan-500/5' : ''}`}
              >
                <td className={`border-l-2 px-4 py-3.5 ${isT ? es.border : 'border-l-transparent'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex flex-col items-center justify-center rounded-lg bg-white/[0.04] px-2.5 py-1.5">
                      <span className="text-[10px] font-medium uppercase text-slate-500">{dayOfWeek(e.event_date)}</span>
                      <span className="text-sm font-bold text-white">{new Date(e.event_date + 'T00:00:00').getDate()}</span>
                      <span className="text-[10px] text-slate-400">{new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}</span>
                    </div>
                    {du === 0 && <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-300">Today</span>}
                    {du === 1 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">Tomorrow</span>}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-semibold text-white">{e.company_name}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-xs font-medium text-slate-200">{e.symbol}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-slate-400">{e.exchange}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${es.bg} ${es.text} ring-1 ring-inset ring-white/5`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${es.dot}`} />
                    {es.label}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-xs font-medium text-slate-400">{e.quarter} <span className="text-slate-600">FY</span>{e.fiscal_year}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3 w-3 text-slate-500" />
                    {TIME_LABELS[e.event_time] || '—'}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-slate-500">{e.sector}</span>
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
/*  IPO Table View                                                     */
/* ------------------------------------------------------------------ */

function IpoTableView({ ipos }: { ipos: IpoEvent[] }) {
  if (ipos.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2">
        <Coins className="h-8 w-8 text-slate-600" />
        <p className="text-sm text-slate-500">No IPOs match your filters</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.06] bg-black/20">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-white/[0.06] text-left text-[11px] font-medium uppercase tracking-wider text-slate-500">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Symbol</th>
            <th className="px-4 py-3">Exchange</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Price Band</th>
            <th className="px-4 py-3">Lot</th>
            <th className="px-4 py-3">Min Inv.</th>
            <th className="px-4 py-3">Sector</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {ipos.map((e) => {
            const st = IPO_STATUS_STYLES[e.status] || IPO_STATUS_STYLES.upcoming;
            const du = daysUntil(e.ipo_date);
            const isT = isToday(e.ipo_date);
            return (
              <tr
                key={e.id}
                className={`border-b border-white/[0.04] transition hover:bg-white/[0.03] ${isT ? 'bg-violet-500/5' : ''}`}
              >
                <td className={`border-l-2 px-4 py-3.5 ${isT ? 'border-l-violet-400/40' : 'border-l-transparent'}`}>
                  <div className="flex items-center gap-2.5">
                    <div className="flex flex-col items-center justify-center rounded-lg bg-white/[0.04] px-2.5 py-1.5">
                      <span className="text-[10px] font-medium uppercase text-slate-500">{dayOfWeek(e.ipo_date)}</span>
                      <span className="text-sm font-bold text-white">{new Date(e.ipo_date + 'T00:00:00').getDate()}</span>
                      <span className="text-[10px] text-slate-400">{new Date(e.ipo_date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}</span>
                    </div>
                    {du === 0 && <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-[10px] font-medium text-violet-300">Today</span>}
                    {du === 1 && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-300">Tomorrow</span>}
                    {du > 1 && du <= 7 && <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-300">D-{du}</span>}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <span className="text-sm font-semibold text-white">{e.company_name}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-md bg-white/[0.06] px-2 py-1 font-mono text-xs font-medium text-slate-200">{e.symbol}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-md bg-white/[0.04] px-2 py-1 text-xs text-slate-400">{e.exchange}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                    e.issue_type === 'sme'
                      ? 'bg-yellow-500/10 text-yellow-300 ring-1 ring-inset ring-yellow-500/20'
                      : 'bg-blue-500/10 text-blue-300 ring-1 ring-inset ring-blue-500/20'
                  }`}>
                    {e.issue_type === 'sme' ? 'SME' : 'Mainboard'}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="whitespace-nowrap font-mono text-xs font-medium text-emerald-300">{e.price_band}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs text-slate-400">{e.lot_size}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="font-mono text-xs font-medium text-slate-200">{fmtPrice(e.min_investment)}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className="rounded-md bg-white/[0.04] px-2 py-1 text-[11px] text-slate-500">{e.sector}</span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${st.bg} ${st.text} ring-1 ring-inset ring-white/5`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
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

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function CalendarView({ days, year, month, events, accent = 'cyan', onPrev, onNext }: {
  days: (number | null)[];
  year: number;
  month: number;
  events: Map<string, EarningsEvent[]>;
  accent?: 'cyan' | 'violet';
  onPrev: () => void;
  onNext: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const a = accent === 'violet'
    ? { border: 'border-violet-400/40', bg: 'from-violet-500/10', shadow: 'shadow-violet-500/5', circleBg: 'bg-violet-400', circleText: 'text-[#0b1120]', more: 'text-violet-400/70' }
    : { border: 'border-cyan-400/40', bg: 'from-cyan-500/10', shadow: 'shadow-cyan-500/5', circleBg: 'bg-cyan-400', circleText: 'text-[#0b1120]', more: 'text-cyan-400/70' };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-bold text-white">
          {MONTH_NAMES[month]} <span className="text-slate-500">{year}</span>
        </h2>
        <button
          onClick={onNext}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {d}
          </div>
        ))}

        {days.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} className="min-h-[110px] rounded-xl bg-black/10" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayEvents = events.get(dateStr) || [];
          const isT = dateStr === today;

          return (
            <div
              key={dateStr}
              className={`min-h-[110px] rounded-xl border p-2.5 transition ${
                isT
                  ? `${a.border} bg-gradient-to-b ${a.bg} to-transparent shadow-sm ${a.shadow}`
                  : dayEvents.length > 0
                    ? 'border-white/[0.06] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    : 'border-transparent bg-black/20 hover:bg-white/[0.02]'
              }`}
            >
              <div className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                isT ? `${a.circleBg} ${a.circleText}` : 'text-slate-400'
              }`}>
                {d}
              </div>

              <div className="space-y-1">
                {dayEvents.slice(0, 3).map(e => {
                  const es = EVENT_STYLES[e.event_type] || EVENT_STYLES.quarterly_results;
                  return (
                    <div
                      key={e.id}
                      className="group relative truncate rounded-md px-1.5 py-1 text-[10px] leading-tight transition hover:bg-white/[0.06]"
                      title={`${e.company_name} · ${es.label} ${e.quarter}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${es.dot}`} />
                        <span className="truncate font-medium text-slate-200">{e.symbol}</span>
                      </div>
                      <div className="truncate text-[9px] text-slate-500">{es.label} &middot; {e.quarter}</div>
                    </div>
                  );
                })}
                {dayEvents.length > 3 && (
                  <div className={`text-[10px] font-medium ${a.more}`}>+{dayEvents.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  IPO Calendar View                                                  */
/* ------------------------------------------------------------------ */

const IPO_CAL_STYLES: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  upcoming: { label: 'Upcoming', bg: 'bg-blue-500/15', text: 'text-blue-300', dot: 'bg-blue-400' },
  open: { label: 'Open', bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  closed: { label: 'Closed', bg: 'bg-slate-500/15', text: 'text-slate-300', dot: 'bg-slate-400' },
  listing: { label: 'Listing', bg: 'bg-amber-500/15', text: 'text-amber-300', dot: 'bg-amber-400' },
};

function IpoCalendarView({ days, year, month, ipos, onPrev, onNext }: {
  days: (number | null)[];
  year: number;
  month: number;
  ipos: Map<string, IpoEvent[]>;
  onPrev: () => void;
  onNext: () => void;
}) {
  const today = new Date().toISOString().split('T')[0];
  const a = { border: 'border-violet-400/40', bg: 'from-violet-500/10', shadow: 'shadow-violet-500/5', circleBg: 'bg-violet-400', circleText: 'text-[#0b1120]', more: 'text-violet-400/70' };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={onPrev}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-bold text-white">
          {MONTH_NAMES[month]} <span className="text-slate-500">{year}</span>
        </h2>
        <button
          onClick={onNext}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-black/40 text-slate-400 transition hover:border-white/20 hover:text-white"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {DAY_NAMES.map(d => (
          <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {d}
          </div>
        ))}

        {days.map((d, i) => {
          if (d === null) return <div key={`e-${i}`} className="min-h-[110px] rounded-xl bg-black/10" />;

          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const dayIpos = ipos.get(dateStr) || [];
          const isT = dateStr === today;

          return (
            <div
              key={dateStr}
              className={`min-h-[110px] rounded-xl border p-2.5 transition ${
                isT
                  ? `${a.border} bg-gradient-to-b ${a.bg} to-transparent shadow-sm ${a.shadow}`
                  : dayIpos.length > 0
                    ? 'border-white/[0.06] bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.05]'
                    : 'border-transparent bg-black/20 hover:bg-white/[0.02]'
              }`}
            >
              <div className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                isT ? `${a.circleBg} ${a.circleText}` : 'text-slate-400'
              }`}>
                {d}
              </div>

              <div className="space-y-1">
                {dayIpos.slice(0, 3).map(e => {
                  const st = IPO_CAL_STYLES[e.status] || IPO_CAL_STYLES.upcoming;
                  return (
                    <div
                      key={e.id}
                      className="group relative truncate rounded-md px-1.5 py-1 text-[10px] leading-tight transition hover:bg-white/[0.06]"
                      title={`${e.company_name} · ${st.label} · ${e.price_band}`}
                    >
                      <div className="flex items-center gap-1">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${st.dot}`} />
                        <span className="truncate font-medium text-slate-200">{e.symbol}</span>
                      </div>
                      <div className="truncate text-[9px] text-slate-500">{st.label} &middot; {e.price_band}</div>
                    </div>
                  );
                })}
                {dayIpos.length > 3 && (
                  <div className={`text-[10px] font-medium ${a.more}`}>+{dayIpos.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
