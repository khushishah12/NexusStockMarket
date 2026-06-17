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

// PATCH /api/portfolio/[id] — Sell a holding
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!supabaseAdmin) return NextResponse.json({ error: 'Service not configured' }, { status: 500 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { sell_price, sell_date, sell_quantity } = body;

    if (sell_price === undefined || sell_price === null || !sell_date) {
      return NextResponse.json({ error: 'Sell price and sell date are required' }, { status: 400 });
    }

    if (isNaN(Number(sell_price)) || Number(sell_price) < 0) {
      return NextResponse.json({ error: 'Sell price must be a non-negative number' }, { status: 400 });
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('portfolio_holdings')
      .select('id, status, quantity, stock_symbol, buy_price, buy_date, notes, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 });
    }

    if (existing.status === 'sold') {
      return NextResponse.json({ error: 'Holding is already sold' }, { status: 400 });
    }

    const sellQty = sell_quantity !== undefined && sell_quantity !== null
      ? Number(sell_quantity)
      : Number(existing.quantity);

    if (isNaN(sellQty) || sellQty <= 0) {
      return NextResponse.json({ error: 'Sell quantity must be a positive number' }, { status: 400 });
    }

    if (sellQty > Number(existing.quantity)) {
      return NextResponse.json({ error: 'Sell quantity exceeds holding quantity' }, { status: 400 });
    }

    if (sellQty < Number(existing.quantity)) {
      const remaining = Number(existing.quantity) - sellQty;

      const { error: updateError } = await supabaseAdmin
        .from('portfolio_holdings')
        .update({
          quantity: remaining,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

      const { data: soldRecord, error: insertError } = await supabaseAdmin
        .from('portfolio_holdings')
        .insert({
          user_id: existing.user_id,
          stock_symbol: existing.stock_symbol,
          quantity: sellQty,
          buy_price: Number(existing.buy_price),
          buy_date: existing.buy_date,
          notes: existing.notes || '',
          status: 'sold',
          sell_price: Number(sell_price),
          sell_date,
        })
        .select()
        .single();

      if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

      return NextResponse.json({ holding: soldRecord, partial: true, remaining });
    }

    const { data, error } = await supabaseAdmin
      .from('portfolio_holdings')
      .update({
        status: 'sold',
        sell_price: Number(sell_price),
        sell_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ holding: data });
  } catch (err) {
    console.error('Portfolio PATCH error:', err);
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
