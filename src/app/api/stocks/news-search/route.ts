import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const q = request.nextUrl.searchParams.get('q') || '';
    if (!q.trim()) {
      return NextResponse.json({ results: [] });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ results: [] });
    }

    const term = `%${q.trim()}%`;
    const { data, error } = await supabaseAdmin
      .from('stocks')
      .select('company_name, symbol, exchange, sector')
      .or(`company_name.ilike.${term},symbol.ilike.${term}`)
      .limit(10);

    if (error) {
      console.error('Search error:', error);
      return NextResponse.json({ results: [] });
    }

    const results = data.map((s: any) => ({
      company_name: s.company_name || '',
      symbol: (s.symbol || '').replace('.NS', '').replace('.BO', ''),
      exchange: s.exchange || 'NSE',
      sector: s.sector || '',
    }));

    return NextResponse.json({ results });
  } catch (err) {
    console.error('News search API error:', err);
    return NextResponse.json({ results: [] });
  }
}
