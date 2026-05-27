import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export const dynamic = 'force-dynamic';

const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'] as const;
type Timeframe = (typeof TIMEFRAMES)[number];

function timeframeToDays(tf: Timeframe): number {
  switch (tf) {
    case '1D': return 1;
    case '5D': return 5;
    case '1M': return 30;
    case '6M': return 180;
    case '1Y': return 365;
    case '5Y': return 1825;
    case 'MAX': return 7300;
  }
}

function timeframeToInterval(tf: Timeframe): '1m' | '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo' {
  if (tf === '1D') return '5m';
  if (tf === '5D') return '15m';
  if (tf === '1M') return '1h';
  if (tf === '6M' || tf === '1Y') return '1d';
  return '1wk';
}

function buildChartUrl(symbol: string, tf: Timeframe, timestamps: string[], prices: (number | null)[]): string {
  const labels = timestamps.slice(-100);
  const data = prices.slice(-100);

  const colors: Record<string, string> = {
    '1D': '#22d3ee', '5D': '#34d399', '1M': '#fbbf24',
    '6M': '#f472b6', '1Y': '#a78bfa', '5Y': '#fb923c', 'MAX': '#4ade80',
  };

  const config = {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: `${symbol} (${tf})`,
        data,
        borderColor: colors[tf] ?? '#22d3ee',
        backgroundColor: colors[tf] ?? '#22d3ee',
        fill: false,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      }],
    },
    options: {
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
        y: { ticks: { color: '#94a3b8', font: { size: 9 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
      },
      backgroundColor: '#0f172a',
    },
  };

  return `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol missing' }, { status: 400 });
  }

  try {
    const [quoteResult, ...chartResults] = await Promise.all([
      yahooFinance.quote(symbol).catch(() => null),
      ...TIMEFRAMES.map((tf) =>
        yahooFinance.chart(symbol, {
          period1: Math.floor(Date.now() / 1000) - timeframeToDays(tf) * 86400,
          interval: timeframeToInterval(tf),
          return: 'object',
        }).catch(() => null)
      ),
    ]);

    const quote = quoteResult;
    const price = quote?.regularMarketPrice;
    const prevClose = quote?.regularMarketPreviousClose;
    const changePercent = price && prevClose && prevClose > 0
      ? parseFloat((((price - prevClose) / prevClose) * 100).toFixed(2))
      : null;
    const change = price && prevClose ? parseFloat((price - prevClose).toFixed(2)) : null;

    const charts: { timeframe: string; chartUrl: string | null }[] = [];

    for (let i = 0; i < TIMEFRAMES.length; i++) {
      const tf = TIMEFRAMES[i];
      const chartData = chartResults[i];
      if (chartData?.timestamp && chartData?.indicators?.quote?.[0]?.close) {
        const timestamps = chartData.timestamp.map((t: number) => {
          const d = new Date(t * 1000);
          if (tf === '1D') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
          return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
        });
        const prices = chartData.indicators.quote[0].close;
        charts.push({
          timeframe: tf,
          chartUrl: buildChartUrl(symbol, tf, timestamps, prices),
        });
      } else {
        charts.push({ timeframe: tf, chartUrl: null });
      }
    }

    return NextResponse.json({
      symbol: quote?.symbol ?? symbol,
      short_symbol: symbol.replace(/\.(NS|BO)$/, ''),
      exchange: symbol.endsWith('.BO') ? 'BSE' : 'NSE',
      company_name: quote?.longName ?? quote?.shortName ?? symbol,
      sector: quote?.summaryProfile?.sector ?? quote?.sector ?? 'N/A',
      industry: quote?.summaryProfile?.industry ?? quote?.industry ?? 'N/A',
      price: price ?? null,
      change,
      change_percent: changePercent,
      volume: quote?.regularMarketVolume ?? null,
      market_cap: quote?.marketCap ?? null,
      day_high: quote?.regularMarketDayHigh ?? null,
      day_low: quote?.regularMarketDayLow ?? null,
      fifty_two_week_high: quote?.fiftyTwoWeekHigh ?? null,
      fifty_two_week_low: quote?.fiftyTwoWeekLow ?? null,
      description: quote?.summaryProfile?.longBusinessSummary ?? null,
      charts,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Detail error:', err);
    return NextResponse.json({ error: 'Failed to fetch stock details' }, { status: 500 });
  }
}
