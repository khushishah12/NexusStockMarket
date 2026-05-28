import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .from('stocks')
    .select('symbol, exchange, company_name')
    .order('symbol', { ascending: true })
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
