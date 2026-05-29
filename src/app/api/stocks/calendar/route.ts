import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runSql } from '@/lib/run-sql';

export const dynamic = 'force-dynamic';

const QUARTER_MAP = [
  { quarter: 'Q1', months: [4, 5, 6], reportMonths: [7, 8] },
  { quarter: 'Q2', months: [7, 8, 9], reportMonths: [10, 11] },
  { quarter: 'Q3', months: [10, 11, 12], reportMonths: [1, 2] },
  { quarter: 'Q4', months: [1, 2, 3], reportMonths: [4, 5] },
];

function findQuarter(date: Date): { quarter: string; fy: number } {
  const m = date.getMonth() + 1;
  const y = date.getFullYear();
  for (const q of QUARTER_MAP) {
    if (m >= q.months[0] && m <= q.months[2]) {
      const fy = m >= 4 ? y + 1 : y;
      return { quarter: q.quarter, fy };
    }
  }
  return { quarter: 'Q1', fy: y };
}

function nextReportQuarter(): { quarter: string; fy: number; start: Date; end: Date } {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  for (const q of QUARTER_MAP) {
    const reportStart = q.reportMonths[0];
    const reportEnd = q.reportMonths[1];
    if (m <= reportEnd) {
      const fy = q.months[0] >= 4 ? y + 1 : y;
      const start = new Date(y, reportStart - 1, 1);
      const end = new Date(y, reportEnd, 0);
      return { quarter: q.quarter, fy, start, end };
    }
  }
  const first = QUARTER_MAP[0];
  return { quarter: first.quarter, fy: y + 1, start: new Date(y + 1, 6, 1), end: new Date(y + 1, 7, 31) };
}

function randomDate(start: Date, end: Date): string {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return d.toISOString().split('T')[0];
}

const SAMPLE_EVENT_TYPES = ['quarterly_results', 'earnings', 'guidance', 'dividend'];
const SAMPLE_SECTORS = ['IT', 'Banking', 'Pharma', 'Auto', 'FMCG', 'Infra', 'Energy', 'Metals', 'Telecom', 'Consumer'];

async function ensureTable() {
  await runSql(`
    CREATE TABLE IF NOT EXISTS public.earnings_calendar (
      id BIGSERIAL PRIMARY KEY,
      symbol TEXT NOT NULL,
      company_name TEXT DEFAULT '',
      exchange TEXT DEFAULT 'NSE',
      event_date DATE NOT NULL,
      event_time TEXT DEFAULT 'not_specified',
      event_type TEXT DEFAULT 'quarterly_results',
      sector TEXT DEFAULT '',
      quarter TEXT DEFAULT '',
      fiscal_year INT DEFAULT 0,
      description TEXT DEFAULT '',
      source TEXT DEFAULT 'system',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_earnings_calendar_date ON public.earnings_calendar (event_date DESC);
    CREATE INDEX IF NOT EXISTS idx_earnings_calendar_symbol ON public.earnings_calendar (symbol);
    ALTER TABLE public.earnings_calendar ENABLE ROW LEVEL SECURITY;
    GRANT SELECT ON public.earnings_calendar TO anon, authenticated;
  `);
}

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
    }

    await ensureTable();

    const { searchParams } = request.nextUrl;
    const refresh = searchParams.get('refresh') === 'true';

    /* Check existing cache */
    if (!refresh) {
      const { data: cached, error } = await supabaseAdmin
        .from('earnings_calendar')
        .select('*')
        .gte('event_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
        .lte('event_date', new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(200);

      if (!error && cached && cached.length > 20) {
        return NextResponse.json({ events: cached, source: 'cache' });
      }
    }

    /* Seed from stocks table */
    const { data: stocks } = await supabaseAdmin
      .from('stocks')
      .select('symbol, company_name, exchange, sector')
      .limit(100);

    if (!stocks || stocks.length === 0) {
      return NextResponse.json({ events: [], source: 'empty' });
    }

    /* Generate upcoming earnings events */
    const nq = nextReportQuarter();
    const events: any[] = [];
    const now = new Date();
    const seedKey = `${nq.quarter}-${nq.fy}-${stocks.length}`;

    /* Check if already seeded for this quarter */
    const { data: existing } = await supabaseAdmin
      .from('earnings_calendar')
      .select('id')
      .eq('quarter', nq.quarter)
      .eq('fiscal_year', nq.fy)
      .limit(1);

    if (existing && existing.length > 0 && !refresh) {
      /* Return existing data */
      const { data: all } = await supabaseAdmin
        .from('earnings_calendar')
        .select('*')
        .gte('event_date', new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
        .lte('event_date', new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0])
        .order('event_date', { ascending: true })
        .limit(200);

      return NextResponse.json({ events: all ?? [], source: 'cache' });
    }

    /* Clear old data for refresh */
    if (refresh) {
      await supabaseAdmin.from('earnings_calendar').delete().gte('event_date', '2024-01-01');
    }

    /* Generate events */
    for (const stock of stocks) {
      const eventDate = randomDate(nq.start, nq.end);
      const eventType = SAMPLE_EVENT_TYPES[Math.floor(Math.random() * SAMPLE_EVENT_TYPES.length)];
      const sector = stock.sector || SAMPLE_SECTORS[Math.floor(Math.random() * SAMPLE_SECTORS.length)];
      const eventTime = ['before_open', 'after_close', 'not_specified'][Math.floor(Math.random() * 3)];
      const sym = (stock.symbol ?? '').replace('.NS', '').replace('.BO', '');

      events.push({
        symbol: sym,
        company_name: stock.company_name || sym,
        exchange: stock.exchange || 'NSE',
        event_date: eventDate,
        event_time: eventTime,
        event_type: eventType,
        sector,
        quarter: nq.quarter,
        fiscal_year: nq.fy,
        description: `${nq.quarter} FY${nq.fy} ${eventType === 'quarterly_results' ? 'Results' : eventType === 'dividend' ? 'Dividend' : eventType === 'guidance' ? 'Guidance' : 'Earnings'} - ${stock.company_name || sym}`,
        source: 'system',
      });
    }

    /* Upsert in batches */
    const BATCH = 50;
    for (let i = 0; i < events.length; i += BATCH) {
      const batch = events.slice(i, i + BATCH);
      const { error } = await supabaseAdmin.from('earnings_calendar').upsert(batch, {
        onConflict: 'symbol,event_date,quarter,fiscal_year',
        ignoreDuplicates: true,
      });
      if (error) console.error('Batch insert error:', error);
    }

    return NextResponse.json({ events, source: 'generated', count: events.length });
  } catch (err) {
    console.error('Calendar API error:', err);
    return NextResponse.json({ error: 'Failed to fetch calendar data' }, { status: 500 });
  }
}
