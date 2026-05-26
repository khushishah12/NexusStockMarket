// src/pages/api/stock/list.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/lib/supabase/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('stocks')
    .select('symbol,company_name,exchange,sector');

  if (error) {
    console.error('Supabase error fetching stocks:', error);
    return res.status(500).json({ error: 'Failed to fetch stocks' });
  }

  return res.status(200).json({ stocks: data });
}
