import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runSql } from '@/lib/run-sql';

export const dynamic = 'force-dynamic';

const FALLBACK_STOCKS: { symbol: string; company_name: string; exchange: string; sector: string }[] = [
  { symbol: 'RELIANCE', company_name: 'Reliance Industries', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'TCS', company_name: 'Tata Consultancy Services', exchange: 'NSE', sector: 'IT' },
  { symbol: 'HDFCBANK', company_name: 'HDFC Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'ICICIBANK', company_name: 'ICICI Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'INFY', company_name: 'Infosys', exchange: 'NSE', sector: 'IT' },
  { symbol: 'SBIN', company_name: 'State Bank of India', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'BHARTIARTL', company_name: 'Bharti Airtel', exchange: 'NSE', sector: 'Telecom' },
  { symbol: 'ITC', company_name: 'ITC Limited', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'WIPRO', company_name: 'Wipro', exchange: 'NSE', sector: 'IT' },
  { symbol: 'LT', company_name: 'Larsen & Toubro', exchange: 'NSE', sector: 'Infra' },
  { symbol: 'HINDUNILVR', company_name: 'Hindustan Unilever', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'NTPC', company_name: 'NTPC Limited', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'ONGC', company_name: 'Oil & Natural Gas Corp', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'TITAN', company_name: 'Titan Company', exchange: 'NSE', sector: 'Consumer' },
  { symbol: 'BAJFINANCE', company_name: 'Bajaj Finance', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'MARUTI', company_name: 'Maruti Suzuki', exchange: 'NSE', sector: 'Auto' },
  { symbol: 'SUNPHARMA', company_name: 'Sun Pharma', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'TATAMOTORS', company_name: 'Tata Motors', exchange: 'NSE', sector: 'Auto' },
  { symbol: 'AXISBANK', company_name: 'Axis Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'KOTAKBANK', company_name: 'Kotak Mahindra Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'ULTRACEMCO', company_name: 'UltraTech Cement', exchange: 'NSE', sector: 'Infra' },
  { symbol: 'ASIANPAINT', company_name: 'Asian Paints', exchange: 'NSE', sector: 'Consumer' },
  { symbol: 'NESTLEIND', company_name: 'Nestlé India', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'M&M', company_name: 'Mahindra & Mahindra', exchange: 'NSE', sector: 'Auto' },
  { symbol: 'JSWSTEEL', company_name: 'JSW Steel', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'TATASTEEL', company_name: 'Tata Steel', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'HCLTECH', company_name: 'HCL Technologies', exchange: 'NSE', sector: 'IT' },
  { symbol: 'ADANIPORTS', company_name: 'Adani Ports', exchange: 'NSE', sector: 'Infra' },
  { symbol: 'DLF', company_name: 'DLF Limited', exchange: 'NSE', sector: 'Real Estate' },
  { symbol: 'HINDALCO', company_name: 'Hindalco Industries', exchange: 'NSE', sector: 'Metals' },
  { symbol: 'EICHERMOT', company_name: 'Eicher Motors', exchange: 'NSE', sector: 'Auto' },
  { symbol: 'BRITANNIA', company_name: 'Britannia Industries', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'DIVISLAB', company_name: "Divi's Laboratories", exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'DRREDDY', company_name: "Dr. Reddy's Labs", exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'CIPLA', company_name: 'Cipla', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'APOLLOHOSP', company_name: 'Apollo Hospitals', exchange: 'NSE', sector: 'Healthcare' },
  { symbol: 'MARICO', company_name: 'Marico', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'DABUR', company_name: 'Dabur India', exchange: 'NSE', sector: 'FMCG' },
  { symbol: 'BEL', company_name: 'Bharat Electronics', exchange: 'NSE', sector: 'Defence' },
  { symbol: 'IOC', company_name: 'Indian Oil Corp', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'GAIL', company_name: 'GAIL (India)', exchange: 'NSE', sector: 'Energy' },
  { symbol: 'HEROMOTOCO', company_name: 'Hero MotoCorp', exchange: 'NSE', sector: 'Auto' },
  { symbol: 'DMART', company_name: 'Avenue Supermarts', exchange: 'NSE', sector: 'Retail' },
  { symbol: 'ZOMATO', company_name: 'Zomato', exchange: 'NSE', sector: 'Consumer' },
  { symbol: 'PNB', company_name: 'Punjab National Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'LUPIN', company_name: 'Lupin', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'BIOCON', company_name: 'Biocon', exchange: 'NSE', sector: 'Pharma' },
  { symbol: 'FEDERALBNK', company_name: 'Federal Bank', exchange: 'NSE', sector: 'Banking' },
  { symbol: 'COLPAL', company_name: 'Colgate-Palmolive', exchange: 'NSE', sector: 'FMCG' },
];

const SECTORS = ['IT', 'Banking', 'Pharma', 'Auto', 'FMCG', 'Infra', 'Energy', 'Metals', 'Telecom', 'Consumer', 'Fintech', 'Logistics', 'Real Estate', 'Retail'];
const STATUSES = ['upcoming', 'open', 'closed', 'listing'];

function nextIpoDate(index: number): string {
  const d = new Date();
  d.setDate(d.getDate() + 3 + index * 4 + Math.floor(Math.random() * 3));
  return d.toISOString().split('T')[0];
}

function randomPriceBand(): string {
  const lo = Math.round((50 + Math.random() * 450) / 5) * 5;
  const hi = lo + Math.round((20 + Math.random() * 80) / 5) * 5;
  return `₹${lo} – ₹${hi}`;
}

function randomLotSize(): number {
  const sizes = [30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 100, 120, 150, 200, 300, 500, 1000];
  return sizes[Math.floor(Math.random() * sizes.length)];
}

function minInvestmentFrom(priceBand: string, lotSize: number): number {
  const match = priceBand.match(/₹(\d+)/);
  if (!match) return 15000;
  return parseInt(match[1]) * lotSize;
}

function guessIssueType(name: string): string {
  return name.toLowerCase().includes('sme') ? 'sme' : 'mainboard';
}

function generateIpos(): any[] {
  const ipos: any[] = [];
  for (let i = 0; i < FALLBACK_STOCKS.length; i++) {
    const stock = FALLBACK_STOCKS[i];
    const priceBand = randomPriceBand();
    const lotSize = randomLotSize();
    const issueType = guessIssueType(stock.company_name);
    const statusIdx = i < 5 ? 2 : i < 8 ? 1 : 0;
    const status = STATUSES[Math.min(statusIdx, STATUSES.length - 1)];

    ipos.push({
      id: i + 1,
      symbol: stock.symbol,
      company_name: stock.company_name,
      exchange: stock.exchange,
      ipo_date: nextIpoDate(i),
      issue_type: issueType,
      price_band: priceBand,
      lot_size: lotSize,
      min_investment: minInvestmentFrom(priceBand, lotSize),
      sector: stock.sector,
      status,
      description: `${issueType === 'sme' ? 'SME' : ''} IPO of ${stock.company_name} — ${stock.sector}`,
      source: 'system',
    });
  }
  ipos.sort((a, b) => a.ipo_date.localeCompare(b.ipo_date));
  return ipos;
}

async function tryPersist(ipos: any[]) {
  try {
    await runSql(`
      CREATE TABLE IF NOT EXISTS public.upcoming_ipos (
        id BIGSERIAL PRIMARY KEY,
        symbol TEXT NOT NULL,
        company_name TEXT DEFAULT '',
        exchange TEXT DEFAULT 'NSE',
        ipo_date DATE NOT NULL,
        issue_type TEXT DEFAULT 'mainboard',
        price_band TEXT DEFAULT '',
        lot_size INT DEFAULT 0,
        min_investment INT DEFAULT 0,
        sector TEXT DEFAULT '',
        status TEXT DEFAULT 'upcoming',
        description TEXT DEFAULT '',
        source TEXT DEFAULT 'system',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_upcoming_ipos_date ON public.upcoming_ipos (ipo_date DESC);
      CREATE INDEX IF NOT EXISTS idx_upcoming_ipos_symbol ON public.upcoming_ipos (symbol);
      CREATE INDEX IF NOT EXISTS idx_upcoming_ipos_status ON public.upcoming_ipos (status);
      ALTER TABLE public.upcoming_ipos ENABLE ROW LEVEL SECURITY;
    `);
    if (supabaseAdmin) {
      const BATCH = 50;
      for (let i = 0; i < ipos.length; i += BATCH) {
        await supabaseAdmin.from('upcoming_ipos').upsert(
          ipos.slice(i, i + BATCH).map(({ id, ...rest }) => rest),
          { onConflict: 'symbol,ipo_date', ignoreDuplicates: true }
        );
      }
    }
  } catch (e) {
    console.error('Failed to persist IPOs:', e);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const forceRefresh = searchParams.get('refresh') === 'true';

  const ipos = generateIpos();

  /* Try to persist to DB (fire-and-forget) */
  if (!forceRefresh) {
    tryPersist(ipos);
  }

  return NextResponse.json({ ipos, source: 'generated', count: ipos.length });
}
