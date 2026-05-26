-- Migration: Drop Upstox related tables and column
DROP TABLE IF EXISTS public.upstox_prices CASCADE;
DROP TABLE IF EXISTS public.upstox_instruments CASCADE;
ALTER TABLE IF EXISTS public.stocks DROP COLUMN IF EXISTS upstox_key;
