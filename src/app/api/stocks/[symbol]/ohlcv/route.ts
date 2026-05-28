import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();
export const dynamic = 'force-dynamic';

type TF = '1D' | '5D' | '1M' | '6M' | '1Y' | '5Y' | 'MAX';
type YfInterval = '1d' | '1wk' | '1mo' | '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '5d' | '3mo';

function tfDays(tf: TF): number {
  if (tf === '1D') return 1;
  if (tf === '5D') return 5;
  if (tf === '1M') return 30;
  if (tf === '6M') return 180;
  if (tf === '1Y') return 365;
  if (tf === '5Y') return 1825;
  return 7300;
}

function tfInterval(tf: TF): YfInterval {
  if (tf === '1D') return '5m';
  if (tf === '5D') return '15m';
  if (tf === '1M') return '1h';
  if (tf === '6M' || tf === '1Y') return '1d';
  return '1wk';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol missing' }, { status: 400 });
  }

  const timeframe = (request.nextUrl.searchParams.get('timeframe') || '1M') as TF;

  try {
    const chartData = await yahooFinance.chart(symbol, {
      period1: Math.floor(Date.now() / 1000) - tfDays(timeframe) * 86400,
      interval: tfInterval(timeframe),
      return: 'object',
    }).catch(() => null);

    if (!chartData?.indicators?.quote?.[0]) {
      return NextResponse.json({ error: 'No OHLCV data' }, { status: 404 });
    }

    const q = chartData.indicators.quote[0];
    const timestamps = chartData.timestamp || [];

    const ohlcv = timestamps.map((t: number, i: number) => ({
      timestamp: t,
      open: (q.open?.[i] ?? 0),
      high: (q.high?.[i] ?? 0),
      low: (q.low?.[i] ?? 0),
      close: (q.close?.[i] ?? 0),
      volume: (q.volume?.[i] ?? 0),
    }));

    return NextResponse.json({ symbol, timeframe, ohlcv });
  } catch (err) {
    console.error('OHLCV API error:', err);
    return NextResponse.json({ error: 'Failed to fetch OHLCV data' }, { status: 500 });
  }
}
