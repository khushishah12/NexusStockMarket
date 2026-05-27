CREATE TABLE IF NOT EXISTS public.pattern_detections (
  id BIGSERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL,
  pattern_name TEXT NOT NULL,
  start_index INT,
  end_index INT,
  confidence INT,
  highlight_polygon JSONB,
  anchor_points JSONB,
  explanation TEXT,
  target_price DOUBLE PRECISION,
  risk_level TEXT,
  stoploss DOUBLE PRECISION,
  suitable_for_intraday BOOLEAN DEFAULT false,
  suitable_for_swing BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Upgrade existing tables that were created by runSql without these columns
ALTER TABLE public.pattern_detections ADD COLUMN IF NOT EXISTS target_price DOUBLE PRECISION;
ALTER TABLE public.pattern_detections ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE public.pattern_detections ADD COLUMN IF NOT EXISTS stoploss DOUBLE PRECISION;
ALTER TABLE public.pattern_detections ADD COLUMN IF NOT EXISTS suitable_for_intraday BOOLEAN DEFAULT false;
ALTER TABLE public.pattern_detections ADD COLUMN IF NOT EXISTS suitable_for_swing BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_pattern_detections_symbol ON public.pattern_detections (symbol);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_created_at ON public.pattern_detections (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pattern_detections_lookup ON public.pattern_detections (symbol, timeframe, pattern_name);

ALTER TABLE public.pattern_detections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  BEGIN
    CREATE POLICY "Pattern detections are publicly readable"
      ON public.pattern_detections FOR SELECT
      USING (true);
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    CREATE POLICY "Service role can insert pattern detections"
      ON public.pattern_detections FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END
$$;

GRANT SELECT ON public.pattern_detections TO anon, authenticated;
GRANT INSERT ON public.pattern_detections TO service_role;
