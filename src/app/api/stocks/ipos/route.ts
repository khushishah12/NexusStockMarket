import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { runSql } from '@/lib/run-sql';

export const dynamic = 'force-dynamic';

const NEWSAPI_KEY = process.env.NEWSAPI_KEY || '';

const SECTORS = [
  'Fintech', 'Jewellery', 'IT', 'Cruise Tourism', 'Packaging',
  'Metals & Mining', 'Healthcare', 'FMCG', 'Energy', 'Dairy',
  'Quick Commerce', 'E-commerce', 'Stock Exchange', 'Manufacturing',
];

interface IpoDef {
  symbol: string;
  company_name: string;
  exchange: string;
  open_date: string;
  close_date: string;
  listing_date: string;
  issue_type: string;
  price_band: string;
  lot_size: number;
  issue_size_cr: number;
  sector: string;
  status: string;
}

const CURATED_IPOS: IpoDef[] = [
  {
    symbol: 'TURTLEMINT',
    company_name: 'Turtlemint Fintech Solutions',
    exchange: 'NSE',
    open_date: '2026-06-19',
    close_date: '2026-06-22',
    listing_date: '2026-06-26',
    issue_type: 'mainboard',
    price_band: '₹144 – ₹152',
    lot_size: 100,
    issue_size_cr: 883,
    sector: 'Fintech',
    status: 'upcoming',
  },
  {
    symbol: 'ADVITJEWELS',
    company_name: 'Advit Jewels',
    exchange: 'NSE',
    open_date: '2026-06-23',
    close_date: '2026-06-25',
    listing_date: '2026-07-01',
    issue_type: 'mainboard',
    price_band: '₹130 – ₹165',
    lot_size: 100,
    issue_size_cr: 180,
    sector: 'Jewellery',
    status: 'upcoming',
  },
  {
    symbol: 'CORDELIA',
    company_name: 'Waterways Leisure Tourism (Cordelia Cruises)',
    exchange: 'NSE',
    open_date: '2026-06-24',
    close_date: '2026-06-26',
    listing_date: '2026-07-02',
    issue_type: 'mainboard',
    price_band: '₹185 – ₹210',
    lot_size: 70,
    issue_size_cr: 727,
    sector: 'Cruise Tourism',
    status: 'upcoming',
  },
  {
    symbol: 'KNACKPACK',
    company_name: 'Knack Packaging',
    exchange: 'BSE',
    open_date: '2026-06-26',
    close_date: '2026-06-30',
    listing_date: '2026-07-04',
    issue_type: 'mainboard',
    price_band: '₹95 – ₹110',
    lot_size: 120,
    issue_size_cr: 250,
    sector: 'Packaging',
    status: 'upcoming',
  },
  {
    symbol: 'ZEPTO',
    company_name: 'Zepto',
    exchange: 'NSE',
    open_date: '2026-07-10',
    close_date: '2026-07-14',
    listing_date: '2026-07-18',
    issue_type: 'mainboard',
    price_band: '₹350 – ₹380',
    lot_size: 40,
    issue_size_cr: 6000,
    sector: 'Quick Commerce',
    status: 'upcoming',
  },
  {
    symbol: 'MILKYMIST',
    company_name: 'Milky Mist Dairy Food',
    exchange: 'NSE',
    open_date: '2026-07-06',
    close_date: '2026-07-08',
    listing_date: '2026-07-14',
    issue_type: 'mainboard',
    price_band: '₹175 – ₹195',
    lot_size: 75,
    issue_size_cr: 2035,
    sector: 'Dairy',
    status: 'upcoming',
  },
  {
    symbol: 'SHIPROCKET',
    company_name: 'Shiprocket',
    exchange: 'NSE',
    open_date: '2026-07-15',
    close_date: '2026-07-17',
    listing_date: '2026-07-23',
    issue_type: 'mainboard',
    price_band: '₹250 – ₹275',
    lot_size: 50,
    issue_size_cr: 3200,
    sector: 'E-commerce',
    status: 'upcoming',
  },
  {
    symbol: 'ZETWERK',
    company_name: 'Zetwerk',
    exchange: 'NSE',
    open_date: '2026-08-05',
    close_date: '2026-08-07',
    listing_date: '2026-08-14',
    issue_type: 'mainboard',
    price_band: '₹280 – ₹310',
    lot_size: 45,
    issue_size_cr: 4500,
    sector: 'Manufacturing',
    status: 'upcoming',
  },
  {
    symbol: 'CMRGREEN',
    company_name: 'CMR Green Technologies',
    exchange: 'NSE',
    open_date: '2026-06-03',
    close_date: '2026-06-05',
    listing_date: '2026-06-11',
    issue_type: 'mainboard',
    price_band: '₹145 – ₹150',
    lot_size: 100,
    issue_size_cr: 631,
    sector: 'Metals & Mining',
    status: 'listing',
  },
  {
    symbol: 'HEXANUTR',
    company_name: 'Hexagon Nutrition',
    exchange: 'NSE',
    open_date: '2026-06-05',
    close_date: '2026-06-09',
    listing_date: '2026-06-12',
    issue_type: 'mainboard',
    price_band: '₹42 – ₹45',
    lot_size: 300,
    issue_size_cr: 139,
    sector: 'Healthcare',
    status: 'listing',
  },
  {
    symbol: 'NSE',
    company_name: 'National Stock Exchange of India',
    exchange: 'NSE',
    open_date: '2026-08-20',
    close_date: '2026-08-22',
    listing_date: '2026-08-29',
    issue_type: 'mainboard',
    price_band: '₹2200 – ₹2500',
    lot_size: 6,
    issue_size_cr: 30000,
    sector: 'Stock Exchange',
    status: 'upcoming',
  },
];

function getStatus(ipo: IpoDef): string {
  const now = new Date().toISOString().split('T')[0];
  if (ipo.listing_date < now) return 'listing';
  if (ipo.close_date < now) return 'closed';
  if (ipo.open_date <= now && ipo.close_date >= now) return 'open';
  if (ipo.open_date > now) return 'upcoming';
  return 'upcoming';
}

async function fetchNewsIpos(): Promise<any[]> {
  const newsIpos: any[] = [];
  if (!NEWSAPI_KEY) return newsIpos;

  try {
    const res = await fetch(
      `https://newsapi.org/v2/everything?q=India+IPO&sortBy=publishedAt&pageSize=50&language=en&apiKey=${NEWSAPI_KEY}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return newsIpos;
    const data = await res.json();
    if (!data.articles?.length) return newsIpos;

    for (const article of data.articles) {
      const title = (article.title || '') as string;
      const desc = (article.description || '') as string;
      const text = `${title} ${desc}`;

      const ipoMatch = text.match(/([A-Z][A-Za-z\s&.]+)\s+(?:to\s+)?(?:launch|file|open|list)\s+(?:its\s+)?IPO/i);
      if (!ipoMatch) continue;

      const rawName = ipoMatch[1].trim().replace(/\s+IPO.*/, '').trim();
      if (rawName.length < 3) continue;

      let dateStr = '';
      const dateMatch = text.match(/IPO\s+(?:on|opens?|closes?)\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}/i);
      if (dateMatch) {
        dateStr = dateMatch[0];
      }

      const priceMatch = text.match(/₹\s*(\d+)\s*[–-]\s*₹\s*(\d+)/);
      const priceBand = priceMatch ? `₹${priceMatch[1]} – ₹${priceMatch[2]}` : '';
      const sizeMatch = text.match(/(?:₹|Rs\.)\s*(\d[\d,]*)\s*(?:cr|crore|Cr)/i);
      const minInv = priceMatch ? parseInt(priceMatch[1]) * 100 : 0;

      newsIpos.push({
        symbol: rawName.replace(/[^A-Z]/g, '').slice(0, 15) || 'IPO',
        company_name: rawName,
        exchange: 'NSE/BSE',
        ipo_date: dateStr || 'TBD',
        issue_type: 'mainboard',
        price_band: priceBand || 'TBD',
        lot_size: 0,
        min_investment: minInv,
        sector: 'General',
        status: 'upcoming',
        description: `Upcoming IPO of ${rawName} — sourced from news`,
        source: 'newsapi',
      });
    }
  } catch {
    /* silent */
  }

  return newsIpos;
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

function computeMinInv(priceBand: string, lotSize: number): number {
  const match = priceBand.match(/₹(\d+)/);
  if (!match || !lotSize) return 0;
  return parseInt(match[1]) * lotSize;
}

async function loadFromDb(): Promise<any[] | null> {
  try {
    if (!supabaseAdmin) return null;
    const { data } = await supabaseAdmin
      .from('upcoming_ipos')
      .select('*')
      .order('ipo_date', { ascending: true })
      .limit(100);
    return data?.length ? data.map(r => ({ ...r, ipo_date: r.ipo_date?.split('T')[0] || r.ipo_date })) : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (!forceRefresh) {
    const cached = await loadFromDb();
    if (cached) {
      return NextResponse.json({ ipos: cached, source: 'database', count: cached.length });
    }
  }

  const enriched = CURATED_IPOS.map((ipo, i) => {
    const status = getStatus(ipo);
    return {
      id: i + 1,
      symbol: ipo.symbol,
      company_name: ipo.company_name,
      exchange: ipo.exchange,
      ipo_date: ipo.open_date,
      issue_type: ipo.issue_type,
      price_band: ipo.price_band,
      lot_size: ipo.lot_size,
      min_investment: computeMinInv(ipo.price_band, ipo.lot_size),
      sector: ipo.sector,
      status,
      description: `${ipo.issue_type === 'sme' ? 'SME ' : ''}IPO of ${ipo.company_name} — ${ipo.sector}. Opens: ${ipo.open_date}, Closes: ${ipo.close_date}, Listing: ${ipo.listing_date}`,
      source: 'curated',
    };
  });

  enriched.sort((a, b) => a.ipo_date.localeCompare(b.ipo_date));

  const newsIpos = await fetchNewsIpos();

  const allIpos = [...enriched, ...newsIpos];

  tryPersist(allIpos);

  return NextResponse.json({ ipos: enriched, newsDiscovered: newsIpos.length, source: 'curated', count: enriched.length });
}
