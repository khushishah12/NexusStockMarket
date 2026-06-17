import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runSql } from '@/lib/run-sql';

export const dynamic = 'force-dynamic';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.watchlist_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  symbol TEXT NOT NULL,
  exchange TEXT DEFAULT 'NSE',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_user_id ON public.watchlist_items (user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_symbol ON public.watchlist_items (symbol);
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist_items TO authenticated;
`;

function getExchangeFromSymbol(sym: string): string {
  if (sym.endsWith('.NS')) return 'NSE';
  if (sym.endsWith('.BO')) return 'BSE';
  return 'NSE';
}

function normalizeSymbol(sym: string): string {
  const s = sym.trim().toUpperCase();
  if (s.endsWith('.NS') || s.endsWith('.BO')) return s;
  return `${s}.NS`;
}

async function fetchLivePrices(symbols: string[]) {
  if (!symbols.length) return {};
  const { yahooFinance } = await import('@/lib/yahoo-discovery');
  const results: Record<string, { price: number; change: number; changePercent: number }> = {};
  const normalized = symbols.map(normalizeSymbol);
  const seen = new Set<string>();

  for (let i = 0; i < normalized.length; i += 50) {
    const batch = normalized.slice(i, i + 50);
    try {
      const quotes = await yahooFinance.quote(batch);
      for (const q of quotes) {
        const key = q.symbol.replace(/\.(NS|BO)$/i, '').toUpperCase();
        if (seen.has(key)) continue;
        seen.add(key);
        results[key] = {
          price: q.regularMarketPrice || 0,
          change: q.regularMarketChange || 0,
          changePercent: q.regularMarketChangePercent || 0,
        };
      }
    } catch {}
  }
  return results;
}

export async function GET() {
  try {
    await runSql(CREATE_TABLE_SQL);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 500 });

    const { data: items, error } = await supabaseAdmin
      .from('watchlist_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const symbols = (items || []).map(i => i.symbol);
    const prices = await fetchLivePrices(symbols);

    const enriched = (items || []).map(i => {
      const sym = i.symbol.toUpperCase();
      const live = prices[sym] || { price: 0, change: 0, changePercent: 0 };
      return {
        id: i.id,
        symbol: sym,
        exchange: i.exchange || getExchangeFromSymbol(sym),
        notes: i.notes || '',
        created_at: i.created_at,
        current_price: live.price,
        change: live.change,
        change_percent: live.changePercent,
      };
    });

    return NextResponse.json({ items: enriched });
  } catch (err) {
    console.error('Watchlist GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await runSql(CREATE_TABLE_SQL);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 500 });

    const body = await request.json();
    const { symbol, exchange, notes } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const sym = symbol.trim().toUpperCase();

    const { data: existing } = await supabaseAdmin
      .from('watchlist_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('symbol', sym)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `${sym} is already in your watchlist` }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('watchlist_items')
      .insert({
        user_id: user.id,
        symbol: sym,
        exchange: exchange || getExchangeFromSymbol(sym),
        notes: notes || '',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ item: data }, { status: 201 });
  } catch (err) {
    console.error('Watchlist POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
