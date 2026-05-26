-- Migration: Drop Upstox-related tables
DROP TABLE IF EXISTS public.stock_metadata CASCADE;
DROP TABLE IF EXISTS public.watchlist CASCADE;
DROP TABLE IF EXISTS public.stocks CASCADE;
