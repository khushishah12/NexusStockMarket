CREATE TABLE IF NOT EXISTS public.upcoming_ipos (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  exchange TEXT DEFAULT 'NSE',
  ipo_date DATE NOT NULL,
  issue_type TEXT DEFAULT 'mainboard',
  price_band TEXT DEFAULT '',
  lot_size INT DEFAULT 0,
  min_investment INT DEFAULT 0,
  sector TEXT DEFAULT '',
  status TEXT DEFAULT 'upcoming',
  description TEXT DEFAULT '',
  source TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_upcoming_ipos_date ON public.upcoming_ipos (ipo_date DESC);
CREATE INDEX IF NOT EXISTS idx_upcoming_ipos_symbol ON public.upcoming_ipos (symbol);
CREATE INDEX IF NOT EXISTS idx_upcoming_ipos_status ON public.upcoming_ipos (status);

ALTER TABLE public.upcoming_ipos ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Upcoming IPOs are publicly readable"
      ON public.upcoming_ipos FOR SELECT
      USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Service role can insert IPOs"
      ON public.upcoming_ipos FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Service role can update IPOs"
      ON public.upcoming_ipos FOR UPDATE
      USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Service role can delete IPOs"
      ON public.upcoming_ipos FOR DELETE
      USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

GRANT SELECT ON public.upcoming_ipos TO anon, authenticated;
