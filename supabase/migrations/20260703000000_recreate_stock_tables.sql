-- Recreate stock related tables after Upstox removal
CREATE TABLE public.stocks (
  id serial PRIMARY KEY,
  symbol text NOT NULL,
  company_name text,
  exchange text,
  sector text,
  market_cap bigint,
  created_at timestamp DEFAULT now()
);

CREATE TABLE public.watchlist (
  user_id uuid REFERENCES auth.users(id),
  stock_id integer REFERENCES public.stocks(id),
  added_at timestamp DEFAULT now()
);

CREATE TABLE public.stock_metadata (
  stock_id integer REFERENCES public.stocks(id),
  key text,
  value text
);

-- Indexes for performance
CREATE INDEX ON public.stocks (symbol);
