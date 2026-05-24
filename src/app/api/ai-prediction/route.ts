import { NextResponse } from 'next/server';
import { mockAISignal } from '../../../lib/mockData';

export async function GET() {
  // Queries Supabase or runs an AI inference placeholder
  return NextResponse.json(mockAISignal);
}
