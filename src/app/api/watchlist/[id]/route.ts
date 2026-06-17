import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 500 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { symbol, exchange, notes } = body;

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('watchlist_items')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Watchlist item not found' }, { status: 404 });
    }

    const sym = symbol.trim().toUpperCase();

    const { data: duplicate } = await supabaseAdmin
      .from('watchlist_items')
      .select('id')
      .eq('user_id', user.id)
      .eq('symbol', sym)
      .neq('id', id)
      .maybeSingle();

    if (duplicate) {
      return NextResponse.json({ error: `${sym} is already in your watchlist` }, { status: 409 });
    }

    const { data, error } = await supabaseAdmin
      .from('watchlist_items')
      .update({
        symbol: sym,
        exchange: exchange || 'NSE',
        notes: notes || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ item: data });
  } catch (err) {
    console.error('Watchlist PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 500 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('watchlist_items')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Watchlist item not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('watchlist_items')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Watchlist DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
