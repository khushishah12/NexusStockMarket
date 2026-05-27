CREATE TABLE IF NOT EXISTS public.stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  company_name text,
  exchange text,
  sector text,
  industry text,
  created_at timestamp with time zone DEFAULT now()
);
