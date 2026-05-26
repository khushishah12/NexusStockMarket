-- Migration: Drop watchlist_items table (ensures deletion)
DROP TABLE IF EXISTS public.watchlist_items CASCADE;
