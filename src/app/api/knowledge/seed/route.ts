import { NextResponse } from 'next/server';
import { runSql } from '@/lib/run-sql';
import { supabaseAdmin } from '@/lib/supabase';
import YahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const yf = new YahooFinance();

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_fts ON public.knowledge_base USING GIN(to_tsvector('english', content));
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.knowledge_base TO authenticated;
`;

export async function POST() {
  try {
    await runSql(CREATE_TABLE_SQL);
    if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 500 });

    const { count } = await supabaseAdmin
      .from('knowledge_base')
      .select('*', { count: 'exact', head: true });

    if (count && count > 50) {
      return NextResponse.json({ message: `Knowledge base already seeded (${count} entries). Delete table to re-seed.` });
    }

    const symbols = [
      'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
      'SBIN.NS', 'BHARTIARTL.NS', 'ITC.NS', 'WIPRO.NS', 'LT.NS',
      'HINDUNILVR.NS', 'NTPC.NS', 'ONGC.NS', 'POWERGRID.NS', 'TITAN.NS',
      'BAJFINANCE.NS', 'MARUTI.NS', 'SUNPHARMA.NS', 'TATAMOTORS.NS', 'AXISBANK.NS',
      'KOTAKBANK.NS', 'ULTRACEMCO.NS', 'ASIANPAINT.NS', 'NESTLEIND.NS', 'M&M.NS',
      'JSWSTEEL.NS', 'TATASTEEL.NS', 'COALINDIA.NS', 'BPCL.NS', 'GRASIM.NS',
      'ADANIPORTS.NS', 'HCLTECH.NS', 'TECHM.NS', 'TRENT.NS', 'DLF.NS',
      'ZOMATO.NS', 'PAYTM.NS', 'NYKAA.NS', 'LICI.NS', 'IRCTC.NS',
      'HAL.NS', 'BEL.NS', 'DMART.NS', 'PIDILITIND.NS', 'DIVISLAB.NS',
      'DRREDDY.NS', 'CIPLA.NS', 'APOLLOHOSP.NS', 'EICHERMOT.NS', 'BRITANNIA.NS',
    ];

    let inserted = 0;

    for (const sym of symbols) {
      const shortSym = sym.replace('.NS', '');
      try {
        const quote = await yf.quote([sym]);
        const q = Array.isArray(quote) ? quote[0] : quote;
        if (!q || !q.regularMarketPrice) continue;

        let summary: any = {};
        try {
          const s = await yf.quoteSummary(sym, { modules: ['assetProfile', 'summaryDetail', 'defaultKeyStatistics'] });
          summary = s;
        } catch {}

        const profile = summary?.assetProfile || {};
        const detail = summary?.summaryDetail || {};
        const stats = summary?.defaultKeyStatistics || {};

        const content = [
          `${shortSym} (${q.shortName || q.longName || shortSym}) — ${profile.sector || ''} | ${profile.industry || ''}`,
          `Sector: ${profile.sector || 'N/A'}. Industry: ${profile.industry || 'N/A'}.`,
          profile.longBusinessDescription ? `Business: ${profile.longBusinessDescription}` : '',
          `Key metrics: Market Cap ₹${(q.marketCap / 1e7).toFixed(0)}Cr, PE ${detail.trailingPE?.toFixed(2) || 'N/A'}, EPS ${stats.forwardEps?.toFixed(2) || detail.trailingEps?.toFixed(2) || 'N/A'}, Dividend Yield ${detail.dividendYield ? (detail.dividendYield * 100).toFixed(2) + '%' : 'N/A'}, 52W High ₹${q.fiftyTwoWeekHigh?.toFixed(2) || 'N/A'}, 52W Low ₹${q.fiftyTwoWeekLow?.toFixed(2) || 'N/A'}.`,
          `Employees: ${profile.fullTimeEmployees?.toLocaleString() || 'N/A'}. Country: ${profile.country || 'India'}. Website: ${profile.website || 'N/A'}.`,
        ].filter(Boolean).join('\n');

        const { error: insertError } = await supabaseAdmin
          .from('knowledge_base')
          .insert({
            content,
            source: 'yahoo-finance',
            metadata: {
              symbol: shortSym,
              sector: profile.sector || '',
              industry: profile.industry || '',
              marketCap: q.marketCap || 0,
            },
          });

        if (!insertError) inserted++;
      } catch {}
    }

    return NextResponse.json({ message: `Seeded ${inserted} entries into knowledge_base` });
  } catch (err) {
    console.error('Knowledge seed error:', err);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
