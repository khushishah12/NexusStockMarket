CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_stocks_symbol_trgm ON public.stocks USING gin (symbol gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stocks_company_name_trgm ON public.stocks USING gin (company_name gin_trgm_ops);
