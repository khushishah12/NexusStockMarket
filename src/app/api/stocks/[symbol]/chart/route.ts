import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

export const dynamic = 'force-dynamic'; // always fresh

export async function GET(request: Request, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol missing' }, { status: 400 });
  }

  try {
    // Fetch 1 month historical data
    const now = Math.floor(Date.now() / 1000);
    const monthAgo = now - 30 * 24 * 60 * 60;
    const chartData = await yahooFinance.chart(symbol, {
      period1: monthAgo,
      period2: now,
      interval: '1d',
      return: 'object',
    });

    if (!chartData || !chartData.timestamp || !chartData.indicators?.quote?.[0]?.close) {
      return NextResponse.json({ error: 'No chart data' }, { status: 404 });
    }

    const timestamps = chartData.timestamp.map((t: number) => new Date(t * 1000).toISOString().split('T')[0]);
    const prices = chartData.indicators.quote[0].close;

    const chartConfig = {
      type: 'line',
      data: {
        labels: timestamps,
        datasets: [
          {
            label: `${symbol} Price`,
            data: prices,
            borderColor: 'rgba(255,255,255,0.8)',
            fill: false,
          },
        ],
      },
      options: {
        plugins: { legend: { labels: { color: '#fff' } } },
        scales: { x: { ticks: { color: '#fff' }, grid: { display: false } }, y: { ticks: { color: '#fff' }, grid: { display: false } } },
        backgroundColor: 'transparent',
      },
    };

    const quickChartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}`;

    return NextResponse.json({ chartUrl: quickChartUrl }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Chart API error:', err);
    return NextResponse.json({ error: 'Failed to generate chart' }, { status: 500 });
  }
}
