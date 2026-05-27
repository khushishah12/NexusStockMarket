import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { supabaseAdmin } from '@/lib/supabase';
import { runSql } from '@/lib/run-sql';
import { detectAllPatterns } from '@/lib/chart-patterns';

const yahooFinance = new YahooFinance();

export const dynamic = 'force-dynamic';

const ALL_TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'] as const;
type Timeframe = (typeof ALL_TIMEFRAMES)[number];
const DEFAULT_TIMEFRAMES: Timeframe[] = ['1D', '1M', '6M'];

function tfDays(tf: Timeframe): number {
  if (tf === '1D') return 1;
  if (tf === '5D') return 5;
  if (tf === '1M') return 30;
  if (tf === '6M') return 180;
  if (tf === '1Y') return 365;
  if (tf === '5Y') return 1825;
  return 7300;
}

function tfInterval(tf: Timeframe): '5m' | '15m' | '1h' | '1d' | '1wk' | '1mo' {
  if (tf === '1D') return '5m';
  if (tf === '5D') return '15m';
  if (tf === '1M') return '1h';
  if (tf === '6M' || tf === '1Y') return '1d';
  return '1wk';
}

async function ensureTable(): Promise<boolean> {
  const sql = `
    CREATE TABLE IF NOT EXISTS pattern_detections (
      id BIGSERIAL PRIMARY KEY,
      symbol TEXT NOT NULL,
      timeframe TEXT NOT NULL,
      pattern_name TEXT NOT NULL,
      start_index INT,
      end_index INT,
      confidence INT,
      highlight_polygon JSONB,
      anchor_points JSONB,
      explanation TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_pattern_detections_symbol ON pattern_detections(symbol);
  `;
  return runSql(sql);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  if (!symbol) {
    return NextResponse.json({ error: 'Symbol missing' }, { status: 400 });
  }

  const timeframe = request.nextUrl.searchParams.get('timeframe');

  try {
    await ensureTable();

    const timeframesToScan = timeframe ? [timeframe as Timeframe] : [...DEFAULT_TIMEFRAMES];

    const chartPromises = timeframesToScan.map((tf) =>
      yahooFinance.chart(symbol, {
        period1: Math.floor(Date.now() / 1000) - tfDays(tf) * 86400,
        interval: tfInterval(tf),
        return: 'object',
      }).catch(() => null)
    );

    const chartResults = await Promise.allSettled(chartPromises);

    const allPatterns: any[] = [];

    for (let i = 0; i < timeframesToScan.length; i++) {
      const tf = timeframesToScan[i];
      const result = chartResults[i];
      if (result.status !== 'fulfilled' || !result.value) continue;

      const chartData = result.value;
      if (!chartData?.indicators?.quote?.[0]) continue;

      const q = chartData.indicators.quote[0];
      if (!q.close || !q.open || !q.high || !q.low) continue;

      const ohlcv = {
        open: q.open.map((v: number | null) => v ?? 0),
        high: q.high.map((v: number | null) => v ?? 0),
        low: q.low.map((v: number | null) => v ?? 0),
        close: q.close.map((v: number | null) => v ?? 0),
        volume: (q.volume || []).map((v: number | null) => v ?? 0),
      };

      if (ohlcv.close.length < 20) continue;

      const patterns = detectAllPatterns(ohlcv, tf);
      allPatterns.push(...patterns);

      // Store to Supabase
      if (supabaseAdmin && patterns.length > 0) {
        const rows = patterns.map((p) => ({
          symbol,
          timeframe: tf,
          pattern_name: p.pattern_name,
          start_index: p.pattern_region.start_index,
          end_index: p.pattern_region.end_index,
          confidence: p.confidence_percent,
          highlight_polygon: JSON.stringify(p.highlight_polygon),
          anchor_points: JSON.stringify(p.anchor_points),
          explanation: p.explanation,
          created_at: new Date().toISOString(),
        }));

        // Batch insert in chunks of 10
        for (let j = 0; j < rows.length; j += 10) {
          const chunk = rows.slice(j, j + 10);
          try { await supabaseAdmin.from('pattern_detections').insert(chunk); } catch {}
        }
      }
    }

    // Sort by confidence descending
    allPatterns.sort((a, b) => b.confidence_percent - a.confidence_percent);

    // Cap at 20 most confident patterns
    const topPatterns = allPatterns.slice(0, 20);

    const response = {
      symbol,
      patterns: topPatterns.map((p) => ({
        pattern_name: p.pattern_name,
        category: p.category,
        confidence_percent: p.confidence_percent,
        detected_on_timeframe: p.detected_on_timeframe,
        pattern_region: p.pattern_region,
        anchor_points: p.anchor_points,
        highlight_polygon: p.highlight_polygon,
        explanation: p.explanation,
        theoretical_target_price: p.theoretical_target_price,
        risk_level: p.risk_level,
        stoploss: p.stoploss,
        suitable_for_intraday: p.suitable_for_intraday,
        suitable_for_swing: p.suitable_for_swing,
      })),
    };

    return NextResponse.json(response, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Patterns API error:', err);
    return NextResponse.json({ error: 'Failed to detect patterns' }, { status: 500 });
  }
}
