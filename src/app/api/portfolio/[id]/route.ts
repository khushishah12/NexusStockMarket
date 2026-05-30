import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// PUT /api/portfolio/[id]
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 500 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { stock_symbol, quantity, buy_price, buy_date, notes } = body;

    if (!stock_symbol || !quantity || !buy_price || !buy_date) {
      return NextResponse.json({ error: 'Symbol, quantity, buy price, and buy date are required' }, { status: 400 });
    }

    if (isNaN(Number(quantity)) || Number(quantity) <= 0) {
      return NextResponse.json({ error: 'Quantity must be a positive number' }, { status: 400 });
    }
    if (isNaN(Number(buy_price)) || Number(buy_price) <= 0) {
      return NextResponse.json({ error: 'Buy price must be a positive number' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('portfolio_holdings')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('portfolio_holdings')
      .update({
        stock_symbol: stock_symbol.trim().toUpperCase(),
        quantity: Number(quantity),
        buy_price: Number(buy_price),
        buy_date,
        notes: notes || '',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ holding: data });
  } catch (err) {
    console.error('Portfolio PUT error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/portfolio/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 500 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('portfolio_holdings')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('portfolio_holdings')
      .delete()
      .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Portfolio DELETE error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
