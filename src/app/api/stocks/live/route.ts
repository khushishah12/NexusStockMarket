import { NextResponse } from 'next/server';
import {
  discoverIndianSymbols,
  fetchQuotesInBatches,
  FALLBACK_SYMBOLS,
} from '@/lib/yahoo-discovery';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    let allSymbols = await discoverIndianSymbols().catch(() => new Set<string>());

    if (allSymbols.size < 50) {
      for (const sym of FALLBACK_SYMBOLS) {
        allSymbols.add(sym);
      }
    }

    let symbolList = [...allSymbols];
    const results = await fetchQuotesInBatches(symbolList);

    if (results.length === 0 && FALLBACK_SYMBOLS.length > 0) {
      const fallbackResults = await fetchQuotesInBatches(FALLBACK_SYMBOLS);
      return NextResponse.json(fallbackResults, { headers: { 'Cache-Control': 'no-store' } });
    }

    return NextResponse.json(results, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
