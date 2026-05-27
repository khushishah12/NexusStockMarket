import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
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

function timeframeToInterval(tf: Timeframe): '1d' | '1wk' | '1mo' {
  if (tf === '5Y' || tf === 'MAX') return '1wk';
  return '1d';
}

const SECTOR_SYMBOLS: Record<string, string[]> = {
  Energy: ['RELIANCE.NS', 'ONGC.NS', 'BPCL.NS', 'IOC.NS', 'GAIL.NS', 'COALINDIA.NS', 'OIL.NS', 'PETRONET.NS'],
  IT: ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS', 'LTTS.NS', 'PERSISTENT.NS', 'MPHASIS.NS', 'MINDTECK.NS', 'COFORGE.NS', 'LTI.NS', 'HEXAWARE.NS', 'CYIENT.NS', 'ZENSARTECH.NS'],
  Finance: ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'AXISBANK.NS', 'KOTAKBANK.NS', 'BAJFINANCE.NS', 'INDUSINDBK.NS', 'BAJAJFINSV.NS', 'SBILIFE.NS', 'ICICIPRULI.NS', 'HDFCLIFE.NS', 'MUTHOOTFIN.NS', 'SRTRANSFIN.NS', 'PEL.NS'],
  Telecom: ['BHARTIARTL.NS', 'IDEA.NS', 'INDUSTOWER.NS', 'TATACOMM.NS', 'MTNL.NS'],
  'Consumer Goods': ['ITC.NS', 'HINDUNILVR.NS', 'NESTLEIND.NS', 'BRITANNIA.NS', 'DABUR.NS', 'MARICO.NS', 'GODREJCP.NS', 'COLPAL.NS', 'EMAMILTD.NS', 'PGHH.NS'],
  Construction: ['LT.NS', 'ULTRACEMCO.NS', 'GRASIM.NS', 'AMBUJACEM.NS', 'ACC.NS', 'SHREECEM.NS', 'DLF.NS', 'OBEROIRLTY.NS', 'PRESTIGE.NS', 'GODREJPROP.NS', 'BRIGADE.NS', 'SOBHA.NS'],
  Metals: ['TATASTEEL.NS', 'JSWSTEEL.NS', 'HINDALCO.NS', 'VEDL.NS', 'NATIONALUM.NS', 'NMDC.NS', 'HINDZINC.NS', 'SAIL.NS', 'JINDALSTEL.NS', 'APLAPOLLO.NS'],
  Auto: ['TATAMOTORS.NS', 'M&M.NS', 'MARUTI.NS', 'BAJAJ-AUTO.NS', 'EICHERMOT.NS', 'HEROMOTOCO.NS', 'TVSMOTOR.NS', 'ASHOKLEY.NS'],
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const sector = searchParams.get('sector');
    const timeframeParam = searchParams.get('timeframe') || '1D';

    if (!sector) {
      return NextResponse.json({ error: 'Missing sector query parameter' }, { status: 400 });
    }

    const tf = TIMEFRAMES.includes(timeframeParam as Timeframe)
      ? (timeframeParam as Timeframe)
      : '1D';

    let symbols: string[] = [];

    const { data: stocks, error: supabaseError } = await supabase
      .from('stocks')
      .select('symbol')
      .eq('sector', sector);

    if (!supabaseError && stocks && stocks.length > 0) {
      symbols = stocks.map((s: { symbol: string }) => s.symbol);
    } else {
      symbols = SECTOR_SYMBOLS[sector] ?? [];
    }

    if (symbols.length === 0) {
      return NextResponse.json({ error: `No symbols found for sector: ${sector}` }, { status: 404 });
    }

    const period1 = Math.floor(Date.now() / 1000) - timeframeToDays(tf) * 86400;
    const interval = timeframeToInterval(tf);

    const allTimestamps = new Set<number>();
    const seriesData: { symbol: string; data: { t: number; close: number }[] }[] = [];

    for (const symbol of symbols) {
      try {
        const result = await yahooFinance.chart(symbol, {
          period1,
          interval,
          return: 'object',
        });

        const timestamps = result.timestamp ?? [];
        const closes = result.indicators.quote[0]?.close ?? [];

        const points: { t: number; close: number }[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          if (closes[i] != null) {
            allTimestamps.add(timestamps[i]);
            points.push({ t: timestamps[i], close: closes[i]! });
          }
        }

        if (points.length > 0) {
          seriesData.push({ symbol, data: points });
        }
      } catch {
        // skip symbols that fail
      }
    }

    if (seriesData.length === 0) {
      return NextResponse.json({ error: 'No chart data available for this sector' }, { status: 404 });
    }

    const sortedTimestamps = [...allTimestamps].sort((a, b) => a - b);
    const labels = sortedTimestamps.map((t) => {
      const d = new Date(t * 1000);
      if (tf === '1D') return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      if (tf === '5D' || tf === '1M') return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
    });

    const datasets = seriesData.map((series) => {
      const valueMap = new Map(series.data.map((p) => [p.t, p.close]));
      return {
        label: series.symbol,
        data: sortedTimestamps.map((t) => valueMap.get(t) ?? null),
        fill: false,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      };
    });

    const colors = [
      '#22d3ee', '#34d399', '#fbbf24', '#f472b6', '#a78bfa',
      '#fb923c', '#4ade80', '#f87171', '#38bdf8', '#e879f9',
      '#2dd4bf', '#facc15', '#a3e635', '#c084fc', '#fb7185',
    ];
    datasets.forEach((ds, i) => {
      (ds as any).borderColor = colors[i % colors.length];
    });

    const chartConfig = {
      type: 'line',
      data: { labels, datasets },
      options: {
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: { color: '#e2e8f0', font: { size: 9 }, boxWidth: 12, padding: 8 },
          },
          title: {
            display: true,
            text: `${sector} - ${tf} Performance`,
            color: '#f1f5f9',
            font: { size: 14 },
          },
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8', font: { size: 9 } },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
          y: {
            ticks: { color: '#94a3b8', font: { size: 9 } },
            grid: { color: 'rgba(255,255,255,0.04)' },
          },
        },
        backgroundColor: '#0f172a',
      },
    };

    const chartUrl = 'https://quickchart.io/chart?c=' + encodeURIComponent(JSON.stringify(chartConfig));

    return NextResponse.json({
      sector,
      timeframe: tf,
      chart: chartUrl,
    });
  } catch (err) {
    console.error('Sector chart error:', err);
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 });
  }
}
