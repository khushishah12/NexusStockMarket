import { NextResponse } from 'next/server';
import { mockNews } from '../../../lib/mockData';

export async function GET() {
  // Returns news headlines and sentiment classifications
  return NextResponse.json(mockNews);
}
