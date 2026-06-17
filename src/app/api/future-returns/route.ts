import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import YahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const yahooFinance = new YahooFinance();

const SYMBOLS = [
  'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'INFY.NS',
  'BHARTIARTL.NS', 'ITC.NS', 'SBIN.NS', 'LT.NS', 'HINDUNILVR.NS',
  'BAJFINANCE.NS', 'KOTAKBANK.NS', 'AXISBANK.NS', 'ASIANPAINT.NS',
  'MARUTI.NS', 'SUNPHARMA.NS', 'TITAN.NS', 'ULTRACEMCO.NS',
  'NTPC.NS', 'POWERGRID.NS', 'WIPRO.NS', 'HCLTECH.NS',
  'TECHM.NS', 'NESTLEIND.NS', 'BAJAJFINSV.NS',
];

function safeGet(obj: any, p: string, f: any = null) {
  try { return p.split('.').reduce((a, k) => a?.[k], obj) ?? f; } catch { return f; }
}

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

async function fetchAllFeatures(): Promise<any[]> {
  const stocks: any[] = [];
  const BATCH = 5;

  for (let i = 0; i < SYMBOLS.length; i += BATCH) {
    const batch = SYMBOLS.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(async (sym) => {
      try {
        const q = await yahooFinance.quote(sym);
        const qs = await yahooFinance.quoteSummary(sym, {
          modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail', 'summaryProfile'],
        }).catch(() => null);
        const fd = safeGet(qs, 'quoteSummary.result[0].financialData', {});
        const dks = safeGet(qs, 'quoteSummary.result[0].defaultKeyStatistics', {});
        const sd = safeGet(qs, 'quoteSummary.result[0].summaryDetail', {});
        const sp = safeGet(qs, 'quoteSummary.result[0].summaryProfile', {});
        const sector = sp.sector || q.sector || 'N/A';
        const industry = sp.industry || q.industry || 'N/A';

        const pe = q.trailingPE ?? sd.trailingPE?.raw ?? dks.trailingPE?.raw ?? fd.trailingPE?.raw ?? 20;
        const pb = fd.priceToBook?.raw ?? dks.priceToBook?.raw ?? 3;
        const roe = fd.returnOnEquity?.raw ?? fd.returnOnEquityTTM?.raw ?? 0.15;
        const de = fd.debtToEquity?.raw ?? 50;
        const pm = fd.profitMargins?.raw ?? 0.10;
        const mcap = q.marketCap ?? sd.marketCap?.raw ?? 100_000_000_000;
        const rg = fd.revenueGrowth?.raw ?? 0.06;
        const eg = fd.earningsGrowth?.raw ?? 0.06;

        const normPE = clamp(100 - ((pe - 5) / 50) * 100, 0, 100);
        const normPB = clamp(100 - ((pb - 0.5) / 8) * 100, 0, 100);
        const peg = pe / (roe * 100 || 1);
        const normPEG = peg > 0 ? clamp(100 - peg * 20, 0, 100) : 50;
        const valuation_score = Math.round(normPE * 0.35 + normPB * 0.35 + normPEG * 0.30);

        const normDE = clamp(100 - (de / 250) * 100, 0, 100);
        const normPM = clamp(50 + pm * 100, 0, 100);
        const financial_stability_score = Math.round(normDE * 0.5 + normPM * 0.5);
        const debt_risk_score = Math.round(clamp(100 - normDE, 0, 100));

        const normEG = clamp(50 + eg * 80, 0, 100);
        const normRG = clamp(50 + rg * 80, 0, 100);
        const growth_score = Math.round(normEG * 0.5 + normRG * 0.5);

        return {
          symbol: sym.replace('.NS', '').replace('.BO', ''),
          company: q.longName ?? q.shortName ?? sym.replace('.NS', ''),
          features: {
            valuation_score,
            financial_stability_score,
            debt_risk_score,
            growth_score,
            pe_ratio: pe,
            pb_ratio: pb,
            roe: roe * 100,
            market_cap: mcap,
          },
          sector,
          industry,
          market_cap: mcap,
          price: q.regularMarketPrice,
        };
      } catch {
        return null;
      }
    }));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) stocks.push(r.value);
    }
  }
  return stocks;
}

function runPython(stocks: any[]): Promise<any[]> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'Models', 'future_returns_predict.py');
    const pythonPath = 'C:\\Users\\KHUSHI\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';
    const proc = spawn(pythonPath, [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', () => {});
    proc.on('close', (code) => {
      if (code !== 0) return resolve([]);
      try {
        const parsed = JSON.parse(stdout.trim());
        resolve(Array.isArray(parsed) ? parsed : []);
      } catch {
        resolve([]);
      }
    });
    proc.on('error', () => resolve([]));

    proc.stdin.write(JSON.stringify({ stocks }));
    proc.stdin.end();
  });
}

function mcapCategory(mcap: number): string {
  if (mcap >= 5_000_000_000_000) return 'Mega Cap';
  if (mcap >= 500_000_000_000) return 'Large Cap';
  if (mcap >= 50_000_000_000) return 'Mid Cap';
  return 'Small Cap';
}

export async function GET() {
  try {
    const stocks = await fetchAllFeatures();
    const predictions = await runPython(stocks);

    const enriched = predictions.map((r: any, i: number) => {
      const stock = stocks.find(s => s.symbol === r.symbol);
      return {
        ...r,
        recommendation: r.recommendation || 'Watchlist',
        sector: stock?.sector || 'N/A',
        industry: stock?.industry || 'N/A',
        market_cap: stock?.market_cap || 0,
        market_cap_category: mcapCategory(stock?.market_cap || 0),
        price: stock?.price || 0,
        rank: i + 1,
      };
    });

    return NextResponse.json({ predictions: enriched, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error('Future returns error:', err);
    return NextResponse.json({ error: 'Failed to generate predictions' }, { status: 500 });
  }
}
