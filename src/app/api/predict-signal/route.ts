import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import YahooFinance from 'yahoo-finance2';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const yahooFinance = new YahooFinance();

const LABELS = ['BUY', 'HOLD', 'SELL'] as const;

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function safeGet(obj: any, p: string, fallback: any = null) {
  try { return p.split('.').reduce((a, k) => a?.[k], obj) ?? fallback; }
  catch { return fallback; }
}

async function fetchFeatures(symbol: string): Promise<Record<string, number>> {
  const [quoteResult, qsResult] = await Promise.all([
    yahooFinance.quote(symbol).catch(() => null),
    yahooFinance.quoteSummary(symbol, {
      modules: ['financialData', 'defaultKeyStatistics', 'summaryDetail'],
    }).catch(() => null),
  ]);

  const fd = safeGet(qsResult, 'quoteSummary.result[0].financialData', {});
  const dks = safeGet(qsResult, 'quoteSummary.result[0].defaultKeyStatistics', {});
  const sd = safeGet(qsResult, 'quoteSummary.result[0].summaryDetail', {});

  /* ── Extract raw metrics with smart fallbacks ── */

  const price = quoteResult?.regularMarketPrice ?? sd.regularMarketPrice?.raw ?? 100;
  const prevClose = quoteResult?.regularMarketPreviousClose ?? sd.previousClose?.raw ?? price;

  let pe = quoteResult?.trailingPE ?? sd.trailingPE?.raw ?? dks.trailingPE?.raw ?? fd.trailingPE?.raw;
  if (pe === null || pe === undefined || pe <= 0) pe = null;

  let pb = fd.priceToBook?.raw ?? dks.priceToBook?.raw;
  if (pb === null || pb === undefined || pb <= 0) pb = null;

  let roe = fd.returnOnEquity?.raw ?? fd.returnOnEquityTTM?.raw ?? dks.returnOnEquity?.raw;
  if (roe === null || roe === undefined) roe = null;

  let de = fd.debtToEquity?.raw;
  if (de === null || de === undefined || de < 0) de = null;

  let profitMargin = fd.profitMargins?.raw;
  if (profitMargin === null || profitMargin === undefined) profitMargin = null;

  let earningsGrowth = fd.earningsGrowth?.raw;
  if (earningsGrowth === null || earningsGrowth === undefined) earningsGrowth = null;

  let revenueGrowth = fd.revenueGrowth?.raw;
  if (revenueGrowth === null || revenueGrowth === undefined) revenueGrowth = null;

  /* ── Sector-aware dynamic defaults when Yahoo returns null ── */

  const sector = quoteResult?.sector ?? safeGet(qsResult, 'quoteSummary.result[0].summaryProfile.sector', '');
  const industry = quoteResult?.industry ?? safeGet(qsResult, 'quoteSummary.result[0].summaryProfile.industry', '');

  const marketCap = quoteResult?.marketCap ?? sd.marketCap?.raw ?? 0;
  const isLargeCap = marketCap > 500_000_000_000;

  const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

  if (pe === null) {
    pe = isLargeCap ? 22 : 18;
  }
  if (pb === null) {
    pb = sector.includes('Bank') || sector.includes('Financial') ? 2.5 : isLargeCap ? 4 : 3;
  }
  if (roe === null) {
    roe = sector.includes('Bank') || sector.includes('Financial') ? 12 : isLargeCap ? 18 : 14;
  }
  if (de === null) {
    de = sector.includes('Bank') || sector.includes('Financial') ? 150 : sector.includes('Tech') || sector.includes('IT') ? 10 : 40;
  }
  if (profitMargin === null) {
    profitMargin = sector.includes('Bank') || sector.includes('Financial') ? 0.15 : sector.includes('Tech') || sector.includes('IT') ? 0.20 : 0.12;
  }
  if (earningsGrowth === null) {
    earningsGrowth = 0.08 + changePct * 0.001;
  }
  if (revenueGrowth === null) {
    revenueGrowth = 0.06 + changePct * 0.0008;
  }

  /* ── Compute scores ── */

  const normPE = clamp(100 - ((pe - 5) / 50) * 100, 0, 100);
  const normPB = clamp(100 - ((pb - 0.5) / 8) * 100, 0, 100);
  const peg = pe / (roe * 100 || 1);
  const normPEG = peg > 0 ? clamp(100 - peg * 20, 0, 100) : 50;
  const valuation_score = Math.round(normPE * 0.35 + normPB * 0.35 + normPEG * 0.30);

  const normDE = clamp(100 - (de / 250) * 100, 0, 100);
  const normPM = clamp(50 + profitMargin * 100, 0, 100);
  const financial_stability_score = Math.round(normDE * 0.5 + normPM * 0.5);

  const debt_risk_score = Math.round(clamp(100 - normDE, 0, 100));

  const normEG = clamp(50 + earningsGrowth * 80, 0, 100);
  const normRG = clamp(50 + revenueGrowth * 80, 0, 100);
  const growth_score = Math.round(normEG * 0.5 + normRG * 0.5);

  return {
    valuation_score,
    financial_stability_score,
    debt_risk_score,
    growth_score,
    roe: Math.round(roe * 100) / 100,
    pe_ratio: Math.round(pe * 100) / 100,
    pb_ratio: Math.round(pb * 100) / 100,
  };
}

function runPythonPrediction(features: Record<string, number>): Promise<any> {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), 'Models', 'predict.py');
    const pythonPath = 'C:\\Users\\KHUSHI\\AppData\\Local\\Programs\\Python\\Python313\\python.exe';

    const proc = spawn(pythonPath, [scriptPath], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (_d: Buffer) => {});

    proc.on('close', (code) => {
      if (code !== 0) {
        resolve({ signal: 'HOLD', confidence: 0.5, model: 'fallback' });
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch {
        resolve({ signal: 'HOLD', confidence: 0.5, model: 'fallback' });
      }
    });

    proc.on('error', () => {
      resolve({ signal: 'HOLD', confidence: 0.5, model: 'fallback' });
    });

    proc.stdin.write(JSON.stringify({ features }));
    proc.stdin.end();
  });
}

export async function POST(request: NextRequest) {
  try {
    const { symbol } = await request.json();
    if (!symbol) {
      return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
    }

    const features = await fetchFeatures(symbol);
    const prediction = await runPythonPrediction(features);

    return NextResponse.json({ symbol, features, prediction });
  } catch (err) {
    console.error('Predict-signal error:', err);
    return NextResponse.json({
      error: 'Prediction failed',
      prediction: { signal: 'HOLD', confidence: 0.5, model: 'fallback' },
    });
  }
}
