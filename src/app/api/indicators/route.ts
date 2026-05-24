import { NextResponse } from 'next/server';
import { mockIndicators } from '../../../lib/mockData';

export async function GET() {
  // Returns RSI, MACD, and EMA charts
  return NextResponse.json(mockIndicators);
}
