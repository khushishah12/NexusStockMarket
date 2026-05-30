import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runSql } from '@/lib/run-sql';

export const dynamic = 'force-dynamic';

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  stock_symbol TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  buy_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  buy_date DATE NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_id ON public.portfolio_holdings (user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON public.portfolio_holdings (stock_symbol);
ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_holdings TO authenticated;
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
  const results: Record<string, number> = {};
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
        if (q.regularMarketPrice) results[key] = q.regularMarketPrice;
      }
    } catch {}
  }
  return results;
}

// GET /api/portfolio
export async function GET() {
  try {
    await runSql(CREATE_TABLE_SQL);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 500 });

    const { data: holdings, error } = await supabaseAdmin
      .from('portfolio_holdings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const symbols = (holdings || []).map(h => h.stock_symbol);
    const prices = await fetchLivePrices(symbols);

    const enriched = (holdings || []).map(h => {
      const symbol = h.stock_symbol.toUpperCase();
      const currentPrice = prices[symbol] || 0;
      const invested = Number(h.quantity) * Number(h.buy_price);
      const currentValue = Number(h.quantity) * currentPrice;
      const pl = currentValue - invested;
      const plPct = invested > 0 ? (pl / invested) * 100 : 0;
      return {
        id: h.id,
        stock_symbol: symbol,
        quantity: Number(h.quantity),
        buy_price: Number(h.buy_price),
        buy_date: h.buy_date,
        notes: h.notes || '',
        current_price: currentPrice,
        invested_amount: invested,
        current_value: currentValue,
        profit_loss: pl,
        profit_loss_percentage: plPct,
        exchange: getExchangeFromSymbol(symbol),
        created_at: h.created_at,
      };
    });

    return NextResponse.json({ holdings: enriched });
  } catch (err) {
    console.error('Portfolio GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/portfolio
export async function POST(request: NextRequest) {
  try {
    await runSql(CREATE_TABLE_SQL);

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 500 });

    const body = await request.json();
    const { stock_symbol, quantity, buy_price, buy_date, notes } = body;

    if (!stock_symbol || !quantity || !buy_price || !buy_date) {
      return NextResponse.json({ error: 'Symbol, quantity, buy price, and buy date are required' }, { status: 400 });
    }

    const symbol = stock_symbol.trim().toUpperCase();
    if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    }
    if (isNaN(Number(buy_price)) || Number(buy_price) <= 0) {
      return NextResponse.json({ error: 'Buy price must be a positive number' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('portfolio_holdings')
      .insert({
        user_id: user.id,
        stock_symbol: symbol,
        quantity: Number(quantity),
        buy_price: Number(buy_price),
        buy_date,
        notes: notes || '',
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ holding: data }, { status: 201 });
  } catch (err) {
    console.error('Portfolio POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
