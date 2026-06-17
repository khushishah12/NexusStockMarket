import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface PricePoint {
  date: string;
  close: number;
}

interface MonthlyValue {
  date: string;
  portfolio: number;
  invested: number;
}

interface DataPoint {
  date: string;
  portfolio: number;
  benchmark: number;
}

async function fetchDailyPrices(symbol: string, period1: number, period2: number): Promise<PricePoint[]> {
  const chart = await yahooFinance.chart(symbol, { period1, period2, interval: '1d', return: 'object' }).catch(() => null);
  if (!chart?.indicators?.quote?.[0]) return [];
  const q = chart.indicators.quote[0];
  const ts = chart.timestamp || [];
  const result: PricePoint[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close?.[i];
    if (c && c > 0) {
      result.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), close: c });
    }
  }
  return result;
}

function computeSchedule(prices: PricePoint[], mode: 'lumpsum' | 'sip', amount: number): {
  totalInvested: number;
  finalValue: number;
  monthlyValues: MonthlyValue[];
} {
  if (prices.length === 0) return { totalInvested: 0, finalValue: 0, monthlyValues: [] };

  let cumUnits = 0;
  let cumInvested = 0;
  let prevMonth = '';
  const monthlyValues: MonthlyValue[] = [];

  for (let i = 0; i < prices.length; i++) {
    const { date, close } = prices[i];
    const monthKey = date.slice(0, 7);

    if (mode === 'lumpsum') {
      if (i === 0) {
        cumUnits = amount / close;
        cumInvested = amount;
      }
    } else {
      if (monthKey !== prevMonth) {
        cumUnits += amount / close;
        cumInvested += amount;
      }
    }
    prevMonth = monthKey;

    const nextMonth = i < prices.length - 1 ? prices[i + 1].date.slice(0, 7) : null;
    if (monthKey !== nextMonth) {
      monthlyValues.push({ date, portfolio: cumUnits * close, invested: cumInvested });
    }
  }

  const last = monthlyValues[monthlyValues.length - 1];
  return {
    totalInvested: last?.invested ?? 0,
    finalValue: last?.portfolio ?? 0,
    monthlyValues,
  };
}

function getNearestPrice(prices: PricePoint[], targetDate: string): number | null {
  const exact = prices.find(p => p.date === targetDate);
  if (exact) return exact.close;
  const target = new Date(targetDate).getTime();
  let best: number | null = null;
  let bestDiff = Infinity;
  for (const p of prices) {
    const diff = Math.abs(new Date(p.date).getTime() - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = p.close;
    }
  }
  return bestDiff < 86400000 * 14 ? best : null;
}

export async function POST(request: NextRequest) {
  try {
    const { symbol, amount, startDate, endDate: rawEnd, mode = 'lumpsum' } = await request.json();

    if (!symbol || !amount || !startDate) {
      return NextResponse.json({ error: 'symbol, amount, and startDate are required' }, { status: 400 });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = rawEnd ? new Date(rawEnd) : new Date();
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json({ error: 'Invalid date' }, { status: 400 });
    }
    if (start >= end) {
      return NextResponse.json({ error: 'startDate must be before endDate' }, { status: 400 });
    }

    const period1 = Math.floor(start.getTime() / 1000) - 86400 * 14;
    const period2 = Math.floor(end.getTime() / 1000) + 86400;

    const [stockPrices, benchPrices] = await Promise.all([
      fetchDailyPrices(symbol, period1, period2),
      fetchDailyPrices('^NSEI', period1, period2),
    ]);

    if (stockPrices.length < 5) {
      return NextResponse.json({ error: `No historical data found for "${symbol}"` }, { status: 404 });
    }

    const startStr = start.toISOString().slice(0, 10);
    const endStr = end.toISOString().slice(0, 10);
    const filtered = stockPrices.filter(p => p.date >= startStr && p.date <= endStr);

    if (filtered.length < 2) {
      return NextResponse.json({ error: 'Not enough trading days in selected date range' }, { status: 400 });
    }

    const stockSchedule = computeSchedule(filtered, mode as 'lumpsum' | 'sip', amount);

    const benchFiltered = benchPrices.filter(p => p.date >= startStr && p.date <= endStr);
    let benchSchedule: { totalInvested: number; finalValue: number; monthlyValues: MonthlyValue[] };
    if (benchFiltered.length >= 2) {
      benchSchedule = computeSchedule(benchFiltered, mode as 'lumpsum' | 'sip', amount);
    } else {
      benchSchedule = { totalInvested: stockSchedule.totalInvested, finalValue: stockSchedule.totalInvested, monthlyValues: [] };
    }

    const dataPoints: DataPoint[] = stockSchedule.monthlyValues.map((mv) => {
      const benchMv = benchSchedule.monthlyValues.find(b => b.date === mv.date);
      const benchmark = benchMv
        ? benchMv.portfolio
        : (() => {
            const nearest = getNearestPrice(benchFiltered, mv.date);
            if (nearest && benchFiltered.length > 0) {
              const firstBench = benchFiltered[0].close;
              const benchUnits = amount / firstBench;
              return benchUnits * nearest;
            }
            return 0;
          })();
      return { date: mv.date, portfolio: Math.round(mv.portfolio * 100) / 100, benchmark: Math.round(benchmark * 100) / 100 };
    });

    const { totalInvested, finalValue } = stockSchedule;
    const years = (end.getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const percentReturn = totalInvested > 0 ? ((finalValue - totalInvested) / totalInvested) * 100 : 0;
    const cagr = totalInvested > 0 && years > 0.1
      ? (Math.pow(finalValue / totalInvested, 1 / years) - 1) * 100
      : percentReturn;

    const benchValue = benchSchedule.finalValue;
    const benchReturn = benchSchedule.totalInvested > 0
      ? ((benchValue - benchSchedule.totalInvested) / benchSchedule.totalInvested) * 100
      : 0;

    const qArr = await yahooFinance.quote([symbol]).catch(() => null);
    const quote = qArr?.[0] ?? null;
    const lastClose = filtered[filtered.length - 1].close;

    return NextResponse.json({
      symbol,
      company: quote?.longName ?? quote?.shortName ?? symbol,
      amount,
      startDate: startStr,
      endDate: endStr,
      mode,
      currentPrice: quote?.regularMarketPrice ?? lastClose,
      summary: {
        totalInvested: Math.round(totalInvested * 100) / 100,
        finalValue: Math.round(finalValue * 100) / 100,
        absoluteReturn: Math.round((finalValue - totalInvested) * 100) / 100,
        percentReturn: Math.round(percentReturn * 100) / 100,
        cagr: Math.round(cagr * 100) / 100,
        benchmarkValue: Math.round(benchValue * 100) / 100,
        benchmarkReturn: Math.round(benchReturn * 100) / 100,
        alpha: Math.round((percentReturn - benchReturn) * 100) / 100,
      },
      dataPoints,
    });
  } catch (err) {
    console.error('What-If API error:', err);
    return NextResponse.json({ error: 'Failed to compute what-if scenario' }, { status: 500 });
  }
}
