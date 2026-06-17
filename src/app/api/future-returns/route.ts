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

function mcapCategory(mcap: number): string {
  if (mcap >= 5_000_000_000_000) return 'Mega Cap';
  if (mcap >= 500_000_000_000) return 'Large Cap';
  if (mcap >= 50_000_000_000) return 'Mid Cap';
  return 'Small Cap';
}

async function fetchStockInfo(): Promise<any[]> {
  const stocks: any[] = [];
  const BATCH = 5;

  for (let i = 0; i < SYMBOLS.length; i += BATCH) {
    const batch = SYMBOLS.slice(i, i + BATCH);
    const results = await Promise.allSettled(batch.map(async (sym) => {
      try {
        const q = await yahooFinance.quote(sym);
        return {
          symbol: sym.replace('.NS', '').replace('.BO', ''),
          company: q.longName ?? q.shortName ?? sym.replace('.NS', ''),
          sector: q.sector ?? (q as any).sector ?? 'N/A',
          industry: q.industry ?? 'N/A',
          market_cap: q.marketCap ?? 0,
          price: q.regularMarketPrice ?? 0,
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

function runPython(symbols: string[]): Promise<any[]> {
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

    proc.stdin.write(JSON.stringify({ symbols }));
    proc.stdin.end();
  });
}

export async function GET() {
  try {
    const [stocks, predictions] = await Promise.all([
      fetchStockInfo(),
      runPython(SYMBOLS),
    ]);

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
