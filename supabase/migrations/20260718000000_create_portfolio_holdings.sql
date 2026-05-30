CREATE TABLE IF NOT EXISTS public.portfolio_holdings (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  stock_symbol TEXT NOT NULL,
  quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
  buy_price NUMERIC(18,4) NOT NULL DEFAULT 0,
  buy_date DATE NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_user_id ON public.portfolio_holdings (user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON public.portfolio_holdings (stock_symbol);

ALTER TABLE public.portfolio_holdings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Users can view their own holdings"
      ON public.portfolio_holdings FOR SELECT
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Users can insert their own holdings"
      ON public.portfolio_holdings FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Users can update their own holdings"
      ON public.portfolio_holdings FOR UPDATE
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Users can delete their own holdings"
      ON public.portfolio_holdings FOR DELETE
      USING (auth.uid() = user_id);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_holdings TO authenticated;
