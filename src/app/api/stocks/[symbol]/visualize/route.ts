import { NextRequest, NextResponse } from 'next/server';
import { Chart, registerables } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { supabaseAdmin } from '@/lib/supabase';

Chart.register(...registerables);

export const dynamic = 'force-dynamic';

const BUCKET_NAME = 'charts';

async function ensureBucket() {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  if (!buckets?.find((b) => b.name === BUCKET_NAME)) {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
    });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { symbol } = await params;

    const body = await request.json();
    const { chart, width = 900, height = 420, timeframe = '1D' } = body;

    if (!chart || typeof chart !== 'object') {
      return NextResponse.json({ error: 'Missing or invalid "chart" config in request body' }, { status: 400 });
    }

    const chartJSNodeCanvas = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour: '#0f172a',
    });

    const buffer = await chartJSNodeCanvas.renderToBuffer(chart, 'image/png');

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase service role not configured' }, { status: 500 });
    }

    await ensureBucket();

    const safeSymbol = symbol.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `chart-${safeSymbol}-${timeframe}-${Date.now()}.png`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: 'image/png',
        upsert: false,
      });

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload chart to storage' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    return NextResponse.json({
      url: publicUrl,
      symbol,
      timeframe,
    });
  } catch (err) {
    console.error('Visualize error:', err);
    return NextResponse.json({ error: 'Failed to generate visualization' }, { status: 500 });
  }
}
