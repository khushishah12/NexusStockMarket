CREATE TABLE IF NOT EXISTS public.earnings_calendar (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  company_name TEXT DEFAULT '',
  exchange TEXT DEFAULT 'NSE',
  event_date DATE NOT NULL,
  event_time TEXT DEFAULT 'not_specified',
  event_type TEXT DEFAULT 'quarterly_results',
  sector TEXT DEFAULT '',
  quarter TEXT DEFAULT '',
  fiscal_year INT DEFAULT 0,
  description TEXT DEFAULT '',
  source TEXT DEFAULT 'yahoo_finance',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_earnings_calendar_date ON public.earnings_calendar (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_calendar_symbol ON public.earnings_calendar (symbol);
CREATE INDEX IF NOT EXISTS idx_earnings_calendar_source ON public.earnings_calendar (source);

ALTER TABLE public.earnings_calendar ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Earnings calendar is publicly readable"
      ON public.earnings_calendar FOR SELECT
      USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Service role can insert earnings"
      ON public.earnings_calendar FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Service role can update earnings"
      ON public.earnings_calendar FOR UPDATE
      USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Service role can delete earnings"
      ON public.earnings_calendar FOR DELETE
      USING (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

GRANT SELECT ON public.earnings_calendar TO anon, authenticated;
