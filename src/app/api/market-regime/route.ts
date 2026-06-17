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
  'NTPC.NS', 'POWERGRID.NS',
];

async function fetchOHLCV(symbol: string): Promise<number[][] | null> {
  try {
    const hist = await yahooFinance.historical(symbol, {
      period1: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      interval: '1d',
    });
    if (!hist || hist.length < 30) return null;
    return hist.slice(-60).map(d => [
      d.open ?? 0,
      d.high ?? 0,
      d.low ?? 0,
      d.close ?? 0,
      d.volume ?? 0,
    ]);
  } catch {
    return null;
  }
}

function runPython(symbols: string[], ohlcvMap: Record<string, number[][]>): Promise<any[]> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'Models', 'regime_predict.py');
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
    const results = await runPython(SYMBOLS, {});
    const enriched = results.map((r: any) => {
      const base = SYMBOLS.find(s => s === r.symbol);
      return {
        symbol: r.symbol,
        regime: r.regime || 'NEUTRAL',
        confidence: r.confidence || 0,
        probabilities: r.probabilities || [33.3, 33.3, 33.3],
      };
    });
    return NextResponse.json({ predictions: enriched, updated_at: new Date().toISOString() });
  } catch (err) {
    console.error('Market regime error:', err);
    return NextResponse.json({ error: 'Failed to generate regime predictions' }, { status: 500 });
  }
}
