// supabase/migrations/20260711000000_create_stocks_table.sql
CREATE TABLE IF NOT EXISTS public.stocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol text NOT NULL,
  company_name text,
  exchange text,
  sector text,
  created_at timestamp with time zone DEFAULT now()
);
