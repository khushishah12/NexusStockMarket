import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() || '';
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  try {
    const { data: stocks } = await supabase
      .from('stocks')
      .select('symbol, company_name, exchange, sector, industry')
      .or(`symbol.ilike.%${q}%,company_name.ilike.%${q}%`)
      .limit(20);

    if (!stocks || stocks.length === 0) {
      return NextResponse.json([]);
    }

    const symbols = stocks.map((s: { symbol: string }) => s.symbol);
    let quotes: any[] = [];
    try {
      const result = await yahooFinance.quote(symbols);
      quotes = Array.isArray(result) ? result : [result];
    } catch {
      try {
        quotes = [];
        for (const sym of symbols) {
          try {
            const qr = await yahooFinance.quote(sym);
            quotes.push(qr);
          } catch { /* skip */ }
        }
      } catch { /* skip */ }
    }

    const quoteMap = new Map(quotes.map((q: any) => [q.symbol, q]));

    const enriched = stocks.map((s: { symbol: string; company_name: string; exchange: string; sector: string; industry: string }) => {
      const quote = quoteMap.get(s.symbol);
      const price = quote?.regularMarketPrice;
      const prevClose = quote?.regularMarketPreviousClose;
      const changePercent = price && prevClose && prevClose > 0
        ? ((price - prevClose) / prevClose) * 100
        : null;
      return {
        symbol: s.symbol,
        short_symbol: s.symbol.replace(/\.(NS|BO)$/, ''),
        exchange: s.exchange,
        company_name: s.company_name,
        sector: s.sector,
        industry: s.industry,
        price: price ?? null,
        change_percent: changePercent ? parseFloat(changePercent.toFixed(2)) : null,
        volume: quote?.regularMarketVolume ?? null,
        market_cap: quote?.marketCap ?? null,
      };
    });

    enriched.sort((a: { volume: number | null }, b: { volume: number | null }) => (b.volume ?? 0) - (a.volume ?? 0));

    return NextResponse.json(enriched, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Search error:', err);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
