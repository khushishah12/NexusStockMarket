import { NextResponse } from 'next/server';
import { mockCandles } from '../../../lib/mockData';

export async function GET() {
  // In a real application, this route would query the Supabase database:
  // const { data, error } = await supabase.from('candlestick_data').select('*').order('timestamp', { ascending: true });
  // If there's an error or no data, we fallback to mockCandles.
  
  return NextResponse.json(mockCandles);
}
