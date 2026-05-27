import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { runSql } from '@/lib/run-sql';
import {
  discoverIndianSymbols,
  fetchQuotesInBatches,
} from '@/lib/yahoo-discovery';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const db = supabaseAdmin ?? supabase;

const CREATE_STOCKS_TABLE = `
CREATE TABLE IF NOT EXISTS public.stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  company_name text,
  exchange text,
  sector text,
  industry text,
  created_at timestamp with time zone DEFAULT now()
);
`;

interface SourceResult {
  name: string;
  count: number;
}

async function ensureStocksTable(): Promise<boolean> {
  return runSql(CREATE_STOCKS_TABLE);
}

async function discoverViaFinnhub(): Promise<Map<string, { company_name: string; exchange: string }>> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) return new Map();

  const result = new Map<string, { company_name: string; exchange: string }>();
  const exchanges = ['NSE', 'BSE'];

  for (const exchange of exchanges) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/stock/symbol?exchange=${exchange}&token=${apiKey}`,
        { signal: AbortSignal.timeout(15_000) }
      );
      if (!res.ok) {
        const text = await res.text();
        console.error(`Finnhub ${exchange} error:`, text);
        continue;
      }
      const data: { symbol: string; description: string; type?: string }[] = await res.json();
      for (const item of data) {
        const suffix = exchange === 'NSE' ? '.NS' : '.BO';
        const symbol = item.symbol + suffix;
        if (!result.has(symbol)) {
          result.set(symbol, {
            company_name: item.description || symbol,
            exchange: exchange === 'NSE' ? 'NSE' : 'BSE',
          });
        }
      }
    } catch (err) {
      console.error(`Finnhub ${exchange} exception:`, err);
    }
  }
  return result;
}

async function discoverViaTwelveData(): Promise<Map<string, { company_name: string; exchange: string }>> {
  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) return new Map();

  const result = new Map<string, { company_name: string; exchange: string }>();
  const exchanges = ['NSE', 'BOMBAY STOCK EXCHANGE'];

  for (const exchange of exchanges) {
    try {
      const res = await fetch(
        `https://api.twelvedata.com/stocks?exchange=${exchange}&apikey=${apiKey}`,
        { signal: AbortSignal.timeout(15_000) }
      );
      if (!res.ok) continue;
      const json: { status: string; data: { symbol: string; name: string; exchange: string }[] } = await res.json();
      if (json.status !== 'ok' || !json.data) continue;
      for (const item of json.data) {
        const suffix = exchange === 'NSE' ? '.NS' : '.BO';
        const symbol = item.symbol + suffix;
        if (!result.has(symbol)) {
          result.set(symbol, {
            company_name: item.name || symbol,
            exchange: exchange === 'NSE' ? 'NSE' : 'BSE',
          });
        }
      }
    } catch (err) {
      console.error(`TwelveData ${exchange} exception:`, err);
    }
  }
  return result;
}

function normalizeSymbol(sym: string): string {
  let s = sym.trim().toUpperCase();
  if (!s.endsWith('.NS') && !s.endsWith('.BO')) {
    s = s + '.NS';
  }
  return s;
}

export async function POST() {
  try {
    const tableReady = await ensureStocksTable();
    if (!tableReady) {
      return NextResponse.json(
        { error: 'Could not create stocks table. Run this SQL in your Supabase SQL Editor:\n' + CREATE_STOCKS_TABLE },
        { status: 500 }
      );
    }

    const sources: SourceResult[] = [];

    const [yahooSymbols, finnhubMap, twelvedataMap] = await Promise.all([
      discoverIndianSymbols().catch(() => new Set<string>()),
      discoverViaFinnhub().catch(() => new Map()),
      discoverViaTwelveData().catch(() => new Map()),
    ]);

    sources.push({ name: 'Yahoo Finance', count: yahooSymbols.size });
    sources.push({ name: 'Finnhub', count: finnhubMap.size });
    sources.push({ name: 'Twelve Data', count: twelvedataMap.size });

    const allSymbols = new Set<string>();
    for (const s of yahooSymbols) allSymbols.add(normalizeSymbol(s));
    for (const [sym] of finnhubMap) allSymbols.add(sym);
    for (const [sym] of twelvedataMap) allSymbols.add(sym);

    const { data: existing, count: existingCount } = await db
      .from('stocks')
      .select('symbol', { count: 'exact', head: true });

    const existingSymbols = new Set((existing ?? []).map((r: { symbol: string }) => r.symbol.toUpperCase()));

    const newSymbols = [...allSymbols].filter((s) => !existingSymbols.has(s.toUpperCase()));

    if (newSymbols.length === 0) {
      return NextResponse.json({
        added: 0,
        total: existingCount ?? 0,
        sources,
        message: 'No new stocks to add — database is already up to date.',
      });
    }

    const quotes = await fetchQuotesInBatches(newSymbols);

    const stockRows: { symbol: string; company_name: string; exchange: string; sector: string; industry: string }[] = [];

    for (const quote of quotes) {
      const finnhubData = finnhubMap.get(quote.symbol);
      const twelvedataData = twelvedataMap.get(quote.symbol);
      stockRows.push({
        symbol: quote.symbol,
        company_name: quote.company_name || finnhubData?.company_name || twelvedataData?.company_name || quote.symbol,
        exchange: quote.exchange || finnhubData?.exchange || twelvedataData?.exchange || 'NSE',
        sector: quote.sector || 'N/A',
        industry: quote.industry || 'N/A',
      });
    }

    const symbolsFromNonYahoo = newSymbols.filter((s) => !quotes.find((q) => q.symbol === s));
    for (const sym of symbolsFromNonYahoo) {
      const finnhub = finnhubMap.get(sym);
      const twelvedata = twelvedataMap.get(sym);
      if (finnhub || twelvedata) {
        stockRows.push({
          symbol: sym,
          company_name: finnhub?.company_name ?? twelvedata?.company_name ?? sym,
          exchange: finnhub?.exchange ?? twelvedata?.exchange ?? 'NSE',
          sector: 'N/A',
          industry: 'N/A',
        });
      }
    }

    if (stockRows.length === 0) {
      return NextResponse.json({
        added: 0,
        total: existingCount ?? 0,
        sources,
        message: 'No stocks could be fetched from any source.',
      });
    }

    const batchSize = 100;

    for (let i = 0; i < stockRows.length; i += batchSize) {
      const batch = stockRows.slice(i, i + batchSize);
      const { error } = await db
        .from('stocks')
        .upsert(batch, { onConflict: 'symbol', ignoreDuplicates: true });

      if (error) {
        console.error('Upsert batch error:', error);
      }
    }

    const { count: totalCount } = await db
      .from('stocks')
      .select('*', { count: 'exact', head: true });

    const addedCount = (totalCount ?? 0) - (existingCount ?? 0);

    return NextResponse.json({
      added: addedCount,
      total: totalCount ?? 0,
      sources,
      message: `Added ${addedCount} new stock${addedCount === 1 ? '' : 's'} to database.`,
    });
  } catch (err) {
    console.error('Discover error:', err);
    return NextResponse.json(
      { error: `Discovery failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
